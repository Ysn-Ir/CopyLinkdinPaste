#!/usr/bin/env python3
"""
RADAR Native Desktop Application & Intelligence Studio
Built with CustomTkinter and embedded Matplotlib vector charts.
Stark monochrome dark HUD design matching the RADAR Web Application.

Key Capabilities:
- Direct Screenshot & Local OCR Lab (Zero LLM, 15ms Windows Media OCR, visual thumbnail, copy image/text)
- Live OS Clipboard Control Center (Real-time clipboard inspector, rolling history, 1-click restore/copy)
- Executive Intelligence Hub (KPI metrics, Pipeline Funnel & Channel Donut vector charts)
- Autonomous Scraper (LinkedIn Guest API + JobSpy with live progress and results table)
- ATS Resume Studio (LaTeX/Typst in-place tailoring: Summary, Bullets, Skills, PDF compile)
- Hotkey [Alt + S]: Transparent Screen Snip & Instant Local OCR
- Hotkey [Alt + R]: Bring RADAR Native HUD to Front
- System Tray HUD with tactical beacon
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
import urllib.parse
import webbrowser
import subprocess
import tempfile
import tkinter as tk
from tkinter import filedialog
from typing import List, Dict, Any, Optional
from datetime import datetime

import customtkinter as ctk
from PIL import Image, ImageDraw, ImageGrab, ImageTk
import pyperclip
from pynput import keyboard
import pystray

import matplotlib
matplotlib.use("TkAgg")
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from matplotlib.figure import Figure

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("radar.desktop")

RADAR_BACKEND_URL = os.getenv("RADAR_BACKEND_URL", "http://127.0.0.1:8003")
AUTO_CLIPBOARD_SYNC = True
BACKEND_PROCESS = None
MAIN_APP = None
TRAY_ICON = None

# CustomTkinter Dark Theme Setup
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("dark-blue")

# Theme Palette Constants
COLOR_BG = "#000000"
COLOR_CARD = "#0D0D0D"
COLOR_SURFACE = "#171717"
COLOR_BORDER = "#27272A"
COLOR_BORDER_FOCUS = "#3F3F46"
COLOR_TEXT_PRIMARY = "#FFFFFF"
COLOR_TEXT_SECONDARY = "#A1A1AA"
COLOR_TEXT_MUTED = "#71717A"
COLOR_ACCENT_RED = "#FF3B30"
COLOR_ACCENT_GREEN = "#4ADE80"
COLOR_ACCENT_BLUE = "#38BDF8"


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
        clean_title = title.replace('"', '`"')
        clean_msg = message[:180].replace('"', '`"').replace("\n", " ")
        ps_script = f"""
        [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
        $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
        $textNodes = $template.GetElementsByTagName("text")
        $textNodes.Item(0).AppendChild($template.CreateTextNode("{clean_title}")) > $null
        $textNodes.Item(1).AppendChild($template.CreateTextNode("{clean_msg}")) > $null
        $toast = [Windows.UI.Notifications.ToastNotification]::new($template)
        [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("RADAR").Show($toast)
        """
        subprocess.Popen(["powershell", "-NoProfile", "-Command", ps_script], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        logger.debug(f"Toast notice: {e}")


def copy_image_to_clipboard(pil_img: Image.Image) -> bool:
    """Puts a PIL image onto the Windows system clipboard as a device-independent bitmap."""
    try:
        import win32clipboard
        output = io.BytesIO()
        pil_img.convert("RGB").save(output, "BMP")
        data = output.getvalue()[14:]  # BMP header offset
        output.close()
        win32clipboard.OpenClipboard()
        win32clipboard.EmptyClipboard()
        win32clipboard.SetClipboardData(win32clipboard.CF_DIB, data)
        win32clipboard.CloseClipboard()
        return True
    except Exception as e:
        logger.warning(f"Error copying image to clipboard: {e}")
        return False


def extract_text_local_ocr(pil_img: Image.Image, lang: str = "en") -> str:
    """
    Extracts text using native Windows Media OCR without any LLM.
    Runs locally on CPU/GPU in ~20ms with zero token cost.
    """
    try:
        import winocr
        import asyncio
        loop = asyncio.new_event_loop()
        res = loop.run_until_complete(winocr.recognize_pil(pil_img, lang))
        loop.close()
        return res.text.strip() if res and res.text else ""
    except Exception as e:
        logger.warning(f"Local winocr extraction notice: {e}")
        return ""


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
# TRANSPARENT SCREEN SNIP TOOL (Alt + S)
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


def handle_snip_completed(pil_img: Image.Image):
    """Processes snipped image with local OCR and updates Native HUD."""
    t0 = time.time()
    # 1. Local OCR (0 LLM, 15ms)
    ocr_text = extract_text_local_ocr(pil_img)
    duration_ms = round((time.time() - t0) * 1000, 1)

    logger.info(f"Local winocr finished in {duration_ms}ms: {len(ocr_text)} chars extracted.")

    # 2. Update Native HUD UI on main thread
    if MAIN_APP:
        MAIN_APP.after(0, MAIN_APP.set_latest_screenshot, pil_img, ocr_text, duration_ms)

    # 3. Asynchronously persist into RADAR Vault in background
    threading.Thread(target=_persist_snip_to_backend, args=(pil_img, ocr_text), daemon=True).start()


def _persist_snip_to_backend(pil_img: Image.Image, ocr_text: str):
    buffered = io.BytesIO()
    pil_img.save(buffered, format="PNG")
    img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

    show_toast("RADAR Snip Extracted (Local OCR)", f"{len(ocr_text)} characters captured.")

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
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("success"):
                if MAIN_APP:
                    MAIN_APP.after(0, MAIN_APP.refresh_data)
    except Exception as e:
        logger.debug(f"Snip backend sync notice: {e}")


# ==============================================================================
# BACKGROUND INTELLIGENT CLIPBOARD LISTENER & HISTORY
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
                    if content and len(content.strip()) > 4:
                        c_hash = hashlib.md5(content.strip().encode("utf-8")).hexdigest()
                        if c_hash != self.last_hash:
                            self.last_hash = c_hash
                            # Push to HUD history
                            if MAIN_APP:
                                MAIN_APP.after(0, MAIN_APP.add_clipboard_history_item, content.strip())
                            self.handle_clipboard(content.strip())
            except Exception as e:
                logger.debug(f"Clipboard read notice: {e}")
            time.sleep(1.2)

    def handle_clipboard(self, text: str):
        is_job_or_opp = bool(
            any(
                kw in text.lower()
                for kw in [
                    "hiring", "recrute", "job", "stage", "internship", "engineer", "poste",
                    "candidat", "apply", "requirements", "responsibilities", "salary",
                    "linkedin.com/jobs", "indeed.com", "glassdoor"
                ]
            )
        )
        if is_job_or_opp or text.startswith("http"):
            threading.Thread(target=self._send_to_backend, args=(text,), daemon=True).start()

    def _send_to_backend(self, text: str):
        payload = json.dumps({
            "content": text,
            "sourceDevice": "desktop",
            "sourceUrl": text if text.startswith("http") else "clipboard_listener"
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
                    content_type = clip.get("contentType", "note").replace("_", " ").upper()
                    show_toast(
                        f"Signal Captured [{content_type}]",
                        f"{clip.get('title', 'Clipboard Signal')}"
                    )
                    if MAIN_APP:
                        MAIN_APP.after(0, MAIN_APP.refresh_data)
        except Exception as e:
            logger.debug(f"Clipboard ingest notice: {e}")


def create_and_open_eml(subject: str, to_addr: str, body: str) -> bool:
    """Generates a standard RFC 822 .eml file and launches the default desktop mail client."""
    try:
        from email.message import EmailMessage
        msg = EmailMessage()
        msg["Subject"] = subject or "Application: Candidate Inquiry"
        msg["To"] = to_addr or ""
        msg["From"] = "applicant@radar.local"
        msg.set_content(body or "")

        tmp_dir = tempfile.gettempdir()
        eml_path = os.path.join(tmp_dir, f"radar_outreach_{int(time.time())}.eml")
        with open(eml_path, "wb") as f:
            f.write(msg.as_bytes())

        if os.name == 'nt':
            os.startfile(eml_path)
        else:
            webbrowser.open(f"file://{eml_path}")
        return True
    except Exception as e:
        logger.error(f"Error opening .eml file: {e}")
        return False


# ==============================================================================
# MAIN NATIVE APPLICATION WINDOW (CustomTkinter)
# ==============================================================================

class RadarNativeApp(ctk.CTk):
    """
    Stark monochrome Native HUD built with CustomTkinter and embedded Matplotlib charts.
    """

    def __init__(self):
        super().__init__()

        self.title("RADAR // Signal Intelligence & Career Pipeline Cockpit")
        self.geometry("1260x840")
        self.minsize(1080, 740)
        self.configure(fg_color=COLOR_BG)

        # In-memory state
        self.offers: List[Dict[str, Any]] = []
        self.clips: List[Dict[str, Any]] = []
        self.clipboard_history: List[str] = []
        self.selected_offer: Optional[Dict[str, Any]] = None
        self.offers_filter_channel = "all"
        self.offers_filter_stage = "all"
        self.offers_search_query = ""
        self.latest_pil_img: Optional[Image.Image] = None
        self.latest_ocr_text: str = ""
        self.latest_ctk_img: Optional[ctk.CTkImage] = None
        self.is_hunting = False

        self._build_layout()

        # Start initial data fetch
        threading.Thread(target=self._initial_fetch, daemon=True).start()

    def _build_layout(self):
        """Builds modern Raycast / Linear Left-Sidebar Desktop Layout."""
        self.body_frame = ctk.CTkFrame(self, fg_color=COLOR_BG, corner_radius=0)
        self.body_frame.pack(fill="both", expand=True)

        # 1. Left Navigation Sidebar (220px fixed)
        self.sidebar = ctk.CTkFrame(self.body_frame, fg_color="#09090B", width=220, corner_radius=0, border_width=1, border_color="#18181B")
        self.sidebar.pack(side="left", fill="y", padx=0, pady=0)
        self.sidebar.pack_propagate(False)

        # Brand header in sidebar
        brand_box = ctk.CTkFrame(self.sidebar, fg_color="transparent")
        brand_box.pack(fill="x", padx=18, pady=(20, 16))

        brand_row = ctk.CTkFrame(brand_box, fg_color="transparent")
        brand_row.pack(anchor="w")

        beacon = ctk.CTkLabel(brand_row, text="●", font=("Segoe UI", 14, "bold"), text_color=COLOR_ACCENT_RED)
        beacon.pack(side="left", padx=(0, 6))

        brand_lbl = ctk.CTkLabel(brand_row, text="RADAR", font=("Segoe UI", 16, "bold"), text_color=COLOR_TEXT_PRIMARY)
        brand_lbl.pack(side="left")

        status_lbl = ctk.CTkLabel(brand_box, text="127.0.0.1:8003 · ONLINE", font=("Consolas", 9), text_color=COLOR_TEXT_MUTED)
        status_lbl.pack(anchor="w", pady=(2, 0))

        # Nav items
        sec_lbl = ctk.CTkLabel(self.sidebar, text="WORKSPACES", font=("Segoe UI", 9, "bold"), text_color=COLOR_TEXT_MUTED)
        sec_lbl.pack(anchor="w", padx=18, pady=(12, 6))

        self.nav_buttons = {}
        nav_items = [
            ("hub", "Overview"),
            ("offers", "Offers & Pipeline"),
            ("ocr", "Screenshot & OCR"),
            ("clipboard", "Live Clipboard"),
            ("scraper", "Job Scraper"),
            ("ats", "ATS Studio"),
        ]

        for key, label in nav_items:
            btn = ctk.CTkButton(
                self.sidebar,
                text=f"  {label}",
                anchor="w",
                font=("Segoe UI", 12, "bold"),
                fg_color="transparent",
                hover_color="#18181B",
                text_color=COLOR_TEXT_SECONDARY,
                height=36,
                corner_radius=6,
                command=lambda k=key: self._select_workspace(k)
            )
            btn.pack(fill="x", padx=12, pady=2)
            self.nav_buttons[key] = btn

        # Bottom sidebar actions
        bottom_box = ctk.CTkFrame(self.sidebar, fg_color="transparent")
        bottom_box.pack(side="bottom", fill="x", padx=14, pady=16)

        btn_snip = ctk.CTkButton(
            bottom_box,
            text="[Alt+S] Snip Screen",
            font=("Segoe UI", 11, "bold"),
            fg_color=COLOR_ACCENT_RED,
            hover_color="#D92D20",
            text_color="#FFFFFF",
            height=34,
            corner_radius=6,
            command=self._launch_screen_snip
        )
        btn_snip.pack(fill="x", pady=(0, 6))

        btn_web = ctk.CTkButton(
            bottom_box,
            text="Open Web App ↗",
            font=("Segoe UI", 11),
            fg_color="#18181B",
            hover_color="#27272A",
            text_color=COLOR_TEXT_PRIMARY,
            border_width=1,
            border_color="#27272A",
            height=32,
            corner_radius=6,
            command=lambda: webbrowser.open("http://127.0.0.1:8003")
        )
        btn_web.pack(fill="x")

        # 2. Right Workspace Container
        self.right_frame = ctk.CTkFrame(self.body_frame, fg_color=COLOR_BG, corner_radius=0)
        self.right_frame.pack(side="right", fill="both", expand=True)

        # Top breadcrumb & quick ingestion bar
        self.top_bar = ctk.CTkFrame(self.right_frame, fg_color="#09090B", height=44, corner_radius=0, border_width=1, border_color="#18181B")
        self.top_bar.pack(fill="x", side="top")
        self.top_bar.pack_propagate(False)

        self.breadcrumb_lbl = ctk.CTkLabel(self.top_bar, text="RADAR  /  WORKSPACE  /  OVERVIEW", font=("Consolas", 10, "bold"), text_color=COLOR_TEXT_MUTED)
        self.breadcrumb_lbl.pack(side="left", padx=20, pady=10)

        # Universal Quick Ingestion Bar in Top Bar
        ingest_box = ctk.CTkFrame(self.top_bar, fg_color="transparent")
        ingest_box.pack(side="left", padx=(10, 0), pady=6)

        self.universal_ingest_entry = ctk.CTkEntry(
            ingest_box,
            placeholder_text="Paste job link, recruiter message or raw text...",
            font=("Segoe UI", 11),
            width=320,
            height=28,
            fg_color="#18181B",
            border_width=1,
            border_color="#27272A"
        )
        self.universal_ingest_entry.pack(side="left", padx=(0, 6))
        self.universal_ingest_entry.bind("<Return>", lambda e: self._handle_universal_ingest())

        btn_ingest = ctk.CTkButton(
            ingest_box,
            text="⚡ Ingest AI",
            font=("Segoe UI", 10, "bold"),
            fg_color=COLOR_ACCENT_RED,
            hover_color="#D92D20",
            text_color="#FFFFFF",
            height=28,
            width=86,
            corner_radius=4,
            command=self._handle_universal_ingest
        )
        btn_ingest.pack(side="left")

        top_actions = ctk.CTkFrame(self.top_bar, fg_color="transparent")
        top_actions.pack(side="right", padx=16, pady=6)

        btn_sync = ctk.CTkButton(
            top_actions,
            text="Sync",
            font=("Segoe UI", 10, "bold"),
            fg_color="#18181B",
            hover_color="#27272A",
            text_color=COLOR_TEXT_PRIMARY,
            border_width=1,
            border_color="#27272A",
            height=26,
            width=60,
            corner_radius=4,
            command=self.refresh_data
        )
        btn_sync.pack(side="right", padx=(6, 0))

        status_badge = ctk.CTkLabel(top_actions, text="Local WinOCR Ready · 0 Tokens", font=("Consolas", 9), text_color="#4ADE80")
        status_badge.pack(side="right", padx=10)

        # Workspaces container
        self.workspaces_area = ctk.CTkFrame(self.right_frame, fg_color=COLOR_BG, corner_radius=0)
        self.workspaces_area.pack(fill="both", expand=True, padx=20, pady=16)

        self.tab_hub = ctk.CTkFrame(self.workspaces_area, fg_color="transparent")
        self.tab_offers = ctk.CTkFrame(self.workspaces_area, fg_color="transparent")
        self.tab_ocr = ctk.CTkFrame(self.workspaces_area, fg_color="transparent")
        self.tab_clipboard = ctk.CTkFrame(self.workspaces_area, fg_color="transparent")
        self.tab_scraper = ctk.CTkFrame(self.workspaces_area, fg_color="transparent")
        self.tab_ats = ctk.CTkFrame(self.workspaces_area, fg_color="transparent")

        self.workspace_frames = {
            "hub": (self.tab_hub, "OVERVIEW"),
            "offers": (self.tab_offers, "CAREER PIPELINE & OFFERS"),
            "ocr": (self.tab_ocr, "SCREENSHOT & LOCAL OCR LAB"),
            "clipboard": (self.tab_clipboard, "LIVE CLIPBOARD CENTER"),
            "scraper": (self.tab_scraper, "AUTONOMOUS JOB SCRAPER"),
            "ats": (self.tab_ats, "ATS RESUME STUDIO"),
        }

        self._setup_hub_tab()
        self._setup_offers_tab()
        self._setup_ocr_tab()
        self._setup_clipboard_tab()
        self._setup_scraper_tab()
        self._setup_ats_tab()

        self._select_workspace("hub")

    def _select_workspace(self, active_key: str):
        """Switches active workspace frame and updates sidebar navigation styles."""
        for key, (frame, title) in self.workspace_frames.items():
            if key == active_key:
                frame.pack(fill="both", expand=True)
                self.breadcrumb_lbl.configure(text=f"RADAR  /  WORKSPACE  /  {title}")
                if key in self.nav_buttons:
                    self.nav_buttons[key].configure(
                        fg_color="#18181B",
                        border_width=1,
                        border_color="#27272A",
                        text_color="#FFFFFF"
                    )
            else:
                frame.pack_forget()
                if key in self.nav_buttons:
                    self.nav_buttons[key].configure(
                        fg_color="transparent",
                        border_width=0,
                        text_color=COLOR_TEXT_SECONDARY
                    )

    # ==========================================================================
    # TAB 1: INTELLIGENCE HUB (METRIC DECK & EMBEDDED MATPLOTLIB GRAPHS)
    # ==========================================================================

    def _setup_hub_tab(self):
        # 1. Metric Deck Row
        self.metric_frame = ctk.CTkFrame(self.tab_hub, fg_color="transparent")
        self.metric_frame.pack(fill="x", padx=0, pady=(0, 14))

        self.kpi_cards = {}
        metrics = [
            ("TOTAL TRACKED", "0", "Across all channels"),
            ("APPLICATIONS", "0", "Direct email & outreach"),
            ("INTERVIEWS", "0", "Screening & rounds"),
            ("OFFERS SECURED", "0", "Placement confirmed"),
        ]
        for i, (title, val, sub) in enumerate(metrics):
            card = ctk.CTkFrame(self.metric_frame, fg_color=COLOR_CARD, border_width=1, border_color=COLOR_BORDER, corner_radius=8)
            card.pack(side="left", fill="both", expand=True, padx=(0 if i == 0 else 8, 0))

            lbl_t = ctk.CTkLabel(card, text=title, font=("Segoe UI", 10, "bold"), text_color=COLOR_TEXT_SECONDARY)
            lbl_t.pack(anchor="w", padx=16, pady=(12, 2))

            lbl_v = ctk.CTkLabel(card, text=val, font=("Segoe UI", 24, "bold"), text_color=COLOR_TEXT_PRIMARY)
            lbl_v.pack(anchor="w", padx=16, pady=(0, 2))

            lbl_s = ctk.CTkLabel(card, text=sub, font=("Segoe UI", 9), text_color=COLOR_TEXT_MUTED)
            lbl_s.pack(anchor="w", padx=16, pady=(0, 12))

            self.kpi_cards[title] = lbl_v

        # 2. Charts Container Frame
        self.charts_frame = ctk.CTkFrame(self.tab_hub, fg_color=COLOR_CARD, border_width=1, border_color=COLOR_BORDER, corner_radius=8, height=270)
        self.charts_frame.pack(fill="x", expand=False, padx=0, pady=0)
        self.charts_frame.pack_propagate(False)

        # Matplotlib Figure with 2 subplots (Funnel & Channel Donut)
        self.fig = Figure(figsize=(10, 3.4), facecolor=COLOR_CARD)
        self.ax_funnel = self.fig.add_subplot(121)
        self.ax_channels = self.fig.add_subplot(122)

        self.canvas = FigureCanvasTkAgg(self.fig, master=self.charts_frame)
        self.canvas.get_tk_widget().pack(fill="both", expand=True, padx=10, pady=6)

        self._render_charts([0, 0, 0, 0], [1, 1, 1])

        # 3. Recent Opportunities Quick Deck
        recent_box = ctk.CTkFrame(self.tab_hub, fg_color=COLOR_CARD, border_width=1, border_color=COLOR_BORDER, corner_radius=8)
        recent_box.pack(fill="both", expand=True, padx=0, pady=(12, 0))

        recent_hdr = ctk.CTkFrame(recent_box, fg_color="transparent")
        recent_hdr.pack(fill="x", padx=16, pady=(12, 6))

        ctk.CTkLabel(recent_hdr, text="RECENT SIGNALS & OPPORTUNITIES", font=("Segoe UI", 11, "bold"), text_color=COLOR_TEXT_PRIMARY).pack(side="left")

        btn_view_all = ctk.CTkButton(
            recent_hdr,
            text="Explore Pipeline & Offers →",
            font=("Segoe UI", 10, "bold"),
            fg_color="transparent",
            hover_color="#18181B",
            text_color=COLOR_ACCENT_RED,
            height=26,
            command=lambda: self._select_workspace("offers")
        )
        btn_view_all.pack(side="right")

        self.hub_recent_scroll = ctk.CTkScrollableFrame(recent_box, fg_color="transparent", corner_radius=0)
        self.hub_recent_scroll.pack(fill="both", expand=True, padx=12, pady=(0, 10))

    def _render_charts(self, funnel_counts, channel_counts):
        """Renders dark HUD graphs onto embedded matplotlib canvas."""
        # 1. Funnel Bar Chart
        self.ax_funnel.clear()
        self.ax_funnel.set_facecolor(COLOR_CARD)
        stages = ["Saved", "Applied", "Interview", "Offer"]
        colors = ["#FFFFFF", "#D4D4D8", "#A1A1AA", COLOR_ACCENT_RED]
        bars = self.ax_funnel.bar(stages, funnel_counts, color=colors, width=0.55)

        for bar in bars:
            height = bar.get_height()
            self.ax_funnel.annotate(
                f"{height}",
                xy=(bar.get_x() + bar.get_width() / 2, height),
                xytext=(0, 3),
                textcoords="offset points",
                ha="center",
                va="bottom",
                fontsize=9,
                color="#FFFFFF",
                fontweight="bold"
            )

        self.ax_funnel.tick_params(colors=COLOR_TEXT_SECONDARY, labelsize=9)
        for spine in self.ax_funnel.spines.values():
            spine.set_color(COLOR_BORDER)
        self.ax_funnel.set_title("Pipeline Conversion Funnel", color="#FFFFFF", fontsize=11, fontweight="bold", pad=10)

        # 2. Channels Donut Chart
        self.ax_channels.clear()
        self.ax_channels.set_facecolor(COLOR_CARD)
        ch_labels = ["Email", "WhatsApp/DM", "ATS Portals"]
        ch_colors = ["#FFFFFF", "#A1A1AA", "#3F3F46"]

        total_c = sum(channel_counts)
        if total_c == 0:
            channel_counts = [1, 1, 1]

        wedges, _ = self.ax_channels.pie(
            channel_counts,
            labels=None,
            colors=ch_colors,
            startangle=140,
            wedgeprops=dict(width=0.45, edgecolor=COLOR_BORDER)
        )
        self.ax_channels.legend(
            wedges, ch_labels, loc="center", frameon=False,
            labelcolor=COLOR_TEXT_SECONDARY, fontsize=8
        )
        self.ax_channels.set_title("Outreach Channels Split", color="#FFFFFF", fontsize=11, fontweight="bold", pad=10)

        self.fig.tight_layout()
        self.canvas.draw()

    # ==========================================================================
    # TAB: OFFERS & PIPELINE EXPLORER (MASTER-DETAIL WORKSPACE)
    # ==========================================================================

    def _setup_offers_tab(self):
        container = ctk.CTkFrame(self.tab_offers, fg_color="transparent")
        container.pack(fill="both", expand=True, padx=0, pady=0)

        # 1. Left Column: Search, Filter & List of Offers (410px width)
        left_col = ctk.CTkFrame(container, fg_color=COLOR_CARD, border_width=1, border_color=COLOR_BORDER, corner_radius=8, width=410)
        left_col.pack(side="left", fill="both", expand=False, padx=(0, 10))
        left_col.pack_propagate(False)

        # Search Bar
        search_box = ctk.CTkFrame(left_col, fg_color="transparent")
        search_box.pack(fill="x", padx=14, pady=(14, 8))

        self.offers_search_entry = ctk.CTkEntry(
            search_box,
            placeholder_text="Search opportunities, skills...",
            font=("Segoe UI", 11),
            height=32,
            fg_color=COLOR_SURFACE,
            border_color=COLOR_BORDER
        )
        self.offers_search_entry.pack(fill="x")
        self.offers_search_entry.bind("<KeyRelease>", lambda e: self._on_offers_filter_change())

        # Channel Filter Segmented
        chan_lbl = ctk.CTkLabel(left_col, text="CHANNEL:", font=("Segoe UI", 9, "bold"), text_color=COLOR_TEXT_MUTED)
        chan_lbl.pack(anchor="w", padx=14, pady=(2, 2))

        self.offers_channel_seg = ctk.CTkSegmentedButton(
            left_col,
            values=["All", "Email", "Direct (WA)", "Portal"],
            font=("Segoe UI", 10),
            height=26,
            fg_color=COLOR_SURFACE,
            selected_color="#FFFFFF",
            selected_hover_color="#E4E4E7",
            unselected_color=COLOR_SURFACE,
            unselected_hover_color="#27272A",
            text_color="#000000",
            command=lambda v: self._on_offers_filter_change()
        )
        self.offers_channel_seg.set("All")
        self.offers_channel_seg.pack(fill="x", padx=14, pady=(0, 6))

        # Stage Filter Segmented
        stage_lbl = ctk.CTkLabel(left_col, text="STAGE:", font=("Segoe UI", 9, "bold"), text_color=COLOR_TEXT_MUTED)
        stage_lbl.pack(anchor="w", padx=14, pady=(2, 2))

        self.offers_stage_seg = ctk.CTkSegmentedButton(
            left_col,
            values=["All", "Saved", "Ready", "Applied", "Interview", "Offer"],
            font=("Segoe UI", 10),
            height=26,
            fg_color=COLOR_SURFACE,
            selected_color="#FFFFFF",
            selected_hover_color="#E4E4E7",
            unselected_color=COLOR_SURFACE,
            unselected_hover_color="#27272A",
            text_color="#000000",
            command=lambda v: self._on_offers_filter_change()
        )
        self.offers_stage_seg.set("All")
        self.offers_stage_seg.pack(fill="x", padx=14, pady=(0, 10))

        # Offers Count Header
        self.offers_count_lbl = ctk.CTkLabel(
            left_col,
            text="TRACKED OPPORTUNITIES (0)",
            font=("Segoe UI", 10, "bold"),
            text_color=COLOR_TEXT_SECONDARY
        )
        self.offers_count_lbl.pack(anchor="w", padx=14, pady=(0, 6))

        # Scrollable Offers List
        self.offers_list_scroll = ctk.CTkScrollableFrame(
            left_col,
            fg_color="transparent",
            corner_radius=0
        )
        self.offers_list_scroll.pack(fill="both", expand=True, padx=8, pady=(0, 10))

        # 2. Right Column: Master-Detail Inspector
        self.detail_col = ctk.CTkFrame(container, fg_color=COLOR_CARD, border_width=1, border_color=COLOR_BORDER, corner_radius=8)
        self.detail_col.pack(side="right", fill="both", expand=True)

        self._render_empty_offer_detail()

    def _on_offers_filter_change(self):
        self.offers_search_query = self.offers_search_entry.get().strip().lower()
        self.offers_filter_channel = self.offers_channel_seg.get()
        self.offers_filter_stage = self.offers_stage_seg.get()
        self._render_offers_list()

    def _render_offers_list(self):
        for widget in self.offers_list_scroll.winfo_children():
            widget.destroy()

        # Channel mapping
        chan_map = {
            "All": None,
            "Email": "email",
            "Direct (WA)": "direct_contact",
            "Portal": "external",
        }
        target_ch = chan_map.get(self.offers_filter_channel)
        target_st = None if self.offers_filter_stage == "All" else self.offers_filter_stage.lower()

        filtered = []
        for o in self.offers:
            # Query match
            q = self.offers_search_query
            if q:
                match_q = (
                    q in o.get("title", "").lower()
                    or q in o.get("company", "").lower()
                    or any(q in s.lower() for s in o.get("skills", []))
                )
                if not match_q:
                    continue

            # Channel match
            if target_ch and o.get("channel") != target_ch:
                continue

            # Stage match
            if target_st and o.get("status", "saved").lower() != target_st:
                continue

            filtered.append(o)

        self.offers_count_lbl.configure(text=f"TRACKED OPPORTUNITIES ({len(filtered)})")

        if not filtered:
            ctk.CTkLabel(
                self.offers_list_scroll,
                text="No opportunities match current filter.",
                text_color=COLOR_TEXT_MUTED,
                font=("Segoe UI", 11)
            ).pack(pady=30)
            return

        for o in filtered:
            is_active = self.selected_offer and self.selected_offer.get("id") == o.get("id")
            card = ctk.CTkFrame(
                self.offers_list_scroll,
                fg_color="#18181B" if is_active else COLOR_SURFACE,
                border_width=1,
                border_color=COLOR_ACCENT_RED if is_active else COLOR_BORDER,
                corner_radius=6,
                cursor="hand2"
            )
            card.pack(fill="x", padx=4, pady=4)

            # Top row: Company initial glyph + Title + Match Fit
            top_r = ctk.CTkFrame(card, fg_color="transparent")
            top_r.pack(fill="x", padx=10, pady=(8, 2))

            initial = (o.get("company") or "•")[:1].upper()
            avatar_lbl = ctk.CTkLabel(
                top_r,
                text=initial,
                font=("Segoe UI", 10, "bold"),
                text_color=COLOR_ACCENT_RED,
                fg_color="#27272A",
                width=24,
                height=24,
                corner_radius=4
            )
            avatar_lbl.pack(side="left", padx=(0, 8))

            title_lbl = ctk.CTkLabel(
                top_r,
                text=o.get("title", "Role"),
                font=("Segoe UI", 11, "bold"),
                text_color="#FFFFFF" if is_active else COLOR_TEXT_PRIMARY,
                anchor="w"
            )
            title_lbl.pack(side="left", fill="x", expand=True)

            score = int((o.get("confidence") or 0.90) * 100)
            score_lbl = ctk.CTkLabel(
                top_r,
                text=f"{score}%",
                font=("Segoe UI", 9, "bold"),
                text_color=COLOR_ACCENT_GREEN if score >= 85 else COLOR_TEXT_MUTED,
                fg_color=COLOR_CARD,
                corner_radius=3,
                padx=5,
                pady=1
            )
            score_lbl.pack(side="right")

            # Sub row: Company & Location
            sub_r = ctk.CTkFrame(card, fg_color="transparent")
            sub_r.pack(fill="x", padx=10, pady=(0, 6))

            co_text = f"{o.get('company', 'Company')} · {o.get('location', 'Remote')}"
            ctk.CTkLabel(
                sub_r,
                text=co_text,
                font=("Segoe UI", 10),
                text_color=COLOR_TEXT_SECONDARY,
                anchor="w"
            ).pack(side="left")

            stage_text = (o.get("status") or "SAVED").upper()
            stage_badge = ctk.CTkLabel(
                sub_r,
                text=stage_text,
                font=("Segoe UI", 8, "bold"),
                text_color=COLOR_ACCENT_RED if stage_text == "OFFER" else (COLOR_ACCENT_GREEN if stage_text == "APPLIED" else COLOR_TEXT_SECONDARY),
                fg_color=COLOR_CARD,
                corner_radius=3,
                padx=4,
                pady=1
            )
            stage_badge.pack(side="right")

            # Bind clicks
            for w in [card, top_r, sub_r, title_lbl, avatar_lbl]:
                w.bind("<Button-1>", lambda e, opt=o: self._select_offer(opt))

    def _select_offer(self, offer: Dict[str, Any]):
        self.selected_offer = offer
        self._render_offers_list()
        self._render_offer_detail(offer)

    def _render_empty_offer_detail(self):
        for w in self.detail_col.winfo_children():
            w.destroy()

        box = ctk.CTkFrame(self.detail_col, fg_color="transparent")
        box.pack(expand=True)

        ctk.CTkLabel(box, text="🛰️", font=("Segoe UI", 32)).pack(pady=(0, 8))
        ctk.CTkLabel(box, text="SELECT AN OPPORTUNITY", font=("Segoe UI", 13, "bold"), text_color=COLOR_TEXT_PRIMARY).pack(pady=(0, 4))
        ctk.CTkLabel(
            box,
            text="Choose any tracked role on the left to inspect intelligence,\nrecruiter contacts, AI outreach drafts, and ATS tailoring.",
            font=("Segoe UI", 11),
            text_color=COLOR_TEXT_MUTED,
            justify="center"
        ).pack()

    def _render_offer_detail(self, offer: Dict[str, Any]):
        for w in self.detail_col.winfo_children():
            w.destroy()

        scroll = ctk.CTkScrollableFrame(self.detail_col, fg_color="transparent", corner_radius=0)
        scroll.pack(fill="both", expand=True, padx=16, pady=14)

        # Header: Title, Company, Score
        hdr = ctk.CTkFrame(scroll, fg_color="transparent")
        hdr.pack(fill="x", pady=(0, 10))

        title_lbl = ctk.CTkLabel(hdr, text=offer.get("title", "Role Title"), font=("Segoe UI", 18, "bold"), text_color=COLOR_TEXT_PRIMARY, anchor="w")
        title_lbl.pack(anchor="w")

        sub_info = f"{offer.get('company', 'Company')}  ·  {offer.get('location', 'Remote')}  ·  {offer.get('salary', 'Competitive Compensation')}"
        ctk.CTkLabel(hdr, text=sub_info, font=("Segoe UI", 12), text_color=COLOR_TEXT_SECONDARY, anchor="w").pack(anchor="w", pady=(2, 6))

        # Status & Quick Action Row
        status_row = ctk.CTkFrame(scroll, fg_color=COLOR_SURFACE, border_width=1, border_color=COLOR_BORDER, corner_radius=6)
        status_row.pack(fill="x", pady=(0, 12))

        inner_st = ctk.CTkFrame(status_row, fg_color="transparent")
        inner_st.pack(fill="x", padx=12, pady=8)

        ctk.CTkLabel(inner_st, text="PIPELINE STAGE:", font=("Segoe UI", 10, "bold"), text_color=COLOR_TEXT_MUTED).pack(side="left", padx=(0, 10))

        current_st = (offer.get("status") or "saved").lower()
        if current_st not in ["saved", "ready", "applied", "interview", "offer"]:
            current_st = "saved"

        stage_seg = ctk.CTkSegmentedButton(
            inner_st,
            values=["saved", "ready", "applied", "interview", "offer"],
            font=("Segoe UI", 10, "bold"),
            height=28,
            fg_color=COLOR_CARD,
            selected_color=COLOR_ACCENT_RED,
            selected_hover_color="#D92D20",
            unselected_color=COLOR_CARD,
            unselected_hover_color="#27272A",
            command=lambda val, oid=offer.get("id"): self._update_offer_status(oid, val)
        )
        stage_seg.set(current_st)
        stage_seg.pack(side="left", fill="x", expand=True)

        # Recruiter & Contacts Box
        contact_box = ctk.CTkFrame(scroll, fg_color=COLOR_SURFACE, border_width=1, border_color=COLOR_BORDER, corner_radius=6)
        contact_box.pack(fill="x", pady=(0, 12))

        c_hdr = ctk.CTkFrame(contact_box, fg_color="transparent")
        c_hdr.pack(fill="x", padx=14, pady=(10, 4))
        ctk.CTkLabel(c_hdr, text="DIRECT RECRUITER & SOURCING CONTACTS", font=("Segoe UI", 11, "bold"), text_color=COLOR_TEXT_PRIMARY).pack(side="left")

        r_email = offer.get("recruiterEmail") or offer.get("contactEmail") or ""
        r_name = offer.get("contactName") or "Hiring Team"
        r_phone = offer.get("contactPhone") or ""
        job_url = offer.get("jobUrl") or offer.get("sourceUrl") or ""

        c_info = ctk.CTkFrame(contact_box, fg_color="transparent")
        c_info.pack(fill="x", padx=14, pady=(0, 8))

        detail_lines = []
        if r_name: detail_lines.append(f"Name: {r_name}")
        if r_email: detail_lines.append(f"Email: {r_email}")
        if r_phone: detail_lines.append(f"Direct Phone: {r_phone}")
        if not detail_lines: detail_lines.append("No direct contacts parsed yet. Captured via web portal.")

        ctk.CTkLabel(c_info, text="  ·  ".join(detail_lines), font=("Segoe UI", 10), text_color=COLOR_TEXT_SECONDARY, anchor="w").pack(anchor="w")

        # Action buttons for contacts
        c_btns = ctk.CTkFrame(contact_box, fg_color="transparent")
        c_btns.pack(fill="x", padx=14, pady=(0, 10))

        if r_email:
            subj_enc = urllib.parse.quote(f"Application: {offer.get('title')} - Radar Inquiry")
            body_enc = urllib.parse.quote(f"Dear {r_name},\n\nI am writing to express my strong interest in the {offer.get('title')} position at {offer.get('company')}.")
            btn_mailto = ctk.CTkButton(
                c_btns,
                text="📧 Open Mailto",
                font=("Segoe UI", 10, "bold"),
                fg_color="#FFFFFF",
                text_color="#000000",
                hover_color="#E4E4E7",
                height=26,
                command=lambda: webbrowser.open(f"mailto:{r_email}?subject={subj_enc}&body={body_enc}")
            )
            btn_mailto.pack(side="left", padx=(0, 8))

        if r_phone:
            clean_p = "".join(c for c in r_phone if c.isdigit() or c == '+')
            wa_text = urllib.parse.quote(f"Hi {r_name}, I saw the {offer.get('title')} opening at {offer.get('company')} and would love to connect!")
            btn_wa = ctk.CTkButton(
                c_btns,
                text="💬 WhatsApp Launcher",
                font=("Segoe UI", 10, "bold"),
                fg_color="#10B981",
                text_color="#FFFFFF",
                hover_color="#059669",
                height=26,
                command=lambda: webbrowser.open(f"https://wa.me/{clean_p}?text={wa_text}")
            )
            btn_wa.pack(side="left", padx=(0, 8))

        if job_url:
            btn_open_url = ctk.CTkButton(
                c_btns,
                text="🌐 Open Link ↗",
                font=("Segoe UI", 10),
                fg_color=COLOR_CARD,
                border_width=1,
                border_color=COLOR_BORDER,
                text_color=COLOR_TEXT_PRIMARY,
                hover_color="#27272A",
                height=26,
                command=lambda u=job_url: webbrowser.open(u)
            )
            btn_open_url.pack(side="left", padx=(0, 8))

        # AI Cold Outreach & Email Drafter
        outreach_box = ctk.CTkFrame(scroll, fg_color=COLOR_SURFACE, border_width=1, border_color=COLOR_BORDER, corner_radius=6)
        outreach_box.pack(fill="x", pady=(0, 12))

        o_hdr = ctk.CTkFrame(outreach_box, fg_color="transparent")
        o_hdr.pack(fill="x", padx=14, pady=(10, 6))
        ctk.CTkLabel(o_hdr, text="AI COLD OUTREACH DRAFT & .EML EXPORTER", font=("Segoe UI", 11, "bold"), text_color=COLOR_TEXT_PRIMARY).pack(side="left")

        # Subject Entry
        ctk.CTkLabel(outreach_box, text="Subject Line:", font=("Segoe UI", 10, "bold"), text_color=COLOR_TEXT_MUTED).pack(anchor="w", padx=14)
        subj_entry = ctk.CTkEntry(outreach_box, font=("Segoe UI", 11), height=28, fg_color=COLOR_CARD, border_color=COLOR_BORDER)
        subj_entry.pack(fill="x", padx=14, pady=(2, 8))
        subj_entry.insert(0, f"Application: {offer.get('title')} -- Radar Candidate")

        # Body Textbox
        ctk.CTkLabel(outreach_box, text="Cold Outreach Message:", font=("Segoe UI", 10, "bold"), text_color=COLOR_TEXT_MUTED).pack(anchor="w", padx=14)
        body_text = ctk.CTkTextbox(outreach_box, font=("Consolas", 10), height=140, fg_color="#141414", border_color=COLOR_BORDER)
        body_text.pack(fill="x", padx=14, pady=(2, 10))

        default_pitch = (
            f"Dear {r_name},\n\n"
            f"I recently tracked the {offer.get('title')} position at {offer.get('company')} and am reaching out directly. "
            f"With deep background across {', '.join(offer.get('skills', ['distributed systems', 'cloud engineering'])[:4])}, "
            f"I have delivered scalable infrastructure and high-efficiency systems.\n\n"
            f"I would welcome a brief 10-minute screening conversation regarding how I can contribute to {offer.get('company')}'s engineering roadmap.\n\n"
            f"Best regards,\nRadar Candidate\nportfolio: https://radar.local"
        )
        body_text.insert("1.0", default_pitch)

        # Outreach Action Buttons
        o_btns = ctk.CTkFrame(outreach_box, fg_color="transparent")
        o_btns.pack(fill="x", padx=14, pady=(0, 12))

        btn_copy_gmail = ctk.CTkButton(
            o_btns,
            text="📋 Copy for Gmail",
            font=("Segoe UI", 10, "bold"),
            fg_color="#FFFFFF",
            text_color="#000000",
            hover_color="#E4E4E7",
            height=28,
            command=lambda: (
                pyperclip.copy(body_text.get("1.0", "end-1c")),
                show_toast("Outreach Copied", "Cold pitch copied to Windows clipboard.")
            )
        )
        btn_copy_gmail.pack(side="left", padx=(0, 8))

        btn_export_eml = ctk.CTkButton(
            o_btns,
            text="✉️ Export .EML (Outlook/Mail)",
            font=("Segoe UI", 10, "bold"),
            fg_color=COLOR_CARD,
            border_width=1,
            border_color=COLOR_BORDER,
            text_color=COLOR_TEXT_PRIMARY,
            hover_color="#27272A",
            height=28,
            command=lambda: (
                create_and_open_eml(
                    subj_entry.get().strip(),
                    r_email,
                    body_text.get("1.0", "end-1c")
                ),
                show_toast("EML Generated", "Standard RFC 822 email exported and launched.")
            )
        )
        btn_export_eml.pack(side="left", padx=(0, 8))

        wa_short = f"Hi {r_name}, I'm reaching out regarding the {offer.get('title')} role at {offer.get('company')}. Would love to share my portfolio and discuss fit!"
        btn_copy_wa = ctk.CTkButton(
            o_btns,
            text="💬 Copy WhatsApp Pitch",
            font=("Segoe UI", 10),
            fg_color=COLOR_CARD,
            border_width=1,
            border_color=COLOR_BORDER,
            text_color=COLOR_TEXT_PRIMARY,
            hover_color="#27272A",
            height=28,
            command=lambda: (
                pyperclip.copy(wa_short),
                show_toast("Pitch Copied", "2-sentence WhatsApp DM pitch copied.")
            )
        )
        btn_copy_wa.pack(side="left")

        # ATS Studio Bridge
        bridge_box = ctk.CTkFrame(scroll, fg_color=COLOR_SURFACE, border_width=1, border_color=COLOR_BORDER, corner_radius=6)
        bridge_box.pack(fill="x", pady=(0, 10))

        b_inner = ctk.CTkFrame(bridge_box, fg_color="transparent")
        b_inner.pack(fill="x", padx=14, pady=10)

        ctk.CTkLabel(
            b_inner,
            text="Tailor your LaTeX / Typst CV specifically for this opportunity in the ATS Resume Studio.",
            font=("Segoe UI", 10),
            text_color=COLOR_TEXT_SECONDARY
        ).pack(side="left")

        btn_go_ats = ctk.CTkButton(
            b_inner,
            text="⚡ Tailor in ATS Studio ↗",
            font=("Segoe UI", 10, "bold"),
            fg_color=COLOR_ACCENT_RED,
            hover_color="#D92D20",
            text_color="#FFFFFF",
            height=28,
            command=lambda opt=offer: self._transfer_to_ats_studio(opt)
        )
        btn_go_ats.pack(side="right")

    def _transfer_to_ats_studio(self, offer: Dict[str, Any]):
        self.ats_role_entry.delete(0, "end")
        self.ats_role_entry.insert(0, offer.get("title", ""))

        desc = offer.get("description") or f"Role at {offer.get('company')}. Required skills: {', '.join(offer.get('skills', []))}"
        self.ats_desc_text.delete("1.0", "end")
        self.ats_desc_text.insert("1.0", desc)

        self._select_workspace("ats")
        show_toast("Opportunity Transferred", f"Loaded '{offer.get('title')}' into ATS Resume Studio.")

    def _update_offer_status(self, offer_id: str, new_status: str):
        payload = json.dumps({"status": new_status}).encode("utf-8")
        req = urllib.request.Request(
            f"{RADAR_BACKEND_URL}/api/offers/{offer_id}",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="PUT"
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                show_toast("Status Updated", f"Position stage updated to '{new_status.upper()}'.")
                self.refresh_data()
        except Exception as e:
            logger.error(f"Error updating status: {e}")

    def _handle_universal_ingest(self):
        text = self.universal_ingest_entry.get().strip()
        if not text or len(text) < 5:
            return

        payload = json.dumps({
            "content": text,
            "sourceDevice": "desktop",
            "sourceUrl": text if text.startswith("http") else "desktop_universal_bar"
        }).encode("utf-8")

        req = urllib.request.Request(
            f"{RADAR_BACKEND_URL}/api/clips/ingest",
            data=payload,
            headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if data.get("success"):
                    self.universal_ingest_entry.delete(0, "end")
                    show_toast("Signal Ingested", "Parsed job or clipboard clip into RADAR pipeline.")
                    self.refresh_data()
                    self._select_workspace("offers")
        except Exception as e:
            logger.error(f"Universal ingest error: {e}")
            show_toast("Ingest Failed", str(e))

    # ==========================================================================
    # TAB 2: SCREENSHOT & LOCAL OCR LAB (ZERO LLM, 15MS WINDOWS OCR)
    # ==========================================================================

    def _setup_ocr_tab(self):
        container = ctk.CTkFrame(self.tab_ocr, fg_color="transparent")
        container.pack(fill="both", expand=True, padx=0, pady=0)

        # Left Column: Image Preview & File Controls
        left_box = ctk.CTkFrame(container, fg_color=COLOR_CARD, border_width=1, border_color=COLOR_BORDER, corner_radius=8, width=460)
        left_box.pack(side="left", fill="both", expand=False, padx=(0, 10))

        # Header
        top_lbl = ctk.CTkFrame(left_box, fg_color="transparent")
        top_lbl.pack(fill="x", padx=16, pady=(14, 8))
        ctk.CTkLabel(top_lbl, text="LATEST SCREENSHOT PREVIEW", font=("Segoe UI", 12, "bold"), text_color=COLOR_TEXT_PRIMARY).pack(side="left")
        self.ocr_time_badge = ctk.CTkLabel(top_lbl, text="0.0 ms (LOCAL)", font=("Consolas", 10, "bold"), text_color=COLOR_ACCENT_GREEN, fg_color=COLOR_SURFACE, corner_radius=4, padx=6, pady=2)
        self.ocr_time_badge.pack(side="right")

        # Thumbnail Canvas Frame
        self.img_preview_frame = ctk.CTkFrame(left_box, fg_color="#141414", border_width=1, border_color=COLOR_BORDER, corner_radius=6, height=360)
        self.img_preview_frame.pack(fill="both", expand=True, padx=16, pady=4)
        self.img_preview_lbl = ctk.CTkLabel(
            self.img_preview_frame,
            text="No screenshot captured yet.\nPress [Alt + S] to snip or click 'Open Image File'.",
            font=("Segoe UI", 11),
            text_color=COLOR_TEXT_MUTED
        )
        self.img_preview_lbl.pack(expand=True)

        # Button Deck for Image Actions
        img_actions = ctk.CTkFrame(left_box, fg_color="transparent")
        img_actions.pack(fill="x", padx=16, pady=(10, 14))

        btn_snip_now = ctk.CTkButton(
            img_actions, text="[Alt+S] Snip Now", font=("Segoe UI", 11, "bold"),
            fg_color=COLOR_ACCENT_RED, hover_color="#D92D20", height=32,
            command=self._launch_screen_snip
        )
        btn_snip_now.pack(side="left", fill="x", expand=True, padx=(0, 4))

        btn_load_file = ctk.CTkButton(
            img_actions, text="Open Image File", font=("Segoe UI", 11),
            fg_color=COLOR_SURFACE, border_width=1, border_color=COLOR_BORDER, text_color=COLOR_TEXT_PRIMARY, height=32,
            command=self._load_image_file_dialog
        )
        btn_load_file.pack(side="left", fill="x", expand=True, padx=4)

        btn_cp_img = ctk.CTkButton(
            img_actions, text="Copy Image", font=("Segoe UI", 11),
            fg_color=COLOR_SURFACE, border_width=1, border_color=COLOR_BORDER, text_color=COLOR_TEXT_PRIMARY, height=32,
            command=self._copy_latest_image
        )
        btn_cp_img.pack(side="left", fill="x", expand=True, padx=(4, 0))

        # Right Column: Extracted Local OCR Text & Actions
        right_box = ctk.CTkFrame(container, fg_color=COLOR_CARD, border_width=1, border_color=COLOR_BORDER, corner_radius=8)
        right_box.pack(side="right", fill="both", expand=True)

        r_hdr = ctk.CTkFrame(right_box, fg_color="transparent")
        r_hdr.pack(fill="x", padx=16, pady=(14, 8))
        ctk.CTkLabel(r_hdr, text="EXTRACTED OCR TEXT (ZERO LLM · VERBATIM)", font=("Segoe UI", 12, "bold"), text_color=COLOR_TEXT_PRIMARY).pack(side="left")

        self.ocr_char_badge = ctk.CTkLabel(r_hdr, text="0 chars", font=("Consolas", 10), text_color=COLOR_TEXT_SECONDARY)
        self.ocr_char_badge.pack(side="right")

        self.ocr_text_box = ctk.CTkTextbox(
            right_box, fg_color="#141414", border_color=COLOR_BORDER, font=("Consolas", 11), text_color=COLOR_TEXT_PRIMARY
        )
        self.ocr_text_box.pack(fill="both", expand=True, padx=16, pady=4)

        # Bottom Action Bar
        r_btn_row = ctk.CTkFrame(right_box, fg_color="transparent")
        r_btn_row.pack(fill="x", padx=16, pady=(10, 14))

        btn_cp_text = ctk.CTkButton(
            r_btn_row, text="Copy OCR Text", font=("Segoe UI", 11, "bold"),
            fg_color="#FFFFFF", text_color="#000000", hover_color="#E4E4E7", height=32,
            command=self._copy_ocr_text
        )
        btn_cp_text.pack(side="left", padx=(0, 8))

        btn_re_ocr = ctk.CTkButton(
            r_btn_row, text="Re-Run Local OCR", font=("Segoe UI", 11),
            fg_color=COLOR_SURFACE, border_width=1, border_color=COLOR_BORDER, text_color=COLOR_TEXT_PRIMARY, height=32,
            command=self._rerun_local_ocr
        )
        btn_re_ocr.pack(side="left", padx=(0, 8))

        btn_save_signal = ctk.CTkButton(
            r_btn_row, text="Save to Vault", font=("Segoe UI", 11),
            fg_color=COLOR_SURFACE, border_width=1, border_color=COLOR_BORDER, text_color=COLOR_ACCENT_GREEN, height=32,
            command=self._save_ocr_to_vault
        )
        btn_save_signal.pack(side="left", padx=(0, 8))

        btn_open_img = ctk.CTkButton(
            r_btn_row, text="Open Full Image ↗", font=("Segoe UI", 11),
            fg_color=COLOR_SURFACE, border_width=1, border_color=COLOR_BORDER, text_color=COLOR_TEXT_SECONDARY, height=32,
            command=self._open_full_image_viewer
        )
        btn_open_img.pack(side="left")

    def set_latest_screenshot(self, pil_img: Image.Image, ocr_text: str, duration_ms: float = 0.0):
        """Updates the Screenshot & Local OCR Lab with the latest capture."""
        self.latest_pil_img = pil_img
        self.latest_ocr_text = ocr_text

        # Update thumbnail
        max_w, max_h = 420, 340
        ratio = min(max_w / max(1, pil_img.width), max_h / max(1, pil_img.height))
        thumb_w = max(20, int(pil_img.width * ratio))
        thumb_h = max(20, int(pil_img.height * ratio))
        resized = pil_img.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)

        self.latest_ctk_img = ctk.CTkImage(light_image=resized, dark_image=resized, size=(thumb_w, thumb_h))
        self.img_preview_lbl.configure(image=self.latest_ctk_img, text="")

        # Update text box
        self.ocr_text_box.delete("1.0", "end")
        self.ocr_text_box.insert("1.0", ocr_text)
        self.ocr_time_badge.configure(text=f"{duration_ms} ms (LOCAL)")
        self.ocr_char_badge.configure(text=f"{len(ocr_text)} chars")

        # Automatically switch to OCR workspace if not active
        self._select_workspace("ocr")

    def _copy_latest_image(self):
        if self.latest_pil_img:
            ok = copy_image_to_clipboard(self.latest_pil_img)
            if ok:
                show_toast("Image Copied", "Screenshot copied to Windows clipboard.")

    def _copy_ocr_text(self):
        text = self.ocr_text_box.get("1.0", "end-1c").strip()
        if text:
            pyperclip.copy(text)
            show_toast("Text Copied", f"Copied {len(text)} characters to clipboard.")

    def _rerun_local_ocr(self):
        if self.latest_pil_img:
            t0 = time.time()
            text = extract_text_local_ocr(self.latest_pil_img)
            duration_ms = round((time.time() - t0) * 1000, 1)
            self.ocr_text_box.delete("1.0", "end")
            self.ocr_text_box.insert("1.0", text)
            self.ocr_time_badge.configure(text=f"{duration_ms} ms (LOCAL)")
            self.ocr_char_badge.configure(text=f"{len(text)} chars")

    def _save_ocr_to_vault(self):
        text = self.ocr_text_box.get("1.0", "end-1c").strip()
        if not text:
            return
        payload = json.dumps({
            "content": text,
            "sourceDomain": "desktop_local_ocr",
            "sourceDevice": "desktop"
        }).encode("utf-8")
        req = urllib.request.Request(
            f"{RADAR_BACKEND_URL}/api/clips/ingest",
            data=payload,
            headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=10):
                show_toast("Signal Ingested", "Saved extracted text to RADAR Vault.")
                self.refresh_data()
        except Exception as e:
            logger.error(f"Save OCR error: {e}")

    def _open_full_image_viewer(self):
        if self.latest_pil_img:
            tmp = os.path.join(tempfile.gettempdir(), "radar_latest_snip.png")
            self.latest_pil_img.save(tmp, "PNG")
            os.startfile(tmp)

    def _load_image_file_dialog(self):
        file_path = filedialog.askopenfilename(
            title="Select Screenshot or Job Flyer",
            filetypes=[("Image files", "*.png *.jpg *.jpeg *.webp *.bmp *.gif"), ("All files", "*.*")]
        )
        if file_path and os.path.exists(file_path):
            try:
                img = Image.open(file_path)
                t0 = time.time()
                text = extract_text_local_ocr(img)
                duration_ms = round((time.time() - t0) * 1000, 1)
                self.set_latest_screenshot(img, text, duration_ms)
            except Exception as e:
                logger.error(f"Error loading image file: {e}")

    # ==========================================================================
    # TAB 3: LIVE CLIPBOARD CENTER (DIRECT ACCESS & ROLLING HISTORY)
    # ==========================================================================

    def _setup_clipboard_tab(self):
        container = ctk.CTkFrame(self.tab_clipboard, fg_color="transparent")
        container.pack(fill="both", expand=True, padx=0, pady=0)

        # Top: Active System Clipboard Card
        active_card = ctk.CTkFrame(container, fg_color=COLOR_CARD, border_width=1, border_color=COLOR_BORDER, corner_radius=8)
        active_card.pack(fill="x", padx=0, pady=(0, 12))

        top_r = ctk.CTkFrame(active_card, fg_color="transparent")
        top_r.pack(fill="x", padx=16, pady=(12, 6))

        ctk.CTkLabel(top_r, text="ACTIVE OS CLIPBOARD", font=("Segoe UI", 12, "bold"), text_color=COLOR_TEXT_PRIMARY).pack(side="left")

        # Auto Sync Toggle
        self.sw_auto_clip = ctk.CTkSwitch(
            top_r, text="Auto-Ingest Job Signals", font=("Segoe UI", 11),
            fg_color=COLOR_SURFACE, progress_color=COLOR_ACCENT_RED,
            command=self._toggle_auto_clipboard
        )
        self.sw_auto_clip.pack(side="right")
        self.sw_auto_clip.select()

        self.clip_current_box = ctk.CTkTextbox(
            active_card, height=90, fg_color="#141414", border_color=COLOR_BORDER, font=("Consolas", 11)
        )
        self.clip_current_box.pack(fill="x", padx=16, pady=4)

        # Action row
        act_row = ctk.CTkFrame(active_card, fg_color="transparent")
        act_row.pack(fill="x", padx=16, pady=(6, 12))

        btn_read_now = ctk.CTkButton(
            act_row, text="Read OS Clipboard Now", font=("Segoe UI", 11, "bold"),
            fg_color="#FFFFFF", text_color="#000000", hover_color="#E4E4E7", height=30,
            command=self._read_clipboard_now
        )
        btn_read_now.pack(side="left", padx=(0, 8))

        btn_ingest_clip = ctk.CTkButton(
            act_row, text="Ingest to Vault", font=("Segoe UI", 11),
            fg_color=COLOR_SURFACE, border_width=1, border_color=COLOR_BORDER, text_color=COLOR_ACCENT_GREEN, height=30,
            command=self._ingest_active_clipboard
        )
        btn_ingest_clip.pack(side="left", padx=(0, 8))

        btn_clear_clip = ctk.CTkButton(
            act_row, text="Clear Clipboard", font=("Segoe UI", 11),
            fg_color=COLOR_SURFACE, border_width=1, border_color=COLOR_BORDER, text_color=COLOR_ACCENT_RED, height=30,
            command=self._clear_clipboard
        )
        btn_clear_clip.pack(side="left")

        # Bottom: Rolling Clipboard History Scrollable Deck
        history_frame = ctk.CTkFrame(container, fg_color=COLOR_CARD, border_width=1, border_color=COLOR_BORDER, corner_radius=8)
        history_frame.pack(fill="both", expand=True)

        h_hdr = ctk.CTkFrame(history_frame, fg_color="transparent")
        h_hdr.pack(fill="x", padx=16, pady=(12, 6))
        ctk.CTkLabel(h_hdr, text="RECENT CLIPBOARD HISTORY (1-CLICK RESTORE)", font=("Segoe UI", 12, "bold"), text_color=COLOR_TEXT_PRIMARY).pack(side="left")
        ctk.CTkLabel(h_hdr, text="Click any item to copy back to Windows clipboard", font=("Segoe UI", 10), text_color=COLOR_TEXT_MUTED).pack(side="right")

        self.clip_history_scroll = ctk.CTkScrollableFrame(
            history_frame, fg_color="transparent"
        )
        self.clip_history_scroll.pack(fill="both", expand=True, padx=12, pady=6)

    def _read_clipboard_now(self):
        text = pyperclip.paste()
        self.clip_current_box.delete("1.0", "end")
        self.clip_current_box.insert("1.0", text)
        self.add_clipboard_history_item(text)
        show_toast("Clipboard Refreshed", f"{len(text)} characters read from system.")

    def _ingest_active_clipboard(self):
        text = self.clip_current_box.get("1.0", "end-1c").strip()
        if not text:
            return
        payload = json.dumps({
            "content": text,
            "sourceDomain": "desktop_clipboard_manual",
            "sourceDevice": "desktop"
        }).encode("utf-8")
        req = urllib.request.Request(
            f"{RADAR_BACKEND_URL}/api/clips/ingest",
            data=payload,
            headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=10):
                show_toast("Signal Ingested", "Active clipboard saved to RADAR Vault.")
                self.refresh_data()
        except Exception as e:
            logger.error(f"Ingest clipboard error: {e}")

    def _clear_clipboard(self):
        pyperclip.copy("")
        self.clip_current_box.delete("1.0", "end")
        show_toast("Clipboard Cleared", "Windows clipboard was emptied.")

    def add_clipboard_history_item(self, item_text: str):
        if not item_text or item_text in self.clipboard_history[:2]:
            return
        self.clipboard_history.insert(0, item_text)
        if len(self.clipboard_history) > 20:
            self.clipboard_history = self.clipboard_history[:20]

        # Re-render history list
        for widget in self.clip_history_scroll.winfo_children():
            widget.destroy()

        for idx, item in enumerate(self.clipboard_history):
            row = ctk.CTkFrame(self.clip_history_scroll, fg_color=COLOR_SURFACE, border_width=1, border_color=COLOR_BORDER, corner_radius=6)
            row.pack(fill="x", padx=4, pady=4)

            # Left preview
            preview = item[:140].replace("\n", " ")
            lbl = ctk.CTkLabel(row, text=f"{idx+1}. {preview}", font=("Segoe UI", 11), text_color=COLOR_TEXT_PRIMARY, anchor="w")
            lbl.pack(side="left", padx=10, pady=8, fill="x", expand=True)

            # Copy button
            btn_cp = ctk.CTkButton(
                row, text="Restore", font=("Segoe UI", 10, "bold"),
                fg_color=COLOR_CARD, border_width=1, border_color=COLOR_BORDER, text_color="#FFFFFF", hover_color=COLOR_BORDER,
                height=26, width=70,
                command=lambda t=item: self._restore_clipboard_item(t)
            )
            btn_cp.pack(side="right", padx=8)

    def _restore_clipboard_item(self, text: str):
        pyperclip.copy(text)
        self.clip_current_box.delete("1.0", "end")
        self.clip_current_box.insert("1.0", text)
        show_toast("Restored to Clipboard", f"{len(text)} characters restored to active clipboard.")

    def _toggle_auto_clipboard(self):
        global AUTO_CLIPBOARD_SYNC
        AUTO_CLIPBOARD_SYNC = bool(self.sw_auto_clip.get())
        logger.info(f"Auto clipboard sync: {AUTO_CLIPBOARD_SYNC}")

    # ==========================================================================
    # TAB 4: AUTONOMOUS SCRAPER (LINKEDIN GUEST API + JOBSPY)
    # ==========================================================================

    def _setup_scraper_tab(self):
        ctrl_frame = ctk.CTkFrame(self.tab_scraper, fg_color=COLOR_CARD, border_width=1, border_color=COLOR_BORDER, corner_radius=8)
        ctrl_frame.pack(fill="x", padx=0, pady=(0, 12))

        # Row 1: Inputs
        row1 = ctk.CTkFrame(ctrl_frame, fg_color="transparent")
        row1.pack(fill="x", padx=16, pady=(14, 8))

        ctk.CTkLabel(row1, text="Role / Keywords:", font=("Segoe UI", 11, "bold"), text_color=COLOR_TEXT_SECONDARY).pack(side="left", padx=(0, 6))
        self.scraper_query_entry = ctk.CTkEntry(row1, placeholder_text="e.g. Python Machine Learning Engineer", width=260, height=32, fg_color=COLOR_SURFACE, border_color=COLOR_BORDER)
        self.scraper_query_entry.pack(side="left", padx=(0, 16))
        self.scraper_query_entry.insert(0, "Python Engineer")

        ctk.CTkLabel(row1, text="Location:", font=("Segoe UI", 11, "bold"), text_color=COLOR_TEXT_SECONDARY).pack(side="left", padx=(0, 6))
        self.scraper_loc_entry = ctk.CTkEntry(row1, placeholder_text="e.g. Paris / Remote", width=180, height=32, fg_color=COLOR_SURFACE, border_color=COLOR_BORDER)
        self.scraper_loc_entry.pack(side="left", padx=(0, 16))
        self.scraper_loc_entry.insert(0, "Remote")

        ctk.CTkLabel(row1, text="Results:", font=("Segoe UI", 11, "bold"), text_color=COLOR_TEXT_SECONDARY).pack(side="left", padx=(0, 6))
        self.scraper_count_entry = ctk.CTkEntry(row1, width=60, height=32, fg_color=COLOR_SURFACE, border_color=COLOR_BORDER)
        self.scraper_count_entry.pack(side="left", padx=(0, 16))
        self.scraper_count_entry.insert(0, "15")

        # Row 2: Checkboxes & Launch Button
        row2 = ctk.CTkFrame(ctrl_frame, fg_color="transparent")
        row2.pack(fill="x", padx=16, pady=(0, 14))

        self.cb_li = ctk.CTkCheckBox(row2, text="LinkedIn (Guest API - 0 Proxies)", font=("Segoe UI", 11), fg_color=COLOR_ACCENT_RED, hover_color="#D92D20")
        self.cb_li.pack(side="left", padx=(0, 16))
        self.cb_li.select()

        self.cb_indeed = ctk.CTkCheckBox(row2, text="Indeed (JobSpy)", font=("Segoe UI", 11), fg_color=COLOR_ACCENT_RED, hover_color="#D92D20")
        self.cb_indeed.pack(side="left", padx=(0, 16))
        self.cb_indeed.select()

        self.cb_glassdoor = ctk.CTkCheckBox(row2, text="Glassdoor", font=("Segoe UI", 11), fg_color=COLOR_ACCENT_RED, hover_color="#D92D20")
        self.cb_glassdoor.pack(side="left", padx=(0, 24))

        self.btn_run_scrape = ctk.CTkButton(
            row2,
            text="Launch Autonomous Hunt",
            font=("Segoe UI", 12, "bold"),
            fg_color=COLOR_ACCENT_RED,
            hover_color="#D92D20",
            text_color="#FFFFFF",
            height=34,
            width=200,
            command=self._launch_scraper_hunt
        )
        self.btn_run_scrape.pack(side="right")

        # Progress bar & status
        self.scraper_progress = ctk.CTkProgressBar(ctrl_frame, height=4, fg_color=COLOR_SURFACE, progress_color=COLOR_ACCENT_RED)
        self.scraper_progress.pack(fill="x", padx=16, pady=(0, 8))
        self.scraper_progress.set(0)

        self.scraper_status_lbl = ctk.CTkLabel(ctrl_frame, text="Ready to hunt across platforms.", font=("Segoe UI", 10), text_color=COLOR_TEXT_MUTED)
        self.scraper_status_lbl.pack(anchor="w", padx=16, pady=(0, 8))

        # Results Scrollable Deck
        self.scraper_results_scroll = ctk.CTkScrollableFrame(
            self.tab_scraper, fg_color=COLOR_CARD, border_width=1, border_color=COLOR_BORDER, corner_radius=8
        )
        self.scraper_results_scroll.pack(fill="both", expand=True, padx=0, pady=0)

    def _launch_scraper_hunt(self):
        if self.is_hunting:
            return
        query = self.scraper_query_entry.get().strip() or "Software Engineer"
        loc = self.scraper_loc_entry.get().strip() or "Remote"
        try:
            count = int(self.scraper_count_entry.get().strip() or "15")
        except ValueError:
            count = 15

        sites = []
        if self.cb_li.get():
            sites.append("linkedin")
        if self.cb_indeed.get():
            sites.append("indeed")
        if self.cb_glassdoor.get():
            sites.append("glassdoor")
        if not sites:
            sites = ["linkedin"]

        self.is_hunting = True
        self.btn_run_scrape.configure(state="disabled", text="Hunting in progress...")
        self.scraper_progress.set(0.3)
        self.scraper_status_lbl.configure(text=f"Hunting '{query}' on {', '.join(sites)} via Guest API & JobSpy...")

        for widget in self.scraper_results_scroll.winfo_children():
            widget.destroy()

        threading.Thread(target=self._async_scrape_worker, args=(sites, query, loc, count), daemon=True).start()

    def _async_scrape_worker(self, sites, query, loc, count):
        payload = json.dumps({
            "sites": sites,
            "searchTerm": query,
            "location": loc,
            "resultsWanted": count,
            "isRemote": True
        }).encode("utf-8")

        req = urllib.request.Request(
            f"{RADAR_BACKEND_URL}/api/scraper/hunt",
            data=payload,
            headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=90) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                results = data.get("results", [])
                self.after(0, self._render_scraper_results, results)
        except Exception as e:
            logger.error(f"Scraper error: {e}")
            self.after(0, self._render_scraper_error, str(e))

    def _render_scraper_results(self, results):
        self.is_hunting = False
        self.btn_run_scrape.configure(state="normal", text="Launch Autonomous Hunt")
        self.scraper_progress.set(1.0)
        self.scraper_status_lbl.configure(text=f"Found {len(results)} high-relevance engineering opportunities.")

        if not results:
            ctk.CTkLabel(
                self.scraper_results_scroll,
                text="No jobs found matching criteria. Try broadening keywords or locations.",
                text_color=COLOR_TEXT_MUTED,
                font=("Segoe UI", 12)
            ).pack(padx=20, pady=30)
            return

        for r in results:
            card = ctk.CTkFrame(self.scraper_results_scroll, fg_color=COLOR_SURFACE, border_width=1, border_color=COLOR_BORDER, corner_radius=6)
            card.pack(fill="x", padx=10, pady=6)

            top_row = ctk.CTkFrame(card, fg_color="transparent")
            top_row.pack(fill="x", padx=12, pady=(10, 4))

            title = ctk.CTkLabel(top_row, text=r.get("title", "Role"), font=("Segoe UI", 13, "bold"), text_color="#FFFFFF")
            title.pack(side="left")

            score = r.get("atsFitScore", 80)
            score_badge = ctk.CTkLabel(
                top_row,
                text=f"{score}% ATS FIT",
                font=("Segoe UI", 10, "bold"),
                text_color=COLOR_ACCENT_GREEN if score >= 80 else COLOR_ACCENT_RED,
                fg_color=COLOR_CARD,
                corner_radius=4,
                padx=6,
                pady=2
            )
            score_badge.pack(side="right")

            sub_row = ctk.CTkFrame(card, fg_color="transparent")
            sub_row.pack(fill="x", padx=12, pady=(0, 6))

            co_text = f"{r.get('company', 'Company')} · {r.get('location', 'Remote')} · Source: {r.get('site', 'web').upper()}"
            ctk.CTkLabel(sub_row, text=co_text, font=("Segoe UI", 11), text_color=COLOR_TEXT_SECONDARY).pack(side="left")

            skills = r.get("skills", [])
            if skills:
                sk_row = ctk.CTkFrame(card, fg_color="transparent")
                sk_row.pack(fill="x", padx=12, pady=(0, 8))
                for s in skills[:6]:
                    badge = ctk.CTkLabel(sk_row, text=f"• {s}", font=("Segoe UI", 9), text_color="#E4E4E7", fg_color=COLOR_CARD, corner_radius=3, padx=5, pady=1)
                    badge.pack(side="left", padx=(0, 4))

            btn_row = ctk.CTkFrame(card, fg_color="transparent")
            btn_row.pack(fill="x", padx=12, pady=(0, 10))

            btn_save = ctk.CTkButton(
                btn_row,
                text="Save to Pipeline",
                font=("Segoe UI", 10, "bold"),
                fg_color="#FFFFFF",
                text_color="#000000",
                hover_color="#E4E4E7",
                height=26,
                width=120,
                command=lambda job=r: self._save_scraped_job(job)
            )
            btn_save.pack(side="left", padx=(0, 8))

            if r.get("jobUrl"):
                btn_link = ctk.CTkButton(
                    btn_row,
                    text="Open Link ↗",
                    font=("Segoe UI", 10),
                    fg_color=COLOR_CARD,
                    border_width=1,
                    border_color=COLOR_BORDER,
                    text_color=COLOR_TEXT_PRIMARY,
                    hover_color=COLOR_BORDER,
                    height=26,
                    width=90,
                    command=lambda u=r.get("jobUrl"): webbrowser.open(u)
                )
                btn_link.pack(side="left")

    def _render_scraper_error(self, err_msg):
        self.is_hunting = False
        self.btn_run_scrape.configure(state="normal", text="Launch Autonomous Hunt")
        self.scraper_progress.set(0)
        self.scraper_status_lbl.configure(text=f"Error executing scrape: {err_msg}")

    def _save_scraped_job(self, job):
        payload = json.dumps({"job": job}).encode("utf-8")
        req = urllib.request.Request(
            f"{RADAR_BACKEND_URL}/api/scraper/save-job",
            data=payload,
            headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=10):
                show_toast("Job Saved to RADAR", f"Added '{job.get('title')}' to active pipeline.")
                self.refresh_data()
        except Exception as e:
            logger.error(f"Error saving job: {e}")

    # ==========================================================================
    # TAB 5: ATS RESUME STUDIO (IN-PLACE TAILORING & PDF COMPILE)
    # ==========================================================================

    def _setup_ats_tab(self):
        container = ctk.CTkFrame(self.tab_ats, fg_color="transparent")
        container.pack(fill="both", expand=True, padx=0, pady=0)

        left_pane = ctk.CTkFrame(container, fg_color=COLOR_CARD, border_width=1, border_color=COLOR_BORDER, corner_radius=8, width=540)
        left_pane.pack(side="left", fill="both", expand=True, padx=(0, 10))

        lbl_hdr = ctk.CTkLabel(left_pane, text="YOUR BASE RESUME & TARGET POSITION", font=("Segoe UI", 12, "bold"), text_color=COLOR_TEXT_PRIMARY)
        lbl_hdr.pack(anchor="w", padx=16, pady=(14, 8))

        ctk.CTkLabel(left_pane, text="Target Role Title:", font=("Segoe UI", 11, "bold"), text_color=COLOR_TEXT_SECONDARY).pack(anchor="w", padx=16)
        self.ats_role_entry = ctk.CTkEntry(left_pane, placeholder_text="e.g. Senior Machine Learning Engineer", height=32, fg_color=COLOR_SURFACE, border_color=COLOR_BORDER)
        self.ats_role_entry.pack(fill="x", padx=16, pady=(4, 10))
        self.ats_role_entry.insert(0, "Senior Distributed Systems Engineer")

        ctk.CTkLabel(left_pane, text="Job Description / Requirements:", font=("Segoe UI", 11, "bold"), text_color=COLOR_TEXT_SECONDARY).pack(anchor="w", padx=16)
        self.ats_desc_text = ctk.CTkTextbox(left_pane, height=80, fg_color=COLOR_SURFACE, border_color=COLOR_BORDER, font=("Segoe UI", 11))
        self.ats_desc_text.pack(fill="x", padx=16, pady=(4, 10))
        self.ats_desc_text.insert("1.0", "Looking for expertise in Python, PyTorch, Docker, Kubernetes, FastAPI, microservices, and high-concurrency event-driven architectures.")

        tpl_row = ctk.CTkFrame(left_pane, fg_color="transparent")
        tpl_row.pack(fill="x", padx=16, pady=(0, 4))
        ctk.CTkLabel(tpl_row, text="Base CV Code (LaTeX or Typst):", font=("Segoe UI", 11, "bold"), text_color=COLOR_TEXT_SECONDARY).pack(side="left")

        self.ats_tpl_menu = ctk.CTkOptionMenu(
            tpl_row,
            values=["Jake's Resume (Typst)", "Executive Modern (Typst)", "Academic Classic (LaTeX)"],
            font=("Segoe UI", 10),
            height=24,
            width=175,
            fg_color=COLOR_SURFACE,
            button_color="#27272A",
            command=self._on_ats_template_selected
        )
        self.ats_tpl_menu.set("Jake's Resume (Typst)")
        self.ats_tpl_menu.pack(side="right")

        self.ats_base_cv_text = ctk.CTkTextbox(left_pane, height=220, fg_color="#141414", border_color=COLOR_BORDER, font=("Consolas", 10))
        self.ats_base_cv_text.pack(fill="both", expand=True, padx=16, pady=(4, 10))
        self._on_ats_template_selected("Jake's Resume (Typst)")

        btn_box = ctk.CTkFrame(left_pane, fg_color="transparent")
        btn_box.pack(fill="x", padx=16, pady=(0, 14))

        btn_sum = ctk.CTkButton(
            btn_box, text="⚡ Tailor Summary", font=("Segoe UI", 11, "bold"),
            fg_color=COLOR_SURFACE, border_width=1, border_color=COLOR_BORDER, text_color=COLOR_ACCENT_RED,
            command=lambda: self._execute_tailor_partial("summary")
        )
        btn_sum.pack(side="left", fill="x", expand=True, padx=(0, 4))

        btn_bul = ctk.CTkButton(
            btn_box, text="⚡ Tailor Bullets", font=("Segoe UI", 11, "bold"),
            fg_color=COLOR_SURFACE, border_width=1, border_color=COLOR_BORDER, text_color=COLOR_ACCENT_GREEN,
            command=lambda: self._execute_tailor_partial("bullets")
        )
        btn_bul.pack(side="left", fill="x", expand=True, padx=4)

        btn_sk = ctk.CTkButton(
            btn_box, text="⚡ Inject Skills", font=("Segoe UI", 11, "bold"),
            fg_color=COLOR_SURFACE, border_width=1, border_color=COLOR_BORDER, text_color="#38BDF8",
            command=lambda: self._execute_tailor_partial("skills")
        )
        btn_sk.pack(side="left", fill="x", expand=True, padx=(4, 0))

        right_pane = ctk.CTkFrame(container, fg_color=COLOR_CARD, border_width=1, border_color=COLOR_BORDER, corner_radius=8)
        right_pane.pack(side="right", fill="both", expand=True)

        top_r = ctk.CTkFrame(right_pane, fg_color="transparent")
        top_r.pack(fill="x", padx=16, pady=(14, 8))

        ctk.CTkLabel(top_r, text="TAILORED RESULT & LIVE COMPILER", font=("Segoe UI", 12, "bold"), text_color=COLOR_TEXT_PRIMARY).pack(side="left")
        self.ats_fit_badge = ctk.CTkLabel(top_r, text="92% ATS FIT", font=("Segoe UI", 10, "bold"), text_color=COLOR_ACCENT_GREEN, fg_color=COLOR_SURFACE, corner_radius=4, padx=6, pady=2)
        self.ats_fit_badge.pack(side="right")

        self.ats_output_text = ctk.CTkTextbox(right_pane, height=440, fg_color="#141414", border_color=COLOR_BORDER, font=("Consolas", 10))
        self.ats_output_text.pack(fill="both", expand=True, padx=16, pady=(4, 10))

        r_btn_box = ctk.CTkFrame(right_pane, fg_color="transparent")
        r_btn_box.pack(fill="x", padx=16, pady=(0, 14))

        self.btn_compile_pdf = ctk.CTkButton(
            r_btn_box, text="Recompile & View PDF ↗", font=("Segoe UI", 11, "bold"),
            fg_color="#FFFFFF", text_color="#000000", hover_color="#E4E4E7", height=32,
            command=self._compile_and_open_pdf
        )
        self.btn_compile_pdf.pack(side="left", padx=(0, 8))

        btn_copy_code = ctk.CTkButton(
            r_btn_box, text="Copy Markup", font=("Segoe UI", 11),
            fg_color=COLOR_SURFACE, border_width=1, border_color=COLOR_BORDER, text_color=COLOR_TEXT_PRIMARY, height=32,
            command=lambda: pyperclip.copy(self.ats_output_text.get("1.0", "end-1c"))
        )
        btn_copy_code.pack(side="left")

    def _execute_tailor_partial(self, mode: str):
        role = self.ats_role_entry.get().strip() or "Senior Software Engineer"
        desc = self.ats_desc_text.get("1.0", "end-1c").strip()
        base_cv = self.ats_base_cv_text.get("1.0", "end-1c").strip()

        threading.Thread(target=self._async_tailor_worker, args=(base_cv, role, desc, mode), daemon=True).start()

    def _async_tailor_worker(self, cv_text, role, desc, mode):
        payload = json.dumps({
            "cvText": cv_text,
            "jobTitle": role,
            "jobDescription": desc,
            "mode": mode
        }).encode("utf-8")

        req = urllib.request.Request(
            f"{RADAR_BACKEND_URL}/api/cv/tailor-partial",
            data=payload,
            headers={"Content-Type": "application/json"}
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                new_code = data.get("code", "")
                score = data.get("atsFitScore", 90)
                self.after(0, self._render_tailored_output, new_code, score)
        except Exception as e:
            logger.error(f"Tailoring error: {e}")

    def _render_tailored_output(self, code: str, score: int):
        self.ats_output_text.delete("1.0", "end")
        self.ats_output_text.insert("1.0", code)
        self.ats_fit_badge.configure(text=f"{score}% ATS FIT")
        show_toast("ATS CV Tailored", f"In-place optimization complete ({score}% fit score).")

    def _compile_and_open_pdf(self):
        code = self.ats_output_text.get("1.0", "end-1c").strip() or self.ats_base_cv_text.get("1.0", "end-1c").strip()
        if not code:
            return

        payload = json.dumps({"code": code, "format": "typst" if not code.startswith("\\doc") else "latex"}).encode("utf-8")
        req = urllib.request.Request(
            f"{RADAR_BACKEND_URL}/api/cv/compile",
            data=payload,
            headers={"Content-Type": "application/json"}
        )

        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                b64 = data.get("pdfBase64")
                if b64:
                    pdf_bytes = base64.b64decode(b64)
                    tmp_pdf = os.path.join(tempfile.gettempdir(), "radar_compiled_resume.pdf")
                    with open(tmp_pdf, "wb") as f:
                        f.write(pdf_bytes)
                    webbrowser.open(f"file://{tmp_pdf}")
        except Exception as e:
            logger.error(f"Compile PDF error: {e}")

    def _on_ats_template_selected(self, tpl_name: str):
        if not hasattr(self, "ats_base_cv_text"):
            return

        typst_jake = """#set page(paper: "a4", margin: 1.5cm)
#set text(font: "Linux Libertine", size: 10pt)
#align(center)[
  = Radar Operator
  operator@radar.local · +1 (555) 019-2834 · San Francisco, CA · github.com/operator
]

== Technical Skills
- *Languages*: Python, Go, TypeScript, Rust, SQL, Bash
- *Frameworks & Tools*: PyTorch, FastAPI, React, Docker, Kubernetes, Ray, Kafka, Redis

== Experience
=== Senior Distributed Systems Engineer -- Cloud Infrastructure Labs (2022 - Present)
- Engineered scalable microservice endpoints serving 50M+ requests daily with 99.99% uptime.
- Optimized async I/O database clustering reducing p99 response latencies by 38%.
- Orchestrated multi-region container deployments using Kubernetes, Terraform, and GitOps.

=== Software Engineer -- Core Systems (2020 - 2022)
- Implemented high-throughput telemetry ingestion pipelines in Python and FastAPI.
- Authored integration test suites ensuring 92% coverage across distributed components.

== Education
=== B.S. in Computer Science & Engineering -- Engineering Institute (2016 - 2020)
"""

        typst_modern = """#set page(paper: "a4", margin: 1.6cm)
#align(left)[
  #text(18pt, weight: "bold")[Radar Operator]\\
  #text(11pt, fill: rgb("#FF3B30"), weight: "bold")[Senior AI Infrastructure Engineer]\\
  #text(9pt, fill: luma(100))[operator@radar.local · +1 (555) 019-2834 · San Francisco, CA]
]

#line(length: 100%, stroke: 0.5pt + luma(180))

== Executive Summary
Strategic infrastructure engineer with 6+ years designing mission-critical AI pipelines, distributed data storage, and low-latency cloud backends.

== Core Competencies
- *Cloud & Compute*: Kubernetes, Docker, AWS, GCP, Terraform, Linux
- *AI & Backend*: Python, PyTorch, FastAPI, Vector DBs, Redis, PostgreSQL

== Professional Experience
=== Lead Infrastructure Engineer -- AI Labs (2021 - Present)
- Architected distributed GPU inference cluster reducing model evaluation cycle times by 45%.
- Lowered infrastructure operating expenditures through automated autoscaling policies.
"""

        latex_academic = r"""\documentclass[10pt,a4paper]{article}
\usepackage[margin=1in]{geometry}
\usepackage{hyperref}
\usepackage{enumitem}

\begin{document}
\begin{center}
    {\LARGE \textbf{Radar Operator}} \\ \vspace{2pt}
    \href{mailto:operator@radar.local}{operator@radar.local} $\vert$ +1 (555) 019-2834 $\vert$ San Francisco, CA
\end{center}

\section*{Professional Experience}
\textbf{Senior Systems Engineer} \hfill 2021 -- Present \\
\textit{AI Systems Labs}
\begin{itemize}[noitemsep,topsep=2pt]
    \item Developed high-throughput microservices using Python, FastAPI, and Docker.
    \item Scaled Kubernetes clusters handling real-time telemetry streaming.
\end{itemize}

\section*{Technical Skills}
\textbf{Languages}: Python, TypeScript, Go, SQL \\
\textbf{Tools}: Docker, Kubernetes, PyTorch, PostgreSQL, Redis

\section*{Education}
\textbf{Institute of Technology} \hfill 2016 -- 2020 \\
Bachelor of Science in Computer Science

\end{document}
"""
        self.ats_base_cv_text.delete("1.0", "end")
        if "Modern" in tpl_name:
            self.ats_base_cv_text.insert("1.0", typst_modern)
        elif "Classic" in tpl_name or "LaTeX" in tpl_name:
            self.ats_base_cv_text.insert("1.0", latex_academic)
        else:
            self.ats_base_cv_text.insert("1.0", typst_jake)

    # ==========================================================================
    # DATA SYNCHRONIZATION
    # ==========================================================================

    def refresh_data(self):
        """Fetches offers and clips from the local backend silently."""
        threading.Thread(target=self._initial_fetch, daemon=True).start()

    def _initial_fetch(self):
        try:
            # 1. Fetch Offers
            req_o = urllib.request.Request(f"{RADAR_BACKEND_URL}/api/offers", headers={"User-Agent": "RADAR-Native"})
            with urllib.request.urlopen(req_o, timeout=5) as resp:
                self.offers = json.loads(resp.read().decode("utf-8"))

            # 2. Fetch Clips
            req_c = urllib.request.Request(f"{RADAR_BACKEND_URL}/api/clips", headers={"User-Agent": "RADAR-Native"})
            with urllib.request.urlopen(req_c, timeout=5) as resp:
                self.clips = json.loads(resp.read().decode("utf-8"))

            self.after(0, self._apply_data_to_ui)
        except Exception as e:
            logger.debug(f"Data fetch notice: {e}")

    def _apply_data_to_ui(self):
        total = len(self.offers)
        applied = sum(1 for o in self.offers if o.get("status") == "applied")
        interviews = sum(1 for o in self.offers if o.get("status") == "interview")
        offers_won = sum(1 for o in self.offers if o.get("status") == "offer")

        # 1. Update KPI Deck
        if "TOTAL TRACKED" in self.kpi_cards:
            self.kpi_cards["TOTAL TRACKED"].configure(text=str(total))
        if "APPLICATIONS" in self.kpi_cards:
            self.kpi_cards["APPLICATIONS"].configure(text=str(applied))
        if "INTERVIEWS" in self.kpi_cards:
            self.kpi_cards["INTERVIEWS"].configure(text=str(interviews))
        if "OFFERS SECURED" in self.kpi_cards:
            self.kpi_cards["OFFERS SECURED"].configure(text=str(offers_won))

        saved = sum(1 for o in self.offers if o.get("status") in ["saved", "to_apply", "ready"])
        funnel_counts = [saved, applied, interviews, offers_won]

        email_c = sum(1 for o in self.offers if o.get("channel") == "email")
        dm_c = sum(1 for o in self.offers if o.get("channel") == "direct_contact")
        ext_c = sum(1 for o in self.offers if o.get("channel") == "external")
        channel_counts = [email_c, dm_c, ext_c]

        self._render_charts(funnel_counts, channel_counts)

        # 2. Render Recent Positions in Hub
        if hasattr(self, "hub_recent_scroll"):
            for w in self.hub_recent_scroll.winfo_children():
                w.destroy()

            recent_slice = self.offers[:6]
            if not recent_slice:
                ctk.CTkLabel(self.hub_recent_scroll, text="No opportunities tracked yet.", font=("Segoe UI", 11), text_color=COLOR_TEXT_MUTED).pack(pady=15)
            else:
                for o in recent_slice:
                    row = ctk.CTkFrame(self.hub_recent_scroll, fg_color=COLOR_SURFACE, height=36, corner_radius=5, border_width=1, border_color=COLOR_BORDER)
                    row.pack(fill="x", pady=2)
                    row.pack_propagate(False)

                    initial = (o.get("company") or "•")[:1].upper()
                    ctk.CTkLabel(row, text=initial, font=("Segoe UI", 9, "bold"), text_color=COLOR_ACCENT_RED, fg_color="#27272A", width=20, height=20, corner_radius=3).pack(side="left", padx=8)
                    ctk.CTkLabel(row, text=o.get("title", "Role"), font=("Segoe UI", 11, "bold"), text_color="#FFFFFF").pack(side="left", padx=(0, 6))
                    ctk.CTkLabel(row, text=f"·  {o.get('company', '')}", font=("Segoe UI", 10), text_color=COLOR_TEXT_SECONDARY).pack(side="left")

                    btn_open = ctk.CTkButton(
                        row,
                        text="View →",
                        font=("Segoe UI", 9, "bold"),
                        fg_color=COLOR_CARD,
                        border_width=1,
                        border_color=COLOR_BORDER,
                        text_color=COLOR_TEXT_PRIMARY,
                        hover_color="#27272A",
                        height=22,
                        width=55,
                        command=lambda opt=o: (self._select_workspace("offers"), self._select_offer(opt))
                    )
                    btn_open.pack(side="right", padx=8)

                    stage_text = (o.get("status") or "SAVED").upper()
                    stage_lbl = ctk.CTkLabel(row, text=stage_text, font=("Segoe UI", 8, "bold"), text_color=COLOR_ACCENT_GREEN if stage_text == "APPLIED" else COLOR_TEXT_MUTED)
                    stage_lbl.pack(side="right", padx=6)

        # 3. Update Offers & Pipeline List
        if hasattr(self, "offers_list_scroll"):
            self._render_offers_list()

    def _launch_screen_snip(self):
        snipper = SnippingTool(on_snip_completed=handle_snip_completed)
        snipper.start()


# ==============================================================================
# GLOBAL HOTKEYS & SYSTEM TRAY
# ==============================================================================

def setup_global_hotkeys(app: RadarNativeApp):
    """Registers Alt+S (Screen Snip) and Alt+R (Focus HUD)."""
    def on_snip():
        app.after(0, app._launch_screen_snip)

    def on_focus():
        app.after(0, lambda: (app.deiconify(), app.lift(), app.focus_force()))

    hotkeys = keyboard.GlobalHotKeys({
        "<alt>+s": on_snip,
        "<alt>+r": on_focus,
    })
    hotkeys.daemon = True
    hotkeys.start()


def run_system_tray(app: RadarNativeApp):
    """Runs system tray icon in background daemon thread."""
    global TRAY_ICON

    def on_show_hud(icon, item):
        app.after(0, lambda: (app.deiconify(), app.lift(), app.focus_force()))

    def on_snip_tray(icon, item):
        app.after(0, app._launch_screen_snip)

    def on_open_web(icon, item):
        webbrowser.open("http://127.0.0.1:8003")

    def on_quit_all(icon, item):
        icon.stop()
        if BACKEND_PROCESS:
            try:
                BACKEND_PROCESS.terminate()
            except Exception:
                pass
        app.after(0, app.destroy)
        os._exit(0)

    menu = pystray.Menu(
        pystray.MenuItem("Open RADAR Cockpit [Alt+R]", on_show_hud, default=True),
        pystray.MenuItem("Capture Screen Snip [Alt+S]", on_snip_tray),
        pystray.MenuItem("Open Web App in Browser", on_open_web),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Quit RADAR", on_quit_all)
    )

    tray_img = create_tray_icon_image()
    TRAY_ICON = pystray.Icon("RADAR", tray_img, "RADAR Native Cockpit", menu)
    TRAY_ICON.run()


# ==============================================================================
# MAIN ENTRYPOINT
# ==============================================================================

def main():
    global MAIN_APP

    logger.info("Initializing RADAR Native Desktop Application...")

    # 1. Ensure backend is active
    ensure_backend_running()

    # 2. Start Background Clipboard Listener
    clip_listener = ClipboardListener(RADAR_BACKEND_URL)
    clip_listener.start()

    # 3. Create CustomTkinter Main HUD
    app = RadarNativeApp()
    MAIN_APP = app

    # 4. Register Global Hotkeys
    try:
        setup_global_hotkeys(app)
    except Exception as e:
        logger.warning(f"Global hotkey setup notice: {e}")

    # 5. Start System Tray
    threading.Thread(target=run_system_tray, args=(app,), daemon=True).start()

    # 6. Run native GUI loop
    try:
        app.mainloop()
    finally:
        if BACKEND_PROCESS:
            try:
                BACKEND_PROCESS.terminate()
            except Exception:
                pass


if __name__ == "__main__":
    main()
