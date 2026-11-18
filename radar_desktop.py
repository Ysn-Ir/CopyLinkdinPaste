#!/usr/bin/env python3
"""
RADAR Desktop Companion
- System Tray HUD with stark monochrome radar icon
- Global Hotkey [Alt + S]: Transparent Screen Snip & Instant Local OCR
- Global Hotkey [Alt + R]: Raycast-style Quick HUD & Search Console
- Intelligent Background Clipboard Listener (filters junk, auto-ingests, prevents duplicates)
- Real-time Notifications & Zero-Poll Sync with RADAR Web Engine
"""

import sys
import os
import time
import json
import base64
import io
import hashlib
import threading
import logging
import urllib.request
import urllib.error
import webbrowser
import tkinter as tk
from tkinter import ttk, messagebox
from PIL import Image, ImageDraw, ImageGrab
import pyperclip
from pynput import keyboard
import pystray

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("radar.desktop")

RADAR_BACKEND_URL = os.getenv("RADAR_BACKEND_URL", "http://127.0.0.1:8003")
AUTO_CLIPBOARD_SYNC = True


def show_toast(title: str, message: str):
    """Displays a native Windows toast notification or fallback popup."""
    try:
        from plyer import notification
        notification.notify(
            title=title,
            message=message[:200],
            app_name="RADAR",
            timeout=4
        )
    except Exception:
        try:
            # Fallback using PowerShell
            ps_script = f"""
            [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
            $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
            $textNodes = $template.GetElementsByTagName("text")
            $textNodes.Item(0).AppendChild($template.CreateTextNode("{title}")) > $null
            $textNodes.Item(1).AppendChild($template.CreateTextNode("{message[:180]}")) > $null
            $toast = [Windows.UI.Notifications.ToastNotification]::new($template)
            [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("RADAR").Show($toast)
            """
            import subprocess
            subprocess.Popen(["powershell", "-NoProfile", "-Command", ps_script], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception as e:
            logger.warning(f"Toast notification failed: {e}")


def create_tray_icon_image() -> Image.Image:
    """Generates the stark monochrome RADAR tray icon with red tactical beacon."""
    size = 64
    img = Image.new("RGBA", (size, size), color=(0, 0, 0, 255))
    draw = ImageDraw.Draw(img)
    # Scope rings
    draw.ellipse([8, 8, 56, 56], outline=(255, 255, 255, 255), width=2)
    draw.ellipse([20, 20, 44, 44], outline=(120, 120, 120, 255), width=1)
    # Crosshairs
    draw.line([32, 4, 32, 60], fill=(90, 90, 90, 255), width=1)
    draw.line([4, 32, 60, 32], fill=(90, 90, 90, 255), width=1)
    # Red tactical beacon
    draw.ellipse([40, 20, 46, 26], fill=(255, 59, 48, 255))
    return img


# ==============================================================================
# SNIPPING TOOL (Alt + S)
# ==============================================================================

class SnippingTool:
    """Full-screen transparent snip overlay for drag-and-drop OCR ingestion."""

    def __init__(self, on_snip_completed):
        self.on_snip_completed = on_snip_completed
        self.root = None
        self.canvas = None
        self.start_x = None
        self.start_y = None
        self.rect = None

    def start(self):
        threading.Thread(target=self._run_snip, daemon=True).start()

    def _run_snip(self):
        try:
            self.root = tk.Tk()
            self.root.attributes("-alpha", 0.28)
            self.root.attributes("-fullscreen", True)
            self.root.attributes("-topmost", True)
            self.root.config(cursor="cross")

            self.canvas = tk.Canvas(self.root, cursor="cross", bg="#000000", highlightthickness=0)
            self.canvas.pack(fill="both", expand=True)

            self.canvas.bind("<ButtonPress-1>", self._on_press)
            self.canvas.bind("<B1-Motion>", self._on_drag)
            self.canvas.bind("<ButtonRelease-1>", self._on_release)
            self.canvas.bind("<Escape>", lambda e: self.root.destroy())

            self.root.mainloop()
        except Exception as e:
            logger.error(f"Snip tool error: {e}")

    def _on_press(self, event):
        self.start_x = event.x
        self.start_y = event.y
        self.rect = self.canvas.create_rectangle(
            self.start_x, self.start_y, self.start_x, self.start_y,
            outline="#FF3B30", width=2, fill="#FF3B30", stipple="gray25"
        )

    def _on_drag(self, event):
        cur_x, cur_y = event.x, event.y
        self.canvas.coords(self.rect, self.start_x, self.start_y, cur_x, cur_y)

    def _on_release(self, event):
        end_x, end_y = event.x, event.y
        x1 = min(self.start_x, end_x)
        y1 = min(self.start_y, end_y)
        x2 = max(self.start_x, end_x)
        y2 = max(self.start_y, end_y)

        self.root.destroy()

        if (x2 - x1) > 15 and (y2 - y1) > 15:
            # Grab screenshot of the selected bbox
            try:
                time.sleep(0.08)  # Let overlay disappear
                cropped = ImageGrab.grab(bbox=(x1, y1, x2, y2))
                self.on_snip_completed(cropped)
            except Exception as e:
                logger.error(f"ImageGrab error: {e}")


def process_snip_image(pil_img: Image.Image):
    """Processes snipped image with local winocr and sends to RADAR backend."""
    threading.Thread(target=_async_process_snip, args=(pil_img,), daemon=True).start()


def _async_process_snip(pil_img: Image.Image):
    buffered = io.BytesIO()
    pil_img.save(buffered, format="PNG")
    img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

    show_toast("RADAR Snip Captured", "Analyzing screenshot via OCR...")

    # Post to RADAR OCR ingestion endpoint
    payload = json.dumps({
        "imageBase64": img_b64,
        "sourceUrl": "desktop_screen_snip",
        "sourceDevice": "desktop"
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{RADAR_BACKEND_URL}/api/clips/ocr-ingest",
        data=payload,
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("success"):
                clip = data.get("clip", {})
                content_type = clip.get("contentType", "note").replace("_", " ").upper()
                title = clip.get("title", "New Capture")
                show_toast(f"RADAR: {content_type}", f"{title}\nSaved to Vault & Synced")
            else:
                show_toast("RADAR OCR Notice", data.get("message") or "Text could not be extracted.")
    except Exception as e:
        logger.error(f"OCR ingest network error: {e}")
        show_toast("RADAR Offline", f"Could not connect to RADAR backend on {RADAR_BACKEND_URL}")


# ==============================================================================
# RADAR QUICK HUD (Alt + R)
# ==============================================================================

class RadarQuickHUD:
    """Raycast / Spotlight style dark HUD for quick vault inspection and search."""

    def __init__(self):
        self.window = None

    def show(self):
        threading.Thread(target=self._run_hud, daemon=True).start()

    def _run_hud(self):
        try:
            self.window = tk.Tk()
            self.window.title("RADAR • Quick Vault HUD")
            self.window.geometry("640x500")
            self.window.configure(bg="#0A0A0A")
            self.window.attributes("-topmost", True)
            self.window.resizable(False, False)

            # Center on screen
            self.window.update_idletasks()
            sw = self.window.winfo_screenwidth()
            sh = self.window.winfo_screenheight()
            x = (sw - 640) // 2
            y = (sh - 500) // 2
            self.window.geometry(f"640x500+{x}+{y}")

            # Top Header
            header_frame = tk.Frame(self.window, bg="#0A0A0A", pady=10, padx=16)
            header_frame.pack(fill="x")

            title_lbl = tk.Label(header_frame, text="RADAR", font=("Segoe UI", 16, "bold"), fg="#FFFFFF", bg="#0A0A0A")
            title_lbl.pack(side="left")

            beacon_lbl = tk.Label(header_frame, text="● ONLINE", font=("Segoe UI", 9, "bold"), fg="#FF3B30", bg="#0A0A0A", padx=8)
            beacon_lbl.pack(side="left")

            sub_lbl = tk.Label(header_frame, text="Alt+S: Snip | Esc: Close", font=("Segoe UI", 9), fg="#71717A", bg="#0A0A0A")
            sub_lbl.pack(side="right")

            # Search Entry
            search_frame = tk.Frame(self.window, bg="#18181B", padx=8, pady=6)
            search_frame.pack(fill="x", padx=16, pady=4)

            search_var = tk.StringVar()
            search_entry = tk.Entry(
                search_frame, textvariable=search_var, font=("Segoe UI", 11),
                bg="#18181B", fg="#FFFFFF", insertbackground="#FFFFFF", relief="flat"
            )
            search_entry.pack(fill="x")
            search_entry.focus_set()

            # Clips Listbox
            list_frame = tk.Frame(self.window, bg="#0A0A0A", padx=16, pady=8)
            list_frame.pack(fill="both", expand=True)

            listbox = tk.Listbox(
                list_frame, font=("Segoe UI", 10), bg="#121212", fg="#E4E4E7",
                selectbackground="#27272A", selectforeground="#FFFFFF",
                relief="flat", highlightthickness=1, highlightbackground="#27272A"
            )
            listbox.pack(fill="both", expand=True, side="left")

            scrollbar = tk.Scrollbar(list_frame, orient="vertical", command=listbox.yview, bg="#121212")
            scrollbar.pack(side="right", fill="y")
            listbox.config(yscrollcommand=scrollbar.set)

            # Load recent clips from backend
            clips_data = []

            def fetch_clips(query=""):
                nonlocal clips_data
                try:
                    url = f"{RADAR_BACKEND_URL}/api/clips"
                    req = urllib.request.Request(url, headers={"User-Agent": "RADAR-Desktop"})
                    with urllib.request.urlopen(req, timeout=5) as r:
                        data = json.loads(r.read().decode("utf-8"))
                        clips_data = data if isinstance(data, list) else data.get("clips", [])
                        refresh_list(query)
                except Exception as e:
                    listbox.delete(0, tk.END)
                    listbox.insert(tk.END, f"Could not connect to {RADAR_BACKEND_URL}")

            def refresh_list(query=""):
                listbox.delete(0, tk.END)
                q = query.lower()
                for c in clips_data:
                    title = c.get("title", "Item")
                    ctype = c.get("contentType", "note").replace("_", " ").upper()
                    domain = c.get("sourceDomain", "")
                    if not q or q in title.lower() or q in ctype.lower() or q in domain.lower():
                        listbox.insert(tk.END, f"[{ctype}]  {title}  ·  {domain}")

            search_var.trace("w", lambda *args: refresh_list(search_var.get()))
            threading.Thread(target=fetch_clips, daemon=True).start()

            # Action Buttons Bottom
            btn_frame = tk.Frame(self.window, bg="#0A0A0A", pady=10, padx=16)
            btn_frame.pack(fill="x")

            def open_web():
                webbrowser.open(RADAR_BACKEND_URL)
                self.window.destroy()

            def trigger_snip():
                self.window.destroy()
                SnippingTool(process_snip_image).start()

            tk.Button(
                btn_frame, text="Open Web Console", command=open_web,
                bg="#27272A", fg="#FFFFFF", relief="flat", font=("Segoe UI", 9, "bold"), padx=12, pady=4
            ).pack(side="left", padx=4)

            tk.Button(
                btn_frame, text="Snip Screen (Alt+S)", command=trigger_snip,
                bg="#FF3B30", fg="#FFFFFF", relief="flat", font=("Segoe UI", 9, "bold"), padx=12, pady=4
            ).pack(side="left", padx=4)

            self.window.bind("<Escape>", lambda e: self.window.destroy())
            self.window.mainloop()
        except Exception as e:
            logger.error(f"Quick HUD error: {e}")


# ==============================================================================
# LOGICAL CLIPBOARD DAEMON (No Dumb Spam)
# ==============================================================================

class LogicalClipboardDaemon:
    """Monitors clipboard in background with strict junk filtering & deduplication."""

    def __init__(self):
        self.seen_hashes = set()
        self.last_text = ""
        self.is_running = True

    def start(self):
        threading.Thread(target=self._loop, daemon=True).start()

    def _loop(self):
        logger.info("RADAR Clipboard Daemon active.")
        while self.is_running:
            try:
                time.sleep(0.75)
                if not AUTO_CLIPBOARD_SYNC:
                    continue

                text = pyperclip.paste()
                if not text:
                    continue

                clean = text.strip()
                if len(clean) < 18:
                    # Ignore trivial clicks, numbers, single words
                    continue

                # Hash check for duplicate prevention
                h = hashlib.sha256(clean.encode("utf-8")).hexdigest()
                if h in self.seen_hashes or clean == self.last_text:
                    continue

                self.seen_hashes.add(h)
                self.last_text = clean
                if len(self.seen_hashes) > 300:
                    self.seen_hashes.pop()

                # Ingest to RADAR backend
                self._ingest_clip(clean)
            except Exception as e:
                time.sleep(1)

    def _ingest_clip(self, content: str):
        payload = json.dumps({
            "content": content,
            "sourceUrl": "",
            "sourceDomain": "clipboard_daemon",
            "sourceDevice": "desktop",
            "copiedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }).encode("utf-8")

        req = urllib.request.Request(
            f"{RADAR_BACKEND_URL}/api/clips/ingest",
            data=payload,
            headers={"Content-Type": "application/json"}
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if data.get("success") and not data.get("isDuplicate"):
                    clip = data.get("clip", {})
                    ctype = clip.get("contentType", "note").replace("_", " ").upper()
                    title = clip.get("title", "New Item")
                    show_toast(f"RADAR: {ctype}", title)
        except Exception as e:
            logger.debug(f"Clipboard ingest notice: {e}")


# ==============================================================================
# MAIN APPLICATION CONTROLLER
# ==============================================================================

class RadarDesktopApp:
    def __init__(self):
        self.clipboard_daemon = LogicalClipboardDaemon()
        self.hud = RadarQuickHUD()
        self.snip_tool = SnippingTool(process_snip_image)
        self.tray_icon = None

    def on_alt_s(self):
        logger.info("Global Hotkey [Alt + S] triggered: Screen Snip")
        self.snip_tool.start()

    def on_alt_r(self):
        logger.info("Global Hotkey [Alt + R] triggered: Quick HUD")
        self.hud.show()

    def toggle_clipboard_sync(self, icon, item):
        global AUTO_CLIPBOARD_SYNC
        AUTO_CLIPBOARD_SYNC = not AUTO_CLIPBOARD_SYNC
        state_str = "ENABLED" if AUTO_CLIPBOARD_SYNC else "DISABLED"
        show_toast("RADAR Clipboard Sync", f"Clipboard auto-triage is now {state_str}")

    def run_job_hunter(self, icon, item):
        webbrowser.open(f"{RADAR_BACKEND_URL}/#scraper")

    def open_web_console(self, icon, item):
        webbrowser.open(RADAR_BACKEND_URL)

    def exit_app(self, icon, item):
        logger.info("Shutting down RADAR Desktop...")
        self.clipboard_daemon.is_running = False
        icon.stop()
        os._exit(0)

    def start_hotkeys(self):
        def for_canonical(f):
            return lambda k: f(l.canonical(k))

        hotkey_map = {
            "<alt>+s": self.on_alt_s,
            "<alt>+r": self.on_alt_r,
        }

        try:
            hotkeys = keyboard.GlobalHotKeys(hotkey_map)
            hotkeys.start()
            logger.info("Global hotkeys registered: [Alt + S] Snip, [Alt + R] Quick HUD")
        except Exception as e:
            logger.error(f"Failed to register global hotkeys: {e}")

    def run(self):
        # Start clipboard listener
        self.clipboard_daemon.start()

        # Start global hotkeys
        self.start_hotkeys()

        # Create system tray icon
        img = create_tray_icon_image()
        menu = pystray.Menu(
            pystray.MenuItem("RADAR Active (Running)", lambda: None, enabled=False),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Snip Screen (Alt + S)", lambda icon, item: self.on_alt_s()),
            pystray.MenuItem("Quick HUD (Alt + R)", lambda icon, item: self.on_alt_r()),
            pystray.MenuItem("Open Web Console", self.open_web_console),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Run Job Hunter", self.run_job_hunter),
            pystray.MenuItem(
                lambda text: f"Auto-Sync Clipboard: {'ON' if AUTO_CLIPBOARD_SYNC else 'OFF'}",
                self.toggle_clipboard_sync
            ),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Exit RADAR", self.exit_app)
        )

        self.tray_icon = pystray.Icon("RADAR", img, "RADAR (Alt+S Snip | Alt+R HUD)", menu)
        show_toast("RADAR Active", "Running in System Tray. Press Alt+S to snip or Alt+R for HUD.")
        logger.info("RADAR System Tray starting...")
        self.tray_icon.run()


if __name__ == "__main__":
    app = RadarDesktopApp()
    app.run()
