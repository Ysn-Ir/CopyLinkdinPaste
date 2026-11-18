#!/usr/bin/env python3
"""
RADAR Desktop Application & Intelligence Studio
Modern Native Desktop Companion powered by Edge Chromium WebView2 & Background Agents.
- Unified with the Web Command Center with hardware-accelerated charts, graphs, & real-time sync
- System Tray HUD with stark monochrome radar icon
- Global Hotkey [Alt + S]: Transparent Screen Snip & Instant Local/Vision OCR
- Global Hotkey [Alt + R]: Bring Studio to Front / Focus HUD
- Global Hotkey [Alt + D]: Full Studio Workspace
- Intelligent Background Clipboard Listener (filters junk, auto-ingests, prevents duplicates)
- Live ATS LaTeX/Typst Resume Studio with Vector PDF preview and template injection
- Auto-spawns and monitors local FastAPI backend silently
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
import subprocess
import tkinter as tk
from PIL import Image, ImageDraw, ImageGrab
import pyperclip
from pynput import keyboard
import pystray
import webview

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("radar.desktop")

RADAR_BACKEND_URL = os.getenv("RADAR_BACKEND_URL", "http://127.0.0.1:8003")
AUTO_CLIPBOARD_SYNC = True
BACKEND_PROCESS = None
MAIN_WINDOW = None
TRAY_ICON = None


def is_backend_healthy(url=RADAR_BACKEND_URL):
    """Checks if the local RADAR FastAPI backend is responsive."""
    try:
        req = urllib.request.Request(f"{url}/api/health", headers={"User-Agent": "RADAR-Desktop"})
        with urllib.request.urlopen(req, timeout=1.2) as resp:
            return resp.status == 200
    except Exception:
        return False


def ensure_backend_running():
    """Silently spawns the local RADAR FastAPI server if not already running."""
    global BACKEND_PROCESS
    if is_backend_healthy():
        logger.info("RADAR backend is active and healthy.")
        return True

    logger.info("Starting local RADAR backend process...")
    cmd = [sys.executable, "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8003"]
    creationflags = 0
    if sys.platform == "win32":
        creationflags = subprocess.CREATE_NO_WINDOW

    try:
        BACKEND_PROCESS = subprocess.Popen(
            cmd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=creationflags
        )
        for _ in range(16):
            time.sleep(0.5)
            if is_backend_healthy():
                logger.info("RADAR backend started successfully.")
                return True
    except Exception as e:
        logger.error(f"Failed starting backend process: {e}")
    return False


def show_toast(title: str, message: str):
    """Displays a native Windows toast notification."""
    try:
        ps_script = f"""
        [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
        $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
        $textNodes = $template.GetElementsByTagName("text")
        $textNodes.Item(0).AppendChild($template.CreateTextNode("{title}")) > $null
        $textNodes.Item(1).AppendChild($template.CreateTextNode("{message[:180]}")) > $null
        $toast = [Windows.UI.Notifications.ToastNotification]::new($template)
        [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("RADAR").Show($toast)
        """
        subprocess.Popen(["powershell", "-NoProfile", "-Command", ps_script], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        logger.warning(f"Toast notification notice: {e}")


def create_tray_icon_image() -> Image.Image:
    """Generates the stark monochrome RADAR tray icon with red tactical beacon."""
    size = 64
    img = Image.new("RGBA", (size, size), color=(0, 0, 0, 255))
    draw = ImageDraw.Draw(img)
    draw.ellipse([8, 8, 56, 56], outline=(255, 255, 255, 255), width=2)
    draw.ellipse([20, 20, 44, 44], outline=(120, 120, 120, 255), width=1)
    draw.line([32, 4, 32, 60], fill=(90, 90, 90, 255), width=1)
    draw.line([4, 32, 60, 32], fill=(90, 90, 90, 255), width=1)
    draw.ellipse([40, 20, 46, 26], fill=(255, 59, 48, 255))
    return img


# ==============================================================================
# TRANSPARENT SCREEN SNIP & OCR (Alt + S)
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
            try:
                time.sleep(0.08)
                cropped = ImageGrab.grab(bbox=(x1, y1, x2, y2))
                self.on_snip_completed(cropped)
            except Exception as e:
                logger.error(f"ImageGrab error: {e}")


def process_snip_image(pil_img: Image.Image):
    """Processes snipped image with local OCR and sends to RADAR backend."""
    threading.Thread(target=_async_process_snip, args=(pil_img,), daemon=True).start()


def _async_process_snip(pil_img: Image.Image):
    buffered = io.BytesIO()
    pil_img.save(buffered, format="PNG")
    img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

    show_toast("RADAR Snip Captured", "Analyzing screenshot via OCR...")

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
                show_toast(
                    f"Signal Ingested [{content_type}]",
                    f"{clip.get('title', 'Screen Snip')} saved to Vault."
                )
                # Refresh client view if window exists
                if MAIN_WINDOW:
                    try:
                        MAIN_WINDOW.evaluate_js("window.dispatchEvent(new CustomEvent('radar-sync-event'));")
                    except Exception:
                        pass
    except Exception as e:
        logger.error(f"Failed to post snip OCR: {e}")
        show_toast("Snip Failed", "OCR processing failed or server timeout.")


# ==============================================================================
# BACKGROUND INTELLIGENT CLIPBOARD LISTENER
# ==============================================================================

class ClipboardListener(threading.Thread):
    def __init__(self, backend_url=RADAR_BACKEND_URL):
        super().__init__(daemon=True)
        self.backend_url = backend_url
        self.last_hash = ""
        self.running = True

    def run(self):
        logger.info("Clipboard intelligence listener active.")
        while self.running:
            try:
                if AUTO_CLIPBOARD_SYNC:
                    content = pyperclip.paste()
                    if content and len(content.strip()) > 8:
                        c_hash = hashlib.md5(content.strip().encode("utf-8")).hexdigest()
                        if c_hash != self.last_hash:
                            self.last_hash = c_hash
                            if not self._is_ignored_content(content):
                                self._ingest_clip(content.strip())
            except Exception as e:
                logger.debug(f"Clipboard read notice: {e}")
            time.sleep(1.5)

    def _is_ignored_content(self, text: str) -> bool:
        """Filters out non-intel content like pure passwords, base64 blobs, or single numbers."""
        stripped = text.strip()
        if len(stripped) < 8 or len(stripped) > 50000:
            return True
        if stripped.isdigit():
            return True
        if stripped.startswith("-----BEGIN") and "PRIVATE KEY" in stripped:
            return True
        if len(stripped) > 40 and " " not in stripped and not stripped.startswith("http"):
            return True
        return False

    def _ingest_clip(self, raw_content: str):
        payload = json.dumps({
            "content": raw_content,
            "sourceDevice": "desktop_companion",
            "sourceUrl": raw_content if raw_content.startswith("http") else ""
        }).encode("utf-8")

        req = urllib.request.Request(
            f"{self.backend_url}/api/clips/ingest",
            data=payload,
            headers={"Content-Type": "application/json"}
        )

        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if data.get("success"):
                    clip = data.get("clip", {})
                    is_job = data.get("isJobOffer", False)
                    show_toast(
                        "Opportunity Captured!" if is_job else "Signal Ingested",
                        f"\"{clip.get('title', 'New Clip')[:40]}\" saved to Vault."
                    )
                    if MAIN_WINDOW:
                        try:
                            MAIN_WINDOW.evaluate_js("window.dispatchEvent(new CustomEvent('radar-sync-event'));")
                        except Exception:
                            pass
        except Exception as e:
            logger.debug(f"Ingest notification notice: {e}")


# ==============================================================================
# GLOBAL HOTKEYS & DESKTOP SYSTEM TRAY
# ==============================================================================

def trigger_snip_tool():
    """Triggered by Alt + S"""
    snipper = SnippingTool(on_snip_completed=process_snip_image)
    snipper.start()


def focus_main_window():
    """Triggered by Alt + R / Alt + D"""
    if MAIN_WINDOW:
        try:
            MAIN_WINDOW.show()
            MAIN_WINDOW.restore()
        except Exception:
            pass


def start_global_hotkeys():
    """Registers Alt+S (Snip OCR) and Alt+R (Bring to Front) global hotkeys."""
    def on_activate_snip():
        logger.info("Hotkey [Alt + S] triggered -> Screen Snip OCR")
        trigger_snip_tool()

    def on_activate_hud():
        logger.info("Hotkey [Alt + R] triggered -> Bring Studio to Front")
        focus_main_window()

    try:
        hotkeys = keyboard.GlobalHotKeys({
            '<alt>+s': on_activate_snip,
            '<alt>+r': on_activate_hud,
            '<alt>+d': on_activate_hud,
        })
        threading.Thread(target=hotkeys.run, daemon=True).start()
        logger.info("Global hotkeys active: [Alt + S] Snip OCR, [Alt + R] Bring to Front")
    except Exception as e:
        logger.warning(f"Could not register global hotkeys: {e}")


def toggle_clipboard_sync(icon, item):
    global AUTO_CLIPBOARD_SYNC
    AUTO_CLIPBOARD_SYNC = not AUTO_CLIPBOARD_SYNC
    status = "Active" if AUTO_CLIPBOARD_SYNC else "Paused"
    show_toast("Clipboard Sync", f"Clipboard listener is now {status}.")


def launch_in_browser(icon, item):
    webbrowser.open(RADAR_BACKEND_URL)


def exit_radar_app(icon, item):
    global TRAY_ICON, MAIN_WINDOW
    if TRAY_ICON:
        TRAY_ICON.stop()
    if MAIN_WINDOW:
        try:
            MAIN_WINDOW.destroy()
        except Exception:
            pass
    if BACKEND_PROCESS:
        try:
            BACKEND_PROCESS.terminate()
        except Exception:
            pass
    sys.exit(0)


def start_system_tray():
    global TRAY_ICON
    img = create_tray_icon_image()
    menu = pystray.Menu(
        pystray.MenuItem("RADAR Command Studio", lambda icon, item: focus_main_window(), default=True),
        pystray.MenuItem("Screen Snip OCR (Alt + S)", lambda icon, item: trigger_snip_tool()),
        pystray.MenuItem("Toggle Clipboard Sync", toggle_clipboard_sync),
        pystray.MenuItem("Open in External Browser", launch_in_browser),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Quit RADAR", exit_radar_app)
    )
    TRAY_ICON = pystray.Icon("RADAR", img, "RADAR Signal Intelligence", menu)
    threading.Thread(target=TRAY_ICON.run, daemon=True).start()


# ==============================================================================
# MAIN ENTRY POINT: NATIVE WEBVIEW APPLICATION
# ==============================================================================

def main():
    global MAIN_WINDOW

    print("==================================================")
    print("  RADAR • Command Studio (Native Desktop Runtime)")
    print("  Stark Monochrome HUD • Real-Time Vector Charts")
    print("==================================================")

    # 1. Ensure backend is active
    if not ensure_backend_running():
        print("[!] Local backend failed to start. Exiting.")
        sys.exit(1)

    # 2. Start background clipboard intelligence watcher
    clip_listener = ClipboardListener(backend_url=RADAR_BACKEND_URL)
    clip_listener.start()

    # 3. Start global hotkeys [Alt+S] and [Alt+R]
    start_global_hotkeys()

    # 4. Start system tray icon
    start_system_tray()

    show_toast(
        "RADAR Active",
        "Command Studio initialized. Press [Alt + S] anytime to snip & OCR."
    )

    # 5. Launch native Edge Chromium window rendering the modern HUD
    MAIN_WINDOW = webview.create_window(
        title="RADAR • Signal Intelligence & Career Studio",
        url=RADAR_BACKEND_URL,
        width=1480,
        height=940,
        min_size=(1080, 720),
        background_color="#000000",
        text_select=True,
    )

    webview.start(debug=False)


if __name__ == "__main__":
    main()
