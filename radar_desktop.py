#!/usr/bin/env python3
"""
RADAR Native Desktop Application & Intelligence Studio
Built with CustomTkinter and embedded Matplotlib vector charts.
Stark monochrome dark HUD design matching the RADAR Web Application.
- Tab 1: Executive Intelligence Hub (KPI metrics, Pipeline Funnel & Channel Donut charts)
- Tab 2: Autonomous Scraper (LinkedIn Guest API + JobSpy with live progress and results table)
- Tab 3: ATS Resume Studio (LaTeX/Typst in-place tailoring: Summary, Bullets, Skills, PDF compile)
- Tab 4: Signal & Clipboard Vault (Clipboard intelligence, OCR snips, direct conversions)
- Hotkey [Alt + S]: Transparent Screen Snip & Instant OCR Ingestion
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
from typing import List, Dict, Any, Optional

import customtkinter as ctk
from PIL import Image, ImageDraw, ImageGrab
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
COLOR_TEXT_PRIMARY = "#FFFFFF"
COLOR_TEXT_SECONDARY = "#A1A1AA"
COLOR_TEXT_MUTED = "#71717A"
COLOR_ACCENT_RED = "#FF3B30"
COLOR_ACCENT_GREEN = "#4ADE80"


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
        logger.debug(f"Toast notice: {e}")


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
                if MAIN_APP:
                    MAIN_APP.after(0, MAIN_APP.refresh_data)
    except Exception as e:
        logger.error(f"Failed to post snip OCR: {e}")


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
                            self.handle_clipboard(content.strip())
            except Exception as e:
                logger.debug(f"Clipboard read notice: {e}")
            time.sleep(1.2)

    def handle_clipboard(self, text: str):
        is_job_or_opp = bool(
            re_search := any(
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


# ==============================================================================
# MAIN NATIVE APPLICATION WINDOW (CustomTkinter)
# ==============================================================================

class RadarNativeApp(ctk.CTk):
    """
    Stark monochrome Native HUD built with CustomTkinter and embedded Matplotlib charts.
    """

    def __init__(self):
        super().__init__()

        self.title("RADAR // Signal Intelligence & Career Pipeline HUD")
        self.geometry("1240x820")
        self.minsize(1050, 720)
        self.configure(fg_color=COLOR_BG)

        # In-memory state
        self.offers: List[Dict[str, Any]] = []
        self.clips: List[Dict[str, Any]] = []
        self.is_hunting = False

        self._build_header()
        self._build_tabs()

        # Start initial data fetch
        threading.Thread(target=self._initial_fetch, daemon=True).start()

    def _build_header(self):
        """Top Header Bar with Brand, Live Status, and Tactical Actions."""
        header_frame = ctk.CTkFrame(self, fg_color=COLOR_CARD, corner_radius=0, height=64)
        header_frame.pack(fill="x", side="top", padx=0, pady=0)

        # Left: Brand Logo & Title
        left_box = ctk.CTkFrame(header_frame, fg_color="transparent")
        left_box.pack(side="left", padx=20, pady=12)

        beacon = ctk.CTkLabel(
            left_box, text="●", font=("Segoe UI", 16, "bold"), text_color=COLOR_ACCENT_RED
        )
        beacon.pack(side="left", padx=(0, 8))

        brand_label = ctk.CTkLabel(
            left_box, text="RADAR", font=("Segoe UI", 18, "bold"), text_color=COLOR_TEXT_PRIMARY
        )
        brand_label.pack(side="left")

        sub_label = ctk.CTkLabel(
            left_box, text="  // NATIVE HUD · 127.0.0.1:8003", font=("Consolas", 11), text_color=COLOR_TEXT_MUTED
        )
        sub_label.pack(side="left")

        # Right: Action Buttons
        right_box = ctk.CTkFrame(header_frame, fg_color="transparent")
        right_box.pack(side="right", padx=20, pady=12)

        btn_snip = ctk.CTkButton(
            right_box,
            text="[Alt + S] Screen Snip",
            font=("Segoe UI", 11, "bold"),
            fg_color=COLOR_SURFACE,
            hover_color=COLOR_BORDER,
            text_color=COLOR_TEXT_PRIMARY,
            border_width=1,
            border_color=COLOR_BORDER,
            height=32,
            width=140,
            command=self._launch_screen_snip
        )
        btn_snip.pack(side="left", padx=6)

        btn_refresh = ctk.CTkButton(
            right_box,
            text="Refresh Data",
            font=("Segoe UI", 11, "bold"),
            fg_color=COLOR_SURFACE,
            hover_color=COLOR_BORDER,
            text_color=COLOR_TEXT_PRIMARY,
            border_width=1,
            border_color=COLOR_BORDER,
            height=32,
            width=100,
            command=self.refresh_data
        )
        btn_refresh.pack(side="left", padx=6)

        btn_web = ctk.CTkButton(
            right_box,
            text="Open Web App ↗",
            font=("Segoe UI", 11, "bold"),
            fg_color=COLOR_TEXT_PRIMARY,
            hover_color="#E4E4E7",
            text_color="#000000",
            height=32,
            width=120,
            command=lambda: webbrowser.open("http://127.0.0.1:8003")
        )
        btn_web.pack(side="left", padx=6)

    def _build_tabs(self):
        """Builds modern rounded Tabview container."""
        self.tabview = ctk.CTkTabview(
            self,
            fg_color=COLOR_BG,
            segmented_button_fg_color=COLOR_CARD,
            segmented_button_selected_color=COLOR_SURFACE,
            segmented_button_selected_hover_color=COLOR_BORDER,
            segmented_button_unselected_color=COLOR_CARD,
            segmented_button_unselected_hover_color=COLOR_SURFACE,
            text_color=COLOR_TEXT_PRIMARY,
            corner_radius=8
        )
        self.tabview.pack(fill="both", expand=True, padx=20, pady=(10, 20))

        # 4 Workspaces
        self.tab_hub = self.tabview.add("Intelligence Hub")
        self.tab_scraper = self.tabview.add("Autonomous Scraper")
        self.tab_ats = self.tabview.add("ATS Resume Studio")
        self.tab_vault = self.tabview.add("Signal & Clipboard Vault")

        self._setup_hub_tab()
        self._setup_scraper_tab()
        self._setup_ats_tab()
        self._setup_vault_tab()

    # ==========================================================================
    # TAB 1: INTELLIGENCE HUB (METRIC DECK & EMBEDDED MATPLOTLIB GRAPHS)
    # ==========================================================================

    def _setup_hub_tab(self):
        # 1. Metric Deck Row
        self.metric_frame = ctk.CTkFrame(self.tab_hub, fg_color="transparent")
        self.metric_frame.pack(fill="x", padx=0, pady=(0, 16))

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

            lbl_v = ctk.CTkLabel(card, text=val, font=("Segoe UI", 26, "bold"), text_color=COLOR_TEXT_PRIMARY)
            lbl_v.pack(anchor="w", padx=16, pady=(0, 2))

            lbl_s = ctk.CTkLabel(card, text=sub, font=("Segoe UI", 9), text_color=COLOR_TEXT_MUTED)
            lbl_s.pack(anchor="w", padx=16, pady=(0, 12))

            self.kpi_cards[title] = lbl_v

        # 2. Charts Container Frame
        self.charts_frame = ctk.CTkFrame(self.tab_hub, fg_color=COLOR_CARD, border_width=1, border_color=COLOR_BORDER, corner_radius=8)
        self.charts_frame.pack(fill="both", expand=True, padx=0, pady=0)

        # Matplotlib Figure with 2 subplots (Funnel & Channel Donut)
        self.fig = Figure(figsize=(10, 4.2), facecolor=COLOR_CARD)
        self.ax_funnel = self.fig.add_subplot(121)
        self.ax_channels = self.fig.add_subplot(122)

        self.canvas = FigureCanvasTkAgg(self.fig, master=self.charts_frame)
        self.canvas.get_tk_widget().pack(fill="both", expand=True, padx=12, pady=12)

        self._render_charts([0, 0, 0, 0], [1, 1, 1])

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
    # TAB 2: AUTONOMOUS SCRAPER (LINKEDIN GUEST API + JOBSPY)
    # ==========================================================================

    def _setup_scraper_tab(self):
        # 1. Search Controls Box
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

        # 2. Results Scrollable Deck
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

        # Clear previous cards
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

            # Skills
            skills = r.get("skills", [])
            if skills:
                sk_row = ctk.CTkFrame(card, fg_color="transparent")
                sk_row.pack(fill="x", padx=12, pady=(0, 8))
                for s in skills[:6]:
                    badge = ctk.CTkLabel(sk_row, text=f"• {s}", font=("Segoe UI", 9), text_color="#E4E4E7", fg_color=COLOR_CARD, corner_radius=3, padx=5, pady=1)
                    badge.pack(side="left", padx=(0, 4))

            # Action bar
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
            with urllib.request.urlopen(req, timeout=10) as resp:
                show_toast("Job Saved to RADAR", f"Added '{job.get('title')}' to active pipeline.")
                self.refresh_data()
        except Exception as e:
            logger.error(f"Error saving job: {e}")

    # ==========================================================================
    # TAB 3: ATS RESUME STUDIO (IN-PLACE TAILORING & PDF COMPILE)
    # ==========================================================================

    def _setup_ats_tab(self):
        container = ctk.CTkFrame(self.tab_ats, fg_color="transparent")
        container.pack(fill="both", expand=True, padx=0, pady=0)

        # Left Column: Inputs & In-Place Action Buttons
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

        ctk.CTkLabel(left_pane, text="Base CV Code (LaTeX or Typst):", font=("Segoe UI", 11, "bold"), text_color=COLOR_TEXT_SECONDARY).pack(anchor="w", padx=16)
        self.ats_base_cv_text = ctk.CTkTextbox(left_pane, height=220, fg_color="#141414", border_color=COLOR_BORDER, font=("Consolas", 10))
        self.ats_base_cv_text.pack(fill="both", expand=True, padx=16, pady=(4, 10))
        sample_typst = """#set page(paper: "a4", margin: 1.5cm)
#align(center)[
  = Radar Operator
  operator@radar.local · +1 (555) 019-2834 · San Francisco, CA
]

== Professional Summary
Generalist software engineer experienced in cloud backends.

== Technical Skills
- *Languages*: Python, TypeScript, SQL
- *Frameworks*: FastAPI, React, Docker

== Experience
=== Software Engineer -- Engineering Labs (2022 - Present)
- Engineered scalable microservice endpoints.
- Maintained database clustering and automated tests.
"""
        self.ats_base_cv_text.insert("1.0", sample_typst)

        # In-Place Tailoring Buttons
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

        # Right Column: Output Code & Live PDF Actions
        right_pane = ctk.CTkFrame(container, fg_color=COLOR_CARD, border_width=1, border_color=COLOR_BORDER, corner_radius=8)
        right_pane.pack(side="right", fill="both", expand=True)

        top_r = ctk.CTkFrame(right_pane, fg_color="transparent")
        top_r.pack(fill="x", padx=16, pady=(14, 8))

        ctk.CTkLabel(top_r, text="TAILORED RESULT & LIVE COMPILER", font=("Segoe UI", 12, "bold"), text_color=COLOR_TEXT_PRIMARY).pack(side="left")
        self.ats_fit_badge = ctk.CTkLabel(top_r, text="92% ATS FIT", font=("Segoe UI", 10, "bold"), text_color=COLOR_ACCENT_GREEN, fg_color=COLOR_SURFACE, corner_radius=4, padx=6, pady=2)
        self.ats_fit_badge.pack(side="right")

        self.ats_output_text = ctk.CTkTextbox(right_pane, height=440, fg_color="#141414", border_color=COLOR_BORDER, font=("Consolas", 10))
        self.ats_output_text.pack(fill="both", expand=True, padx=16, pady=(4, 10))

        # Bottom Action Bar
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

    # ==========================================================================
    # TAB 4: SIGNAL & CLIPBOARD VAULT
    # ==========================================================================

    def _setup_vault_tab(self):
        # Header Controls
        v_top = ctk.CTkFrame(self.tab_vault, fg_color="transparent")
        v_top.pack(fill="x", padx=0, pady=(0, 10))

        ctk.CTkLabel(v_top, text="CAPTURED SIGNALS, REELS & OCR SNIPS", font=("Segoe UI", 12, "bold"), text_color=COLOR_TEXT_PRIMARY).pack(side="left")

        # Auto clipboard toggle
        self.sw_auto_clip = ctk.CTkSwitch(
            v_top, text="Auto-Ingest Clipboard", font=("Segoe UI", 11),
            fg_color=COLOR_SURFACE, progress_color=COLOR_ACCENT_RED,
            command=self._toggle_auto_clipboard
        )
        self.sw_auto_clip.pack(side="right")
        self.sw_auto_clip.select()

        # Scrollable list of clips
        self.vault_scroll = ctk.CTkScrollableFrame(
            self.tab_vault, fg_color=COLOR_CARD, border_width=1, border_color=COLOR_BORDER, corner_radius=8
        )
        self.vault_scroll.pack(fill="both", expand=True, padx=0, pady=0)

    def _toggle_auto_clipboard(self):
        global AUTO_CLIPBOARD_SYNC
        AUTO_CLIPBOARD_SYNC = bool(self.sw_auto_clip.get())
        logger.info(f"Auto clipboard sync: {AUTO_CLIPBOARD_SYNC}")

    def _render_vault_items(self, clips):
        for widget in self.vault_scroll.winfo_children():
            widget.destroy()

        if not clips:
            ctk.CTkLabel(
                self.vault_scroll,
                text="Signal Vault is empty. Copy links or press [Alt + S] to snip content.",
                text_color=COLOR_TEXT_MUTED,
                font=("Segoe UI", 12)
            ).pack(padx=20, pady=30)
            return

        for clip in clips:
            card = ctk.CTkFrame(self.vault_scroll, fg_color=COLOR_SURFACE, border_width=1, border_color=COLOR_BORDER, corner_radius=6)
            card.pack(fill="x", padx=10, pady=6)

            r1 = ctk.CTkFrame(card, fg_color="transparent")
            r1.pack(fill="x", padx=12, pady=(10, 4))

            t_lbl = ctk.CTkLabel(r1, text=clip.get("title", "Captured Signal"), font=("Segoe UI", 12, "bold"), text_color="#FFFFFF")
            t_lbl.pack(side="left")

            t_type = clip.get("contentType", "note").replace("_", " ").upper()
            badge = ctk.CTkLabel(r1, text=t_type, font=("Segoe UI", 9, "bold"), text_color=COLOR_TEXT_MUTED, fg_color=COLOR_CARD, corner_radius=3, padx=5, pady=1)
            badge.pack(side="right")

            body_preview = (clip.get("content") or clip.get("extractedText") or "")[:180].replace("\n", " ")
            ctk.CTkLabel(card, text=body_preview, font=("Segoe UI", 11), text_color=COLOR_TEXT_SECONDARY, wraplength=900, justify="left").pack(anchor="w", padx=12, pady=(0, 8))

            # Action Bar
            r2 = ctk.CTkFrame(card, fg_color="transparent")
            r2.pack(fill="x", padx=12, pady=(0, 10))

            btn_cp = ctk.CTkButton(
                r2, text="Copy Text", font=("Segoe UI", 10),
                fg_color=COLOR_CARD, border_width=1, border_color=COLOR_BORDER, text_color=COLOR_TEXT_PRIMARY,
                height=24, width=80,
                command=lambda text=clip.get("content"): pyperclip.copy(text)
            )
            btn_cp.pack(side="left", padx=(0, 6))

            btn_del = ctk.CTkButton(
                r2, text="Delete", font=("Segoe UI", 10),
                fg_color=COLOR_CARD, border_width=1, border_color=COLOR_BORDER, text_color=COLOR_ACCENT_RED,
                height=24, width=65,
                command=lambda cid=clip.get("id"): self._delete_clip(cid)
            )
            btn_del.pack(side="left")

    def _delete_clip(self, clip_id):
        req = urllib.request.Request(
            f"{RADAR_BACKEND_URL}/api/clips/{clip_id}",
            method="DELETE"
        )
        try:
            with urllib.request.urlopen(req, timeout=8):
                self.refresh_data()
        except Exception as e:
            logger.error(f"Error deleting clip: {e}")

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
        # Update KPI metrics
        total = len(self.offers)
        applied = sum(1 for o in self.offers if o.get("status") == "applied")
        interviews = sum(1 for o in self.offers if o.get("status") == "interview")
        offers_won = sum(1 for o in self.offers if o.get("status") == "offer")

        if "TOTAL TRACKED" in self.kpi_cards:
            self.kpi_cards["TOTAL TRACKED"].configure(text=str(total))
        if "APPLICATIONS" in self.kpi_cards:
            self.kpi_cards["APPLICATIONS"].configure(text=str(applied))
        if "INTERVIEWS" in self.kpi_cards:
            self.kpi_cards["INTERVIEWS"].configure(text=str(interviews))
        if "OFFERS SECURED" in self.kpi_cards:
            self.kpi_cards["OFFERS SECURED"].configure(text=str(offers_won))

        # Re-render charts
        saved = sum(1 for o in self.offers if o.get("status") in ["saved", "to_apply", "ready"])
        funnel_counts = [saved, applied, interviews, offers_won]

        email_c = sum(1 for o in self.offers if o.get("channel") == "email")
        dm_c = sum(1 for o in self.offers if o.get("channel") == "direct_contact")
        ext_c = sum(1 for o in self.offers if o.get("channel") == "external")
        channel_counts = [email_c, dm_c, ext_c]

        self._render_charts(funnel_counts, channel_counts)
        self._render_vault_items(self.clips)

    def _launch_screen_snip(self):
        snipper = SnippingTool(on_snip_completed=process_snip_image)
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
        pystray.MenuItem("Open RADAR Native HUD [Alt+R]", on_show_hud, default=True),
        pystray.MenuItem("Capture Screen Snip [Alt+S]", on_snip_tray),
        pystray.MenuItem("Open Web App in Browser", on_open_web),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Quit RADAR", on_quit_all)
    )

    tray_img = create_tray_icon_image()
    TRAY_ICON = pystray.Icon("RADAR", tray_img, "RADAR Native HUD", menu)
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
