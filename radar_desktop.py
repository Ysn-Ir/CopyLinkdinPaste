#!/usr/bin/env python3
"""
RADAR Desktop Application & Intelligence Studio
- Full Standalone Native Desktop Application (No browser required)
- System Tray HUD with stark monochrome radar icon
- Global Hotkey [Alt + S]: Transparent Screen Snip & Instant Local OCR
- Global Hotkey [Alt + R]: Raycast-style Quick HUD & Search Console
- Global Hotkey [Alt + D]: Full RADAR Desktop Command Studio
- Intelligent Background Clipboard Listener (filters junk, auto-ingests, prevents duplicates)
- Autonomous Job Scraper (LinkedIn, Indeed, Glassdoor) with real-time cancel
- Live ATS LaTeX Resume Studio with 1-click tailoring & .tex export
- Recruiter CRM with 1-click outreach & CSV export
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
from tkinter import ttk, messagebox, filedialog
from PIL import Image, ImageDraw, ImageGrab, ImageTk
import pyperclip
from pynput import keyboard
import pystray

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("radar.desktop")

RADAR_BACKEND_URL = os.getenv("RADAR_BACKEND_URL", "http://127.0.0.1:8003")
AUTO_CLIPBOARD_SYNC = True
BACKEND_PROCESS = None


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
        for _ in range(14):
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
        from plyer import notification
        notification.notify(
            title=title,
            message=message[:200],
            app_name="RADAR",
            timeout=4
        )
    except Exception:
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
            logger.warning(f"Toast notification failed: {e}")


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
            try:
                time.sleep(0.08)
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

            sub_lbl = tk.Label(header_frame, text="Alt+S: Snip | Alt+D: Studio | Esc: Close", font=("Segoe UI", 9), fg="#71717A", bg="#0A0A0A")
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
                except Exception:
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
# RADAR DESKTOP COMMAND STUDIO (Alt + D) - STANDALONE WORKSPACE WINDOW
# ==============================================================================

class RadarDesktopStudio:
    """Full-featured standalone native desktop application for RADAR."""

    def __init__(self, app_controller):
        self.app = app_controller
        self.window = None
        self.notebook = None
        self.clips = []
        self.filtered_clips = []
        self.current_clip = None
        self.hunt_running = False

    def show(self):
        if self.window and tk.Toplevel.winfo_exists(self.window):
            self.window.deiconify()
            self.window.lift()
            self.window.focus_force()
            self.refresh_clips()
            return

        threading.Thread(target=self._run_studio, daemon=True).start()

    def _run_studio(self):
        try:
            self.window = tk.Tk()
            self.window.title("RADAR • Desktop Command Studio")
            self.window.geometry("1120x720")
            self.window.minsize(960, 600)
            self.window.configure(bg="#09090b")

            # Center on screen
            self.window.update_idletasks()
            sw = self.window.winfo_screenwidth()
            sh = self.window.winfo_screenheight()
            x = max(20, (sw - 1120) // 2)
            y = max(20, (sh - 720) // 2)
            self.window.geometry(f"1120x720+{x}+{y}")

            # Top Header Bar
            header = tk.Frame(self.window, bg="#000000", padx=20, pady=12, highlightthickness=1, highlightbackground="#27272A")
            header.pack(fill="x")

            title_box = tk.Frame(header, bg="#000000")
            title_box.pack(side="left")

            tk.Label(title_box, text="RADAR", font=("Segoe UI", 16, "bold"), fg="#FFFFFF", bg="#000000").pack(side="left")
            tk.Label(title_box, text="COMMAND STUDIO", font=("Segoe UI", 11, "bold"), fg="#A1A1AA", bg="#000000", padx=8).pack(side="left")
            self.beacon_lbl = tk.Label(title_box, text="● ENGINE ONLINE", font=("Segoe UI", 9, "bold"), fg="#FF3B30", bg="#000000", padx=6)
            self.beacon_lbl.pack(side="left")

            # Top Right Action Buttons
            top_actions = tk.Frame(header, bg="#000000")
            top_actions.pack(side="right")

            tk.Button(
                top_actions, text="📷 Snip Screen (Alt+S)", command=lambda: self.app.on_alt_s(),
                bg="#FF3B30", fg="#FFFFFF", relief="flat", font=("Segoe UI", 9, "bold"), padx=12, pady=5, cursor="hand2"
            ).pack(side="left", padx=4)

            tk.Button(
                top_actions, text="🔍 HUD (Alt+R)", command=lambda: self.app.on_alt_r(),
                bg="#18181B", fg="#FFFFFF", relief="flat", font=("Segoe UI", 9, "bold"), padx=10, pady=5, cursor="hand2"
            ).pack(side="left", padx=4)

            tk.Button(
                top_actions, text="🌐 Web View", command=lambda: webbrowser.open(RADAR_BACKEND_URL),
                bg="#18181B", fg="#A1A1AA", relief="flat", font=("Segoe UI", 9), padx=10, pady=5, cursor="hand2"
            ).pack(side="left", padx=4)

            # Styling Notebook Tabs
            style = ttk.Style()
            style.theme_use("clam")
            style.configure("TNotebook", background="#09090b", borderwidth=0)
            style.configure("TNotebook.Tab", background="#18181B", foreground="#A1A1AA", padding=[16, 8], font=("Segoe UI", 10, "bold"))
            style.map("TNotebook.Tab", background=[("selected", "#27272A")], foreground=[("selected", "#FFFFFF")])

            self.notebook = ttk.Notebook(self.window)
            self.notebook.pack(fill="both", expand=True, padx=16, pady=12)

            # 1. Signal Vault Tab
            vault_tab = tk.Frame(self.notebook, bg="#09090b")
            self.notebook.add(vault_tab, text="  📋 Signal Vault  ")
            self._build_vault_tab(vault_tab)

            # 2. Scraper Studio Tab
            scraper_tab = tk.Frame(self.notebook, bg="#09090b")
            self.notebook.add(scraper_tab, text="  🛰️ Job Scraper  ")
            self._build_scraper_tab(scraper_tab)

            # 3. LaTeX ATS Resume Tab
            latex_tab = tk.Frame(self.notebook, bg="#09090b")
            self.notebook.add(latex_tab, text="  📄 ATS LaTeX Studio  ")
            self._build_latex_tab(latex_tab)

            # 4. Recruiter CRM Tab
            crm_tab = tk.Frame(self.notebook, bg="#09090b")
            self.notebook.add(crm_tab, text="  👤 Recruiter CRM  ")
            self._build_crm_tab(crm_tab)

            # Protocol when user clicks 'X'
            self.window.protocol("WM_DELETE_WINDOW", self._on_close)
            self.refresh_clips()
            self.window.mainloop()
        except Exception as e:
            logger.error(f"Studio error: {e}")

    def _on_close(self):
        self.window.destroy()
        show_toast("RADAR Active", "Running in System Tray. Press Alt+D to reopen Studio, or Alt+S to snip.")

    # --------------------------------------------------------------------------
    # TAB 1: SIGNAL VAULT
    # --------------------------------------------------------------------------
    def _build_vault_tab(self, parent):
        # Filter bar
        filter_bar = tk.Frame(parent, bg="#09090b", pady=6)
        filter_bar.pack(fill="x")

        self.vault_filter_var = tk.StringVar(value="all")
        filters = [("All Signals", "all"), ("💼 Job Offers", "job_offer"), ("👤 Recruiter Leads", "contact_lead"), ("🎮 Media", "general_media"), ("💻 Notes", "general_note")]

        for label, val in filters:
            btn = tk.Radiobutton(
                filter_bar, text=label, variable=self.vault_filter_var, value=val,
                command=self._apply_vault_filters, indicatoron=0,
                bg="#18181B", fg="#A1A1AA", selectcolor="#27272A",
                activebackground="#27272A", activeforeground="#FFFFFF",
                font=("Segoe UI", 9, "bold"), padx=10, pady=4, relief="flat", cursor="hand2"
            )
            btn.pack(side="left", padx=3)

        self.search_var = tk.StringVar()
        self.search_var.trace("w", lambda *args: self._apply_vault_filters())
        search_entry = tk.Entry(filter_bar, textvariable=self.search_var, font=("Segoe UI", 10), bg="#18181B", fg="#FFFFFF", insertbackground="#FFFFFF", relief="flat", width=26)
        search_entry.pack(side="right", padx=4, ipady=3)
        tk.Label(filter_bar, text="Search:", bg="#09090b", fg="#71717A", font=("Segoe UI", 9)).pack(side="right")

        # Split Container (List left, Details right)
        paned = tk.PanedWindow(parent, orient="horizontal", bg="#09090b", sashrelief="flat", sashwidth=4)
        paned.pack(fill="both", expand=True, pady=8)

        # Left list
        left_frame = tk.Frame(paned, bg="#121212", highlightthickness=1, highlightbackground="#27272A")
        paned.add(left_frame, minsize=380)

        self.vault_listbox = tk.Listbox(
            left_frame, font=("Segoe UI", 10), bg="#121212", fg="#FFFFFF",
            selectbackground="#27272A", selectforeground="#FFFFFF",
            relief="flat", highlightthickness=0
        )
        self.vault_listbox.pack(fill="both", expand=True, side="left", padx=4, pady=4)
        v_scroll = tk.Scrollbar(left_frame, orient="vertical", command=self.vault_listbox.yview, bg="#18181B")
        v_scroll.pack(side="right", fill="y")
        self.vault_listbox.config(yscrollcommand=v_scroll.set)
        self.vault_listbox.bind("<<ListboxSelect>>", self._on_select_clip)

        # Right Inspector Card
        right_frame = tk.Frame(paned, bg="#0D0D0D", highlightthickness=1, highlightbackground="#27272A", padx=16, pady=12)
        paned.add(right_frame, minsize=460)

        self.inspector_title = tk.Label(right_frame, text="Select a signal to inspect", font=("Segoe UI", 13, "bold"), fg="#FFFFFF", bg="#0D0D0D", anchor="w", wraplength=440)
        self.inspector_title.pack(fill="x", pady=(0, 4))

        self.inspector_meta = tk.Label(right_frame, text="", font=("Segoe UI", 9), fg="#A1A1AA", bg="#0D0D0D", anchor="w")
        self.inspector_meta.pack(fill="x", pady=(0, 8))

        # Summary Text Box
        tk.Label(right_frame, text="AI INTELLIGENCE SUMMARY", font=("Segoe UI", 9, "bold"), fg="#71717A", bg="#0D0D0D", anchor="w").pack(fill="x", pady=(4, 2))
        self.inspector_summary = tk.Text(right_frame, font=("Segoe UI", 10), bg="#18181B", fg="#E4E4E7", wrap="word", relief="flat", height=6, padx=8, pady=6)
        self.inspector_summary.pack(fill="x", pady=(0, 8))

        # Raw Content Text Box
        tk.Label(right_frame, text="RAW CAPTURE CONTENT", font=("Segoe UI", 9, "bold"), fg="#71717A", bg="#0D0D0D", anchor="w").pack(fill="x", pady=(4, 2))
        self.inspector_raw = tk.Text(right_frame, font=("Consolas", 9), bg="#18181B", fg="#D4D4D8", wrap="word", relief="flat", height=8, padx=8, pady=6)
        self.inspector_raw.pack(fill="both", expand=True, pady=(0, 10))

        # Action Buttons
        self.action_box = tk.Frame(right_frame, bg="#0D0D0D")
        self.action_box.pack(fill="x")

        self.btn_tailor = tk.Button(
            self.action_box, text="⚡ Tailor ATS Resume (LaTeX)", command=self._jump_to_tailor,
            bg="#FF3B30", fg="#FFFFFF", relief="flat", font=("Segoe UI", 9, "bold"), padx=10, pady=5, cursor="hand2"
        )
        self.btn_tailor.pack(side="left", padx=3)

        self.btn_copy_summary = tk.Button(
            self.action_box, text="Copy Summary", command=lambda: pyperclip.copy(self.inspector_summary.get("1.0", tk.END).strip()),
            bg="#27272A", fg="#FFFFFF", relief="flat", font=("Segoe UI", 9), padx=10, pady=5, cursor="hand2"
        )
        self.btn_copy_summary.pack(side="left", padx=3)

        self.btn_delete_clip = tk.Button(
            self.action_box, text="Delete", command=self._delete_current_clip,
            bg="#18181B", fg="#FF3B30", relief="flat", font=("Segoe UI", 9), padx=10, pady=5, cursor="hand2"
        )
        self.btn_delete_clip.pack(side="right", padx=3)

    def refresh_clips(self):
        def _fetch():
            try:
                url = f"{RADAR_BACKEND_URL}/api/clips"
                req = urllib.request.Request(url, headers={"User-Agent": "RADAR-Desktop"})
                with urllib.request.urlopen(req, timeout=5) as r:
                    data = json.loads(r.read().decode("utf-8"))
                    self.clips = data if isinstance(data, list) else data.get("clips", [])
                    if self.window and tk.Toplevel.winfo_exists(self.window):
                        self.window.after(0, self._apply_vault_filters)
            except Exception as e:
                logger.debug(f"Refresh clips error: {e}")

        threading.Thread(target=_fetch, daemon=True).start()

    def _apply_vault_filters(self):
        filt = self.vault_filter_var.get()
        query = self.search_var.get().lower().strip()

        self.filtered_clips = []
        self.vault_listbox.delete(0, tk.END)

        for c in self.clips:
            ctype = c.get("contentType", "note")
            if filt != "all" and ctype != filt:
                continue

            title = c.get("title", "")
            summary = c.get("summary", "")
            content = c.get("content", "")
            domain = c.get("sourceDomain", "")

            if query:
                if (query not in title.lower() and query not in summary.lower() and
                        query not in content.lower() and query not in domain.lower()):
                    continue

            self.filtered_clips.append(c)
            icon = "💼" if ctype == "job_offer" else ("👤" if ctype == "contact_lead" else ("🎮" if ctype == "general_media" else "💻"))
            self.vault_listbox.insert(tk.END, f"{icon}  [{ctype.upper()}]  {title}  ·  {domain}")

    def _on_select_clip(self, event):
        sel = self.vault_listbox.curselection()
        if not sel:
            return
        idx = sel[0]
        if idx >= len(self.filtered_clips):
            return

        c = self.filtered_clips[idx]
        self.current_clip = c

        self.inspector_title.config(text=c.get("title", "Untitled Signal"))
        ctype = c.get("contentType", "note").upper()
        domain = c.get("sourceDomain", "Local")
        created = c.get("createdAt", "")[:16].replace("T", " ")
        self.inspector_meta.config(text=f"Category: {ctype}  |  Source: {domain}  |  Captured: {created}")

        self.inspector_summary.delete("1.0", tk.END)
        self.inspector_summary.insert(tk.END, c.get("summary") or "No structured summary.")

        self.inspector_raw.delete("1.0", tk.END)
        self.inspector_raw.insert(tk.END, c.get("content") or "")

        # Enable/disable tailor button
        is_job = (c.get("contentType") == "job_offer" or "job" in c.get("title", "").lower())
        self.btn_tailor.config(state="normal" if is_job else "disabled")

    def _jump_to_tailor(self):
        if not self.current_clip:
            return
        title = self.current_clip.get("title", "")
        desc = self.current_clip.get("content", "") or self.current_clip.get("summary", "")
        self.latex_title_entry.delete(0, tk.END)
        self.latex_title_entry.insert(0, title)
        self.latex_desc_text.delete("1.0", tk.END)
        self.latex_desc_text.insert(tk.END, desc)
        self.notebook.select(2)  # Switch to LaTeX tab

    def _delete_current_clip(self):
        if not self.current_clip:
            return
        cid = self.current_clip.get("id")
        if not messagebox.askyesno("Confirm Delete", "Delete this captured signal permanently?"):
            return

        def _do_del():
            try:
                req = urllib.request.Request(f"{RADAR_BACKEND_URL}/api/clips/{cid}", method="DELETE")
                with urllib.request.urlopen(req, timeout=5):
                    self.refresh_clips()
            except Exception as e:
                logger.error(f"Delete clip error: {e}")

        threading.Thread(target=_do_del, daemon=True).start()

    # --------------------------------------------------------------------------
    # TAB 2: AUTONOMOUS JOB SCRAPER
    # --------------------------------------------------------------------------
    def _build_scraper_tab(self, parent):
        controls = tk.Frame(parent, bg="#121212", padx=16, pady=12, highlightthickness=1, highlightbackground="#27272A")
        controls.pack(fill="x", pady=6)

        # Top row: Role & Location
        row1 = tk.Frame(controls, bg="#121212")
        row1.pack(fill="x", pady=4)

        tk.Label(row1, text="Role Target:", font=("Segoe UI", 9, "bold"), fg="#A1A1AA", bg="#121212").pack(side="left")
        self.scraper_query = tk.Entry(row1, font=("Segoe UI", 10), bg="#18181B", fg="#FFFFFF", insertbackground="#FFFFFF", relief="flat", width=28)
        self.scraper_query.insert(0, "AI Engineer")
        self.scraper_query.pack(side="left", padx=8)

        tk.Label(row1, text="Location:", font=("Segoe UI", 9, "bold"), fg="#A1A1AA", bg="#121212").pack(side="left", padx=(10, 0))
        self.scraper_loc = tk.Entry(row1, font=("Segoe UI", 10), bg="#18181B", fg="#FFFFFF", insertbackground="#FFFFFF", relief="flat", width=20)
        self.scraper_loc.insert(0, "Remote")
        self.scraper_loc.pack(side="left", padx=8)

        # Buttons
        self.btn_hunt = tk.Button(
            row1, text="🚀 Launch Scraper", command=self._trigger_scraper,
            bg="#FF3B30", fg="#FFFFFF", relief="flat", font=("Segoe UI", 9, "bold"), padx=14, pady=4, cursor="hand2"
        )
        self.btn_hunt.pack(side="left", padx=12)

        self.btn_cancel_hunt = tk.Button(
            row1, text="Cancel", command=self._cancel_scraper,
            bg="#27272A", fg="#A1A1AA", relief="flat", font=("Segoe UI", 9), padx=10, pady=4, cursor="hand2"
        )
        self.btn_cancel_hunt.pack(side="left")

        self.scraper_status_lbl = tk.Label(controls, text="Status: Ready", font=("Segoe UI", 9), fg="#A1A1AA", bg="#121212")
        self.scraper_status_lbl.pack(anchor="w", pady=(6, 0))

        # Jobs Results Table
        tree_frame = tk.Frame(parent, bg="#09090b")
        tree_frame.pack(fill="both", expand=True, pady=8)

        columns = ("title", "company", "location", "fit", "site")
        self.scraper_tree = ttk.Treeview(tree_frame, columns=columns, show="headings", height=14)
        self.scraper_tree.heading("title", text="Position Title")
        self.scraper_tree.heading("company", text="Company")
        self.scraper_tree.heading("location", text="Location")
        self.scraper_tree.heading("fit", text="ATS Fit")
        self.scraper_tree.heading("site", text="Portal")

        self.scraper_tree.column("title", width=340)
        self.scraper_tree.column("company", width=180)
        self.scraper_tree.column("location", width=140)
        self.scraper_tree.column("fit", width=80, anchor="center")
        self.scraper_tree.column("site", width=90, anchor="center")
        self.scraper_tree.pack(fill="both", expand=True, side="left")

        tree_scroll = tk.Scrollbar(tree_frame, orient="vertical", command=self.scraper_tree.yview)
        tree_scroll.pack(side="right", fill="y")
        self.scraper_tree.config(yscrollcommand=tree_scroll.set)

    def _trigger_scraper(self):
        query = self.scraper_query.get().strip()
        loc = self.scraper_loc.get().strip() or "Remote"
        if not query:
            return

        self.hunt_running = True
        self.scraper_status_lbl.config(text=f"Scanning LinkedIn & Indeed for '{query}' in background...", fg="#FF3B30")
        self.btn_hunt.config(state="disabled")

        def _run():
            try:
                payload = json.dumps({
                    "searchTerm": query,
                    "location": loc,
                    "sites": ["linkedin", "indeed"],
                    "resultsWanted": 15,
                    "isRemote": True
                }).encode("utf-8")
                req = urllib.request.Request(f"{RADAR_BACKEND_URL}/api/scraper/hunt", data=payload, headers={"Content-Type": "application/json"})
                with urllib.request.urlopen(req, timeout=10):
                    pass
                self._poll_scraper_loop()
            except Exception as e:
                logger.error(f"Scraper launch error: {e}")
                self.window.after(0, lambda: self.scraper_status_lbl.config(text=f"Hunt failed: {e}", fg="#FF3B30"))
                self.window.after(0, lambda: self.btn_hunt.config(state="normal"))

        threading.Thread(target=_run, daemon=True).start()

    def _poll_scraper_loop(self):
        for _ in range(30):
            if not self.hunt_running:
                break
            time.sleep(2.5)
            try:
                req = urllib.request.Request(f"{RADAR_BACKEND_URL}/api/scraper/status")
                with urllib.request.urlopen(req, timeout=5) as r:
                    data = json.loads(r.read().decode("utf-8"))
                    status = data.get("status", "idle")
                    results = data.get("results", [])

                    if status == "completed":
                        self.window.after(0, lambda: self._update_scraper_results(results, f"Hunt Completed. Found {len(results)} opportunities."))
                        break
                    elif status == "error":
                        self.window.after(0, lambda: self.scraper_status_lbl.config(text="Hunt failed or completed with zero results.", fg="#FF3B30"))
                        break
            except Exception:
                pass
        self.hunt_running = False
        self.window.after(0, lambda: self.btn_hunt.config(state="normal"))

    def _update_scraper_results(self, jobs, msg):
        self.scraper_status_lbl.config(text=msg, fg="#FFFFFF")
        self.scraper_tree.delete(*self.scraper_tree.get_children())
        for j in jobs:
            self.scraper_tree.insert("", "end", values=(
                j.get("title", ""),
                j.get("company", ""),
                j.get("location", ""),
                f"{j.get('atsFitScore', 85)}%",
                j.get("site", "linkedin").upper()
            ))

    def _cancel_scraper(self):
        self.hunt_running = False
        def _cancel():
            try:
                req = urllib.request.Request(f"{RADAR_BACKEND_URL}/api/scraper/cancel", method="POST")
                urllib.request.urlopen(req, timeout=4)
            except Exception:
                pass
        threading.Thread(target=_cancel, daemon=True).start()
        self.scraper_status_lbl.config(text="Scraper cancelled by operator.", fg="#A1A1AA")
        self.btn_hunt.config(state="normal")

    # --------------------------------------------------------------------------
    # TAB 3: ATS LATEX RESUME STUDIO
    # --------------------------------------------------------------------------
    def _build_latex_tab(self, parent):
        paned = tk.PanedWindow(parent, orient="horizontal", bg="#09090b", sashrelief="flat", sashwidth=4)
        paned.pack(fill="both", expand=True, pady=6)

        # Left: Inputs
        left_box = tk.Frame(paned, bg="#121212", padx=16, pady=12, highlightthickness=1, highlightbackground="#27272A")
        paned.add(left_box, minsize=420)

        tk.Label(left_box, text="TARGET ROLE TITLE", font=("Segoe UI", 9, "bold"), fg="#A1A1AA", bg="#121212", anchor="w").pack(fill="x")
        self.latex_title_entry = tk.Entry(left_box, font=("Segoe UI", 10), bg="#18181B", fg="#FFFFFF", insertbackground="#FFFFFF", relief="flat")
        self.latex_title_entry.insert(0, "AI Engineer / Autonomous LLM Systems")
        self.latex_title_entry.pack(fill="x", pady=(4, 10), ipady=3)

        tk.Label(left_box, text="TARGET JOB DESCRIPTION", font=("Segoe UI", 9, "bold"), fg="#A1A1AA", bg="#121212", anchor="w").pack(fill="x")
        self.latex_desc_text = tk.Text(left_box, font=("Segoe UI", 9), bg="#18181B", fg="#E4E4E7", wrap="word", relief="flat", height=14, padx=8, pady=6)
        self.latex_desc_text.insert(tk.END, "We are seeking an AI Engineer with expertise in PyTorch, LangChain, RAG architectures, FastAPI, and scalable cloud deployments to build production intelligent agents.")
        self.latex_desc_text.pack(fill="both", expand=True, pady=(4, 12))

        self.btn_gen_latex = tk.Button(
            left_box, text="⚡ Generate Tailored LaTeX CV", command=self._generate_latex,
            bg="#FF3B30", fg="#FFFFFF", relief="flat", font=("Segoe UI", 10, "bold"), pady=8, cursor="hand2"
        )
        self.btn_gen_latex.pack(fill="x")

        # Right: Output
        right_box = tk.Frame(paned, bg="#0D0D0D", padx=16, pady=12, highlightthickness=1, highlightbackground="#27272A")
        paned.add(right_box, minsize=480)

        top_out = tk.Frame(right_box, bg="#0D0D0D")
        top_out.pack(fill="x", pady=(0, 6))

        tk.Label(top_out, text="ATS-OPTIMIZED LATEX CODE", font=("Segoe UI", 9, "bold"), fg="#FFFFFF", bg="#0D0D0D").pack(side="left")
        self.latex_score_lbl = tk.Label(top_out, text="ATS FIT: --%", font=("Segoe UI", 9, "bold"), fg="#FF3B30", bg="#0D0D0D")
        self.latex_score_lbl.pack(side="right")

        self.latex_output = tk.Text(right_box, font=("Consolas", 9), bg="#18181B", fg="#D4D4D8", wrap="none", relief="flat")
        self.latex_output.pack(fill="both", expand=True, pady=(0, 10))

        # Output Actions
        out_btns = tk.Frame(right_box, bg="#0D0D0D")
        out_btns.pack(fill="x")

        tk.Button(
            out_btns, text="📋 Copy LaTeX Code", command=lambda: pyperclip.copy(self.latex_output.get("1.0", tk.END)),
            bg="#27272A", fg="#FFFFFF", relief="flat", font=("Segoe UI", 9, "bold"), padx=12, pady=5, cursor="hand2"
        ).pack(side="left", padx=4)

        tk.Button(
            out_btns, text="💾 Save to .tex File", command=self._save_tex_file,
            bg="#18181B", fg="#FFFFFF", relief="flat", font=("Segoe UI", 9), padx=12, pady=5, cursor="hand2"
        ).pack(side="left", padx=4)

    def _generate_latex(self):
        title = self.latex_title_entry.get().strip()
        desc = self.latex_desc_text.get("1.0", tk.END).strip()
        if not title or not desc:
            return

        self.btn_gen_latex.config(text="Optimizing with Groq LLM...", state="disabled")

        def _do_tailor():
            try:
                payload = json.dumps({
                    "jobTitle": title,
                    "jobDescription": desc,
                    "candidateProfile": {}
                }).encode("utf-8")
                req = urllib.request.Request(f"{RADAR_BACKEND_URL}/api/cv/tailor-latex", data=payload, headers={"Content-Type": "application/json"})
                with urllib.request.urlopen(req, timeout=35) as r:
                    data = json.loads(r.read().decode("utf-8"))
                    code = data.get("latexCode", "")
                    score = data.get("atsFitScore", 88)
                    self.window.after(0, lambda: self._apply_latex_result(code, score))
            except Exception as e:
                logger.error(f"LaTeX generation failed: {e}")
                self.window.after(0, lambda: messagebox.showerror("Generation Error", f"LaTeX tailoring error: {e}"))
            finally:
                self.window.after(0, lambda: self.btn_gen_latex.config(text="⚡ Generate Tailored LaTeX CV", state="normal"))

        threading.Thread(target=_do_tailor, daemon=True).start()

    def _apply_latex_result(self, code, score):
        self.latex_output.delete("1.0", tk.END)
        self.latex_output.insert(tk.END, code)
        self.latex_score_lbl.config(text=f"ATS FIT: {score}%")
        show_toast("RADAR ATS Tailor", f"LaTeX resume generated with {score}% ATS match!")

    def _save_tex_file(self):
        code = self.latex_output.get("1.0", tk.END).strip()
        if not code:
            return
        path = filedialog.asksaveasfilename(defaultextension=".tex", filetypes=[("LaTeX Document", "*.tex")])
        if path:
            with open(path, "w", encoding="utf-8") as f:
                f.write(code)
            messagebox.showinfo("Saved", f"LaTeX resume successfully saved to:\n{path}")

    # --------------------------------------------------------------------------
    # TAB 4: RECRUITER CRM
    # --------------------------------------------------------------------------
    def _build_crm_tab(self, parent):
        top_bar = tk.Frame(parent, bg="#09090b", pady=6)
        top_bar.pack(fill="x")

        tk.Label(top_bar, text="Discovered Recruiter & Contact Leads", font=("Segoe UI", 11, "bold"), fg="#FFFFFF", bg="#09090b").pack(side="left")

        tk.Button(
            top_bar, text="📥 Export Leads to CSV", command=self._export_crm_csv,
            bg="#27272A", fg="#FFFFFF", relief="flat", font=("Segoe UI", 9, "bold"), padx=12, pady=4, cursor="hand2"
        ).pack(side="right")

        crm_frame = tk.Frame(parent, bg="#09090b")
        crm_frame.pack(fill="both", expand=True, pady=8)

        cols = ("name", "role", "company", "email", "phone")
        self.crm_tree = ttk.Treeview(crm_frame, columns=cols, show="headings", height=14)
        self.crm_tree.heading("name", text="Contact Name")
        self.crm_tree.heading("role", text="Role / Title")
        self.crm_tree.heading("company", text="Company")
        self.crm_tree.heading("email", text="Email")
        self.crm_tree.heading("phone", text="Phone / WA")

        self.crm_tree.column("name", width=180)
        self.crm_tree.column("role", width=180)
        self.crm_tree.column("company", width=160)
        self.crm_tree.column("email", width=180)
        self.crm_tree.column("phone", width=130)
        self.crm_tree.pack(fill="both", expand=True, side="left")

        crm_scroll = tk.Scrollbar(crm_frame, orient="vertical", command=self.crm_tree.yview)
        crm_scroll.pack(side="right", fill="y")
        self.crm_tree.config(yscrollcommand=crm_scroll.set)

    def _export_crm_csv(self):
        leads = [c for c in self.clips if c.get("contentType") == "contact_lead"]
        if not leads:
            messagebox.showinfo("No Leads", "No recruiter or contact leads found in vault to export.")
            return

        path = filedialog.asksaveasfilename(defaultextension=".csv", filetypes=[("CSV Spreadsheet", "*.csv")])
        if not path:
            return

        try:
            import csv
            with open(path, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(["ID", "Title", "Name", "Role", "Company", "Email", "Phone", "Captured Date", "Summary"])
                for c in leads:
                    ent = c.get("entities", {}) or {}
                    emails = ent.get("emails", []) or []
                    phones = ent.get("phones", []) or []
                    writer.writerow([
                        c.get("id"),
                        c.get("title", ""),
                        ent.get("contactName", ""),
                        ent.get("role", ""),
                        (ent.get("organizations", []) or [""])[0],
                        emails[0] if emails else "",
                        phones[0] if phones else "",
                        c.get("createdAt", ""),
                        c.get("summary", "")
                    ])
            messagebox.showinfo("Export Successful", f"Saved {len(leads)} leads to:\n{path}")
        except Exception as e:
            messagebox.showerror("Export Failed", str(e))


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
                    continue

                h = hashlib.sha256(clean.encode("utf-8")).hexdigest()
                if h in self.seen_hashes or clean == self.last_text:
                    continue

                self.seen_hashes.add(h)
                self.last_text = clean
                if len(self.seen_hashes) > 300:
                    self.seen_hashes.pop()

                self._ingest_clip(clean)
            except Exception:
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
        self.studio = RadarDesktopStudio(self)
        self.snip_tool = SnippingTool(process_snip_image)
        self.tray_icon = None

    def on_alt_s(self):
        logger.info("Global Hotkey [Alt + S]: Screen Snip")
        self.snip_tool.start()

    def on_alt_r(self):
        logger.info("Global Hotkey [Alt + R]: Quick HUD")
        self.hud.show()

    def on_alt_d(self):
        logger.info("Global Hotkey [Alt + D]: Desktop Studio")
        self.studio.show()

    def toggle_clipboard_sync(self, icon, item):
        global AUTO_CLIPBOARD_SYNC
        AUTO_CLIPBOARD_SYNC = not AUTO_CLIPBOARD_SYNC
        state_str = "ENABLED" if AUTO_CLIPBOARD_SYNC else "DISABLED"
        show_toast("RADAR Clipboard Sync", f"Clipboard auto-triage is now {state_str}")

    def exit_app(self, icon, item):
        global BACKEND_PROCESS
        logger.info("Shutting down RADAR Desktop...")
        self.clipboard_daemon.is_running = False
        if BACKEND_PROCESS:
            try:
                BACKEND_PROCESS.terminate()
            except Exception:
                pass
        icon.stop()
        os._exit(0)

    def start_hotkeys(self):
        hotkey_map = {
            "<alt>+s": self.on_alt_s,
            "<alt>+r": self.on_alt_r,
            "<alt>+d": self.on_alt_d,
        }

        try:
            hotkeys = keyboard.GlobalHotKeys(hotkey_map)
            hotkeys.start()
            logger.info("Global hotkeys active: [Alt+S] Snip, [Alt+R] HUD, [Alt+D] Studio")
        except Exception as e:
            logger.error(f"Global hotkey setup error: {e}")

    def run(self):
        # 1. Silently ensure local FastAPI backend is active
        threading.Thread(target=ensure_backend_running, daemon=True).start()

        # 2. Start background clipboard daemon
        self.clipboard_daemon.start()

        # 3. Register global hotkeys
        self.start_hotkeys()

        # 4. If executed directly from console, open Desktop Studio window
        if "--tray" not in sys.argv:
            threading.Thread(target=self.studio.show, daemon=True).start()

        # 5. Initialize System Tray
        img = create_tray_icon_image()
        menu = pystray.Menu(
            pystray.MenuItem("RADAR Studio (Alt + D)", lambda icon, item: self.on_alt_d(), default=True),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Snip Screen (Alt + S)", lambda icon, item: self.on_alt_s()),
            pystray.MenuItem("Quick HUD (Alt + R)", lambda icon, item: self.on_alt_r()),
            pystray.MenuItem("Open Web Console", lambda icon, item: webbrowser.open(RADAR_BACKEND_URL)),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem(
                lambda text: f"Auto-Sync Clipboard: {'ON' if AUTO_CLIPBOARD_SYNC else 'OFF'}",
                self.toggle_clipboard_sync
            ),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Exit RADAR", self.exit_app)
        )

        self.tray_icon = pystray.Icon("RADAR", img, "RADAR (Alt+D Studio | Alt+S Snip | Alt+R HUD)", menu)
        show_toast("RADAR Active", "Running in System Tray. Press Alt+D for Studio or Alt+S to snip.")
        logger.info("RADAR System Tray starting...")
        self.tray_icon.run()


if __name__ == "__main__":
    app = RadarDesktopApp()
    app.run()
