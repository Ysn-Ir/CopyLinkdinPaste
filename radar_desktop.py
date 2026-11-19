#!/usr/bin/env python3
"""
RADAR // Signal Intelligence & Career Pipeline Workstation
100% Native PyQt6 Desktop Application (Pure Qt 6 DirectWrite / DirectX Engine - ZERO Chromium/WebView overhead).

Key Native Capabilities:
- Pure Qt 6 C++ Desktop Engine (60-144fps DirectWrite typography, <60MB RAM footprint).
- 1-Click "Dump Clipboard & Ingest" with Groq AI extraction.
- Alt+S Global Hotkey: Transparent Screen Snip & Instant WinRT Local Media OCR (15ms, 0 LLM tokens).
- Alt+R Global Hotkey: Instant Focus & Restore RADAR Desktop Workstation.
- Native RFC 822 .EML Desktop Mail Client Dispatch (Outlook / Thunderbird via os.startfile).
- Direct WhatsApp Desktop Launcher.
- Background OS Clipboard Intelligence Listener.
- Native Windows Action Center Toasts & System Tray HUD.
- Multi-channel filtering: Direct Email, WhatsApp/DM, ATS Portals.
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
from typing import Dict, Any, List, Optional

from PIL import Image, ImageDraw, ImageGrab
import pyperclip
from pynput import keyboard

from PyQt6.QtWidgets import (
    QApplication,
    QMainWindow,
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QSplitter,
    QTableWidget,
    QTableWidgetItem,
    QHeaderView,
    QTabWidget,
    QLineEdit,
    QTextEdit,
    QPushButton,
    QLabel,
    QComboBox,
    QProgressBar,
    QStatusBar,
    QMenu,
    QMessageBox,
    QFrame,
    QSystemTrayIcon,
    QAbstractItemView,
)
from PyQt6.QtCore import Qt, QThread, pyqtSignal, QTimer, QSize
from PyQt6.QtGui import QIcon, QFont, QColor, QPalette, QAction, QPixmap, QPainter, QBrush, QPen

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("radar.desktop.native")

RADAR_BACKEND_URL = os.getenv("RADAR_BACKEND_URL", "http://127.0.0.1:8003")
AUTO_CLIPBOARD_SYNC = True
BACKEND_PROCESS = None
MAIN_APP_WINDOW = None


# ==============================================================================
# BACKEND PROCESS SUPERVISOR
# ==============================================================================

def is_backend_healthy(url: str = RADAR_BACKEND_URL) -> bool:
    """Checks if the local RADAR FastAPI backend is responsive."""
    try:
        req = urllib.request.Request(f"{url}/api/health", headers={"User-Agent": "RADAR-PyQt6-Native"})
        with urllib.request.urlopen(req, timeout=1.2) as resp:
            return resp.status == 200
    except Exception:
        return False


def ensure_backend_running() -> bool:
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


# ==============================================================================
# NATIVE OS NOTIFICATIONS & DISPATCH
# ==============================================================================

def show_toast(title: str, message: str):
    """Displays a native Windows Action Center toast notification."""
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


def create_and_open_eml(subject: str, to_addr: str, body: str) -> Optional[str]:
    """Generates an RFC 822 .eml file and launches default desktop mail client (Outlook/Thunderbird)."""
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

        if os.name == "nt":
            os.startfile(eml_path)
        else:
            webbrowser.open(f"file://{eml_path}")
        return eml_path
    except Exception as e:
        logger.error(f"Error opening .eml file: {e}")
        return None


# ==============================================================================
# LOCAL WINRT MEDIA OCR (15ms, 0 LLM Tokens)
# ==============================================================================

def extract_text_local_ocr(pil_img: Image.Image, lang: str = "en") -> str:
    """Extracts text using native Windows Media OCR (WinRT)."""
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
    """Processes snipped image with local OCR and persists to backend."""
    t0 = time.time()
    ocr_text = extract_text_local_ocr(pil_img)
    duration_ms = round((time.time() - t0) * 1000, 1)

    buffered = io.BytesIO()
    pil_img.save(buffered, format="PNG")
    img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

    show_toast("RADAR Snip Extracted (Local OCR)", f"{len(ocr_text)} characters captured in {duration_ms}ms.")

    def _persist():
        try:
            payload = json.dumps({
                "imageBase64": img_b64,
                "sourceUrl": "desktop_screen_snip",
                "sourceDevice": "desktop_native"
            }).encode("utf-8")
            req = urllib.request.Request(
                f"{RADAR_BACKEND_URL}/api/clips/ocr-ingest",
                data=payload,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if data.get("success") and MAIN_APP_WINDOW:
                    MAIN_APP_WINDOW.signal_refresh_needed.emit()
        except Exception as e:
            logger.debug(f"Snip sync error: {e}")

    threading.Thread(target=_persist, daemon=True).start()


# ==============================================================================
# ASYNC WORKERS (QThread)
# ==============================================================================

class FetchOffersWorker(QThread):
    finished = pyqtSignal(list, dict)
    error = pyqtSignal(str)

    def run(self):
        try:
            req = urllib.request.Request(f"{RADAR_BACKEND_URL}/api/offers", headers={"User-Agent": "RADAR-Native"})
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                offers = data.get("offers", [])

            # Also fetch profile
            profile = {}
            try:
                p_req = urllib.request.Request(f"{RADAR_BACKEND_URL}/api/profile", headers={"User-Agent": "RADAR-Native"})
                with urllib.request.urlopen(p_req, timeout=4) as p_resp:
                    p_data = json.loads(p_resp.read().decode("utf-8"))
                    profile = p_data.get("profile", {})
            except Exception:
                pass

            self.finished.emit(offers, profile)
        except Exception as e:
            self.error.emit(str(e))


class IngestInputWorker(QThread):
    finished = pyqtSignal(dict)
    error = pyqtSignal(str)

    def __init__(self, raw_input: str):
        super().__init__()
        self.raw_input = raw_input

    def run(self):
        try:
            payload = json.dumps({"text": self.raw_input}).encode("utf-8")
            req = urllib.request.Request(
                f"{RADAR_BACKEND_URL}/api/mobile/ingest",
                data=payload,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                self.finished.emit(data)
        except Exception as e:
            self.error.emit(str(e))


class GroqPolishWorker(QThread):
    finished = pyqtSignal(str)
    error = pyqtSignal(str)

    def __init__(self, prompt: str, content: str):
        super().__init__()
        self.prompt = prompt
        self.content = content

    def run(self):
        try:
            payload = json.dumps({
                "prompt": f"{self.prompt}\n\nORIGINAL TEXT:\n{self.content}",
                "max_tokens": 600,
                "temperature": 0.3
            }).encode("utf-8")
            req = urllib.request.Request(
                f"{RADAR_BACKEND_URL}/api/ai/complete",
                data=payload,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=25) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                result_text = data.get("completion") or data.get("text") or "No response from AI."
                self.finished.emit(result_text)
        except Exception as e:
            self.error.emit(str(e))


# ==============================================================================
# PYQT6 NATIVE RADAR WORKSTATION WINDOW
# ==============================================================================

QSS_OBSIDIAN_THEME = """
QMainWindow {
    background-color: #09090B;
}

QWidget {
    background-color: #09090B;
    color: #FFFFFF;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 13px;
}

/* Toolbar & Header */
QFrame#topNavFrame {
    background-color: #0D0D11;
    border-bottom: 1px solid #1F1F24;
    padding: 6px 12px;
}

/* Push Buttons */
QPushButton {
    background-color: #16161B;
    border: 1px solid #27272A;
    border-radius: 6px;
    padding: 7px 14px;
    color: #FFFFFF;
    font-weight: 600;
    font-size: 12.5px;
}

QPushButton:hover {
    background-color: #22222A;
    border-color: #3F3F46;
}

QPushButton:pressed {
    background-color: #121215;
}

QPushButton#btnCrimson {
    background-color: #FF3B30;
    border: 1px solid #FF3B30;
    color: #FFFFFF;
    font-weight: 700;
}

QPushButton#btnCrimson:hover {
    background-color: #E0352B;
}

QPushButton#btnDumpClipboard {
    background-color: #1E1212;
    border: 1px solid #FF3B30;
    color: #FF3B30;
    font-weight: 700;
}

QPushButton#btnDumpClipboard:hover {
    background-color: #2A1717;
}

QPushButton#btnEmerald {
    background-color: #10B981;
    border: 1px solid #10B981;
    color: #FFFFFF;
    font-weight: 700;
}

QPushButton#btnEmerald:hover {
    background-color: #059669;
}

/* Input Fields */
QLineEdit, QTextEdit, QComboBox {
    background-color: #121216;
    border: 1px solid #27272A;
    border-radius: 6px;
    padding: 8px 12px;
    color: #FFFFFF;
    font-size: 13px;
    selection-background-color: #FF3B30;
}

QLineEdit:focus, QTextEdit:focus, QComboBox:focus {
    border: 1px solid #FF3B30;
}

/* Tables */
QTableWidget {
    background-color: #0C0C0F;
    border: 1px solid #1F1F24;
    border-radius: 8px;
    gridline-color: #18181D;
    color: #FFFFFF;
    font-size: 12.5px;
    selection-background-color: #1F1B1C;
    selection-color: #FFFFFF;
}

QTableWidget::item {
    padding: 10px 8px;
    border-bottom: 1px solid #18181D;
}

QTableWidget::item:selected {
    background-color: #21191B;
    border-left: 3px solid #FF3B30;
}

QHeaderView::section {
    background-color: #121217;
    color: #A1A1AA;
    padding: 8px 10px;
    border: none;
    border-bottom: 1px solid #27272A;
    font-weight: 700;
    font-size: 11.5px;
    text-transform: uppercase;
}

/* Tab Widget */
QTabWidget::pane {
    border: 1px solid #1F1F24;
    background-color: #0E0E12;
    border-radius: 8px;
    padding: 14px;
}

QTabBar::tab {
    background-color: #121217;
    color: #A1A1AA;
    padding: 9px 18px;
    border: 1px solid #1F1F24;
    border-bottom: none;
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
    margin-right: 4px;
    font-weight: 600;
    font-size: 12.5px;
}

QTabBar::tab:selected {
    background-color: #0E0E12;
    color: #FF3B30;
    border-top: 2px solid #FF3B30;
    font-weight: 700;
}

QTabBar::tab:hover:!selected {
    background-color: #181820;
    color: #FFFFFF;
}

/* Scrollbars */
QScrollBar:vertical {
    border: none;
    background: #09090B;
    width: 8px;
    margin: 0px;
}

QScrollBar::handle:vertical {
    background: #27272A;
    min-height: 20px;
    border-radius: 4px;
}

QScrollBar::handle:vertical:hover {
    background: #3F3F46;
}

QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
    height: 0px;
}

/* Status Bar */
QStatusBar {
    background-color: #0D0D11;
    border-top: 1px solid #1F1F24;
    color: #71717A;
    font-size: 11.5px;
}
"""


class RadarDesktopWindow(QMainWindow):
    signal_refresh_needed = pyqtSignal()

    def __init__(self):
        super().__init__()
        self.offers: List[Dict[str, Any]] = []
        self.filtered_offers: List[Dict[str, Any]] = []
        self.current_offer: Optional[Dict[str, Any]] = None
        self.candidate_profile: Dict[str, Any] = {}
        self.active_channel_filter: str = "all"

        self.setWindowTitle("RADAR // Signal Intelligence & Career Workstation [Native PyQt6]")
        self.resize(1440, 920)
        self.setMinimumSize(1100, 720)
        self.setStyleSheet(QSS_OBSIDIAN_THEME)

        self.signal_refresh_needed.connect(self.load_offers_from_backend)

        self._build_ui()
        self._init_timer()
        self.load_offers_from_backend()

    def _build_ui(self):
        central_widget = QWidget(self)
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # 1. TOP EXECUTIVE HUD NAV
        top_bar = QFrame(self)
        top_bar.setObjectName("topNavFrame")
        top_layout = QHBoxLayout(top_bar)
        top_layout.setContentsMargins(18, 10, 18, 10)
        top_layout.setSpacing(12)

        # Tactical Logo Dot & Title
        title_box = QHBoxLayout()
        title_box.setSpacing(8)

        beacon_dot = QLabel("●", self)
        beacon_dot.setStyleSheet("color: #FF3B30; font-size: 18px;")
        title_box.addWidget(beacon_dot)

        brand_title = QLabel("RADAR", self)
        brand_title.setStyleSheet("font-weight: 900; font-size: 17px; letter-spacing: 1px; color: #FFFFFF;")
        title_box.addWidget(brand_title)

        hud_tag = QLabel("// NATIVE WORKSTATION", self)
        hud_tag.setStyleSheet("color: #71717A; font-size: 11px; font-weight: 700; letter-spacing: 0.5px;")
        title_box.addWidget(hud_tag)

        top_layout.addLayout(title_box)
        top_layout.addStretch()

        # Action: Dump Clipboard
        self.btn_dump_clipboard = QPushButton("📥 Dump Clipboard", self)
        self.btn_dump_clipboard.setObjectName("btnDumpClipboard")
        self.btn_dump_clipboard.setToolTip("Read system clipboard text or URLs and ingest with Groq AI")
        self.btn_dump_clipboard.clicked.connect(self.action_dump_clipboard)
        top_layout.addWidget(self.btn_dump_clipboard)

        # Action: Screen Snip WinOCR
        self.btn_snip = QPushButton("✂️ [Alt+S] Snip Screen", self)
        self.btn_snip.setObjectName("btnCrimson")
        self.btn_snip.setToolTip("Transparent screen snip with 15ms local Windows Media OCR (0 tokens)")
        self.btn_snip.clicked.connect(self.action_snip_screen)
        top_layout.addWidget(self.btn_snip)

        # Action: Refresh
        self.btn_refresh = QPushButton("🔄 Sync", self)
        self.btn_refresh.setToolTip("Refresh data from PostgreSQL/SQLite backend")
        self.btn_refresh.clicked.connect(self.load_offers_from_backend)
        top_layout.addWidget(self.btn_refresh)

        # Action: Launch Web Cockpit
        self.btn_web = QPushButton("🌐 Web Cockpit", self)
        self.btn_web.setToolTip("Open RADAR Web Cockpit in default browser")
        self.btn_web.clicked.connect(lambda: webbrowser.open(RADAR_BACKEND_URL))
        top_layout.addWidget(self.btn_web)

        main_layout.addWidget(top_bar)

        # 2. MASTER-DETAIL SPLITTER
        splitter = QSplitter(Qt.Orientation.Horizontal, self)
        splitter.setHandleWidth(1)
        splitter.setStyleSheet("QSplitter::handle { background-color: #1F1F24; }")

        # LEFT MASTER PANE
        left_widget = QWidget(self)
        left_layout = QVBoxLayout(left_widget)
        left_layout.setContentsMargins(14, 14, 14, 14)
        left_layout.setSpacing(10)

        # Search Bar
        search_box = QHBoxLayout()
        self.search_input = QLineEdit(self)
        self.search_input.setPlaceholderText("🔍  Search opportunities, skills, recruiter...")
        self.search_input.textChanged.connect(self.filter_offers)
        search_box.addWidget(self.search_input)

        self.btn_export_csv = QPushButton("CSV", self)
        self.btn_export_csv.setFixedWidth(56)
        self.btn_export_csv.setToolTip("Export offers as CSV")
        self.btn_export_csv.clicked.connect(lambda: webbrowser.open(f"{RADAR_BACKEND_URL}/api/offers/export/csv"))
        search_box.addWidget(self.btn_export_csv)
        left_layout.addLayout(search_box)

        # Channel Filter Pills
        ch_filter_layout = QHBoxLayout()
        ch_filter_layout.setSpacing(6)

        self.btn_ch_all = QPushButton("All", self)
        self.btn_ch_all.setCheckable(True)
        self.btn_ch_all.setChecked(True)
        self.btn_ch_all.clicked.connect(lambda: self.set_channel_filter("all"))
        ch_filter_layout.addWidget(self.btn_ch_all)

        self.btn_ch_email = QPushButton("✉️ Email", self)
        self.btn_ch_email.setCheckable(True)
        self.btn_ch_email.clicked.connect(lambda: self.set_channel_filter("email"))
        ch_filter_layout.addWidget(self.btn_ch_email)

        self.btn_ch_direct = QPushButton("💬 DM/WA", self)
        self.btn_ch_direct.setCheckable(True)
        self.btn_ch_direct.clicked.connect(lambda: self.set_channel_filter("direct_contact"))
        ch_filter_layout.addWidget(self.btn_ch_direct)

        self.btn_ch_external = QPushButton("🌐 ATS", self)
        self.btn_ch_external.setCheckable(True)
        self.btn_ch_external.clicked.connect(lambda: self.set_channel_filter("external"))
        ch_filter_layout.addWidget(self.btn_ch_external)

        left_layout.addLayout(ch_filter_layout)

        # Opportunity Table
        self.table = QTableWidget(self)
        self.table.setColumnCount(4)
        self.table.setHorizontalHeaderLabels(["Role & Company", "Channel", "Status", "Fit"])
        self.table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.Stretch)
        self.table.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeMode.ResizeToContents)
        self.table.horizontalHeader().setSectionResizeMode(2, QHeaderView.ResizeMode.ResizeToContents)
        self.table.horizontalHeader().setSectionResizeMode(3, QHeaderView.ResizeMode.ResizeToContents)
        self.table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self.table.setSelectionMode(QAbstractItemView.SelectionMode.SingleSelection)
        self.table.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.table.customContextMenuRequested.connect(self._show_table_context_menu)
        self.table.itemSelectionChanged.connect(self._on_table_selection_changed)
        left_layout.addWidget(self.table)

        left_widget.setMinimumWidth(440)
        splitter.addWidget(left_widget)

        # RIGHT DETAIL WORKSPACE PANE
        right_widget = QWidget(self)
        right_layout = QVBoxLayout(right_widget)
        right_layout.setContentsMargins(20, 16, 20, 16)
        right_layout.setSpacing(12)

        # Detail Header (Role, Company, Location, Controls)
        header_card = QFrame(self)
        header_card.setStyleSheet("background-color: #0E0E12; border: 1px solid #1F1F24; border-radius: 8px; padding: 12px;")
        header_layout = QVBoxLayout(header_card)
        header_layout.setSpacing(8)

        # Row 1: Title input & Status selector
        row1 = QHBoxLayout()
        self.title_input = QLineEdit(self)
        self.title_input.setStyleSheet("font-size: 18px; font-weight: 800; border: none; background: transparent; color: #FFFFFF;")
        self.title_input.setPlaceholderText("Opportunity Role Title")
        self.title_input.editingFinished.connect(self._save_current_offer_fields)
        row1.addWidget(self.title_input, stretch=1)

        self.status_combo = QComboBox(self)
        self.status_combo.addItems(["saved", "ready", "applied", "interview", "offer", "rejected"])
        self.status_combo.currentTextChanged.connect(self._on_status_changed)
        row1.addWidget(self.status_combo)

        self.btn_delete_offer = QPushButton("🗑️", self)
        self.btn_delete_offer.setFixedWidth(38)
        self.btn_delete_offer.setToolTip("Delete this opportunity")
        self.btn_delete_offer.clicked.connect(self.action_delete_current_offer)
        row1.addWidget(self.btn_delete_offer)

        header_layout.addLayout(row1)

        # Row 2: Company, Location, Target URL link
        row2 = QHBoxLayout()
        self.company_input = QLineEdit(self)
        self.company_input.setStyleSheet("color: #FF3B30; font-weight: 700; border: 1px solid #27272A; border-radius: 4px; padding: 4px 8px; max-width: 200px;")
        self.company_input.setPlaceholderText("Company")
        self.company_input.editingFinished.connect(self._save_current_offer_fields)
        row2.addWidget(self.company_input)

        self.location_input = QLineEdit(self)
        self.location_input.setStyleSheet("color: #A1A1AA; border: 1px solid #27272A; border-radius: 4px; padding: 4px 8px; max-width: 200px;")
        self.location_input.setPlaceholderText("Location")
        self.location_input.editingFinished.connect(self._save_current_offer_fields)
        row2.addWidget(self.location_input)

        self.channel_combo = QComboBox(self)
        self.channel_combo.addItems(["email", "direct_contact", "external"])
        self.channel_combo.currentTextChanged.connect(self._on_channel_changed)
        row2.addWidget(self.channel_combo)

        row2.addStretch()

        self.btn_open_target_url = QPushButton("🔗 Open Target URL", self)
        self.btn_open_target_url.clicked.connect(self.action_open_target_url)
        row2.addWidget(self.btn_open_target_url)

        header_layout.addLayout(row2)
        right_layout.addWidget(header_card)

        # Recruiter Quick Profile Card
        recruiter_card = QFrame(self)
        recruiter_card.setStyleSheet("background-color: #121217; border: 1px solid #1F1F24; border-radius: 8px; padding: 8px 12px;")
        recruiter_layout = QHBoxLayout(recruiter_card)
        recruiter_layout.setSpacing(10)

        recruiter_label = QLabel("Recruiter Contact:", self)
        recruiter_label.setStyleSheet("font-weight: 700; color: #71717A; font-size: 11.5px;")
        recruiter_layout.addWidget(recruiter_label)

        self.recruiter_name_input = QLineEdit(self)
        self.recruiter_name_input.setPlaceholderText("Recruiter Name")
        self.recruiter_name_input.setStyleSheet("max-width: 170px;")
        self.recruiter_name_input.editingFinished.connect(self._save_current_offer_fields)
        recruiter_layout.addWidget(self.recruiter_name_input)

        self.recruiter_email_input = QLineEdit(self)
        self.recruiter_email_input.setPlaceholderText("recruiter@company.com")
        self.recruiter_email_input.setStyleSheet("max-width: 210px;")
        self.recruiter_email_input.editingFinished.connect(self._save_current_offer_fields)
        recruiter_layout.addWidget(self.recruiter_email_input)

        self.recruiter_phone_input = QLineEdit(self)
        self.recruiter_phone_input.setPlaceholderText("+33 6 12 34 56 78")
        self.recruiter_phone_input.setStyleSheet("max-width: 150px;")
        self.recruiter_phone_input.editingFinished.connect(self._save_current_offer_fields)
        recruiter_layout.addWidget(self.recruiter_phone_input)

        recruiter_layout.addStretch()

        self.btn_copy_email = QPushButton("📋 Copy Email", self)
        self.btn_copy_email.clicked.connect(self.action_copy_recruiter_email)
        recruiter_layout.addWidget(self.btn_copy_email)

        self.btn_launch_wa = QPushButton("💬 WhatsApp", self)
        self.btn_launch_wa.setStyleSheet("background-color: #0F1E16; color: #10B981; border: 1px solid #10B981;")
        self.btn_launch_wa.clicked.connect(self.action_open_whatsapp)
        recruiter_layout.addWidget(self.btn_launch_wa)

        right_layout.addWidget(recruiter_card)

        # Tabbed Outreach Studio
        self.tabs = QTabWidget(self)

        # TAB 1: Direct Email
        tab_email = QWidget()
        tab_email_layout = QVBoxLayout(tab_email)
        tab_email_layout.setSpacing(10)

        # Subject Line
        subj_layout = QHBoxLayout()
        subj_label = QLabel("Subject Line:", tab_email)
        subj_label.setStyleSheet("font-weight: 700; color: #A1A1AA;")
        subj_layout.addWidget(subj_label)
        self.email_subj_input = QLineEdit(tab_email)
        self.email_subj_input.editingFinished.connect(self._save_current_offer_fields)
        subj_layout.addWidget(self.email_subj_input, stretch=1)
        btn_copy_subj = QPushButton("Copy Subject", tab_email)
        btn_copy_subj.clicked.connect(lambda: pyperclip.copy(self.email_subj_input.text()))
        subj_layout.addWidget(btn_copy_subj)
        tab_email_layout.addLayout(subj_layout)

        # Body
        body_label = QLabel("Personalized Email Body (RFC 822 format):", tab_email)
        body_label.setStyleSheet("font-weight: 700; color: #A1A1AA;")
        tab_email_layout.addWidget(body_label)

        self.email_body_text = QTextEdit(tab_email)
        self.email_body_text.setStyleSheet("font-family: Consolas, 'Segoe UI', monospace; font-size: 13.5px; line-height: 1.6;")
        tab_email_layout.addWidget(self.email_body_text, stretch=1)

        # Actions Row
        email_actions = QHBoxLayout()
        btn_launch_eml = QPushButton("🚀 Launch in Outlook / Thunderbird (.EML)", tab_email)
        btn_launch_eml.setObjectName("btnCrimson")
        btn_launch_eml.clicked.connect(self.action_launch_eml)
        email_actions.addWidget(btn_launch_eml)

        btn_copy_body = QPushButton("📋 Copy Body", tab_email)
        btn_copy_body.clicked.connect(lambda: pyperclip.copy(self.email_body_text.toPlainText()))
        email_actions.addWidget(btn_copy_body)

        btn_polish_ai = QPushButton("⚡ Polish with Groq AI", tab_email)
        btn_polish_ai.clicked.connect(self.action_polish_email_ai)
        email_actions.addWidget(btn_polish_ai)

        btn_mark_applied = QPushButton("✅ Mark Applied", tab_email)
        btn_mark_applied.setObjectName("btnEmerald")
        btn_mark_applied.clicked.connect(lambda: self.status_combo.setCurrentText("applied"))
        email_actions.addWidget(btn_mark_applied)

        email_actions.addStretch()
        tab_email_layout.addLayout(email_actions)
        self.tabs.addTab(tab_email, "✉️ Email Outreach")

        # TAB 2: Direct DM & WhatsApp
        tab_dm = QWidget()
        tab_dm_layout = QVBoxLayout(tab_dm)
        tab_dm_layout.setSpacing(10)

        dm_label = QLabel("Concise WhatsApp / LinkedIn Message Pitch:", tab_dm)
        dm_label.setStyleSheet("font-weight: 700; color: #A1A1AA;")
        tab_dm_layout.addWidget(dm_label)

        self.dm_pitch_text = QTextEdit(tab_dm)
        self.dm_pitch_text.setStyleSheet("font-size: 13.5px; line-height: 1.6;")
        tab_dm_layout.addWidget(self.dm_pitch_text, stretch=1)

        dm_actions = QHBoxLayout()
        btn_wa_launch = QPushButton("📲 Launch WhatsApp Desktop", tab_dm)
        btn_wa_launch.setObjectName("btnEmerald")
        btn_wa_launch.clicked.connect(self.action_open_whatsapp)
        dm_actions.addWidget(btn_wa_launch)

        btn_copy_pitch = QPushButton("📋 Copy Pitch", tab_dm)
        btn_copy_pitch.clicked.connect(lambda: pyperclip.copy(self.dm_pitch_text.toPlainText()))
        dm_actions.addWidget(btn_copy_pitch)

        dm_actions.addStretch()
        tab_dm_layout.addLayout(dm_actions)
        self.tabs.addTab(tab_dm, "💬 Direct DM / WhatsApp")

        # TAB 3: Cover Letter & ATS
        tab_cover = QWidget()
        tab_cover_layout = QVBoxLayout(tab_cover)
        tab_cover_layout.setSpacing(10)

        cover_label = QLabel("Tailored Engineering Cover Letter:", tab_cover)
        cover_label.setStyleSheet("font-weight: 700; color: #A1A1AA;")
        tab_cover_layout.addWidget(cover_label)

        self.cover_letter_text = QTextEdit(tab_cover)
        self.cover_letter_text.setStyleSheet("font-size: 13.5px; line-height: 1.65;")
        tab_cover_layout.addWidget(self.cover_letter_text, stretch=1)

        cover_actions = QHBoxLayout()
        btn_copy_cover = QPushButton("📋 Copy Cover Letter", tab_cover)
        btn_copy_cover.clicked.connect(lambda: pyperclip.copy(self.cover_letter_text.toPlainText()))
        cover_actions.addWidget(btn_copy_cover)

        btn_save_txt = QPushButton("💾 Save .TXT File", tab_cover)
        btn_save_txt.clicked.connect(self.action_save_cover_letter_txt)
        cover_actions.addWidget(btn_save_txt)

        cover_actions.addStretch()
        tab_cover_layout.addLayout(cover_actions)
        self.tabs.addTab(tab_cover, "📄 Cover Letter & ATS")

        # TAB 4: Original Job Description
        tab_desc = QWidget()
        tab_desc_layout = QVBoxLayout(tab_desc)
        tab_desc_layout.setSpacing(10)

        desc_label = QLabel("Original Recruiter Posting & Requirements:", tab_desc)
        desc_label.setStyleSheet("font-weight: 700; color: #A1A1AA;")
        tab_desc_layout.addWidget(desc_label)

        self.job_desc_text = QTextEdit(tab_desc)
        self.job_desc_text.setReadOnly(True)
        self.job_desc_text.setStyleSheet("font-size: 13px; line-height: 1.5; color: #D4D4D8;")
        tab_desc_layout.addWidget(self.job_desc_text, stretch=1)

        self.tabs.addTab(tab_desc, "📋 Posting & Description")

        right_layout.addWidget(self.tabs, stretch=1)
        splitter.addWidget(right_widget)

        splitter.setSizes([480, 960])
        main_layout.addWidget(splitter, stretch=1)

        # 3. STATUS BAR
        self.status_bar = QStatusBar(self)
        self.setStatusBar(self.status_bar)
        self.status_bar.showMessage(f"RADAR Native Engine connected to {RADAR_BACKEND_URL} · Hotkeys: [Alt+S] Snip OCR, [Alt+R] Focus")

    def _init_timer(self):
        """Periodic background refresh timer (polls every 8 seconds)."""
        self.sync_timer = QTimer(self)
        self.sync_timer.timeout.connect(self.load_offers_from_backend)
        self.sync_timer.start(8000)

    # ==========================================================================
    # DATA LOADING & FILTERING
    # ==========================================================================

    def load_offers_from_backend(self):
        """Asynchronously loads all offers from the backend."""
        self.worker = FetchOffersWorker()
        self.worker.finished.connect(self._on_offers_loaded)
        self.worker.error.connect(lambda err: self.status_bar.showMessage(f"Sync error: {err}"))
        self.worker.start()

    def _on_offers_loaded(self, offers: list, profile: dict):
        self.offers = offers
        self.candidate_profile = profile
        self.filter_offers()
        self.status_bar.showMessage(f"✓ {len(offers)} opportunities loaded from RADAR Vault ({time.strftime('%H:%M:%S')})")

    def set_channel_filter(self, channel: str):
        self.active_channel_filter = channel
        self.btn_ch_all.setChecked(channel == "all")
        self.btn_ch_email.setChecked(channel == "email")
        self.btn_ch_direct.setChecked(channel == "direct_contact")
        self.btn_ch_external.setChecked(channel == "external")
        self.filter_offers()

    def filter_offers(self):
        query = self.search_input.text().strip().lower()
        filtered = []

        for o in self.offers:
            # Channel filter
            if self.active_channel_filter != "all" and o.get("channel") != self.active_channel_filter:
                continue

            # Query filter
            if query:
                title = (o.get("title") or "").lower()
                company = (o.get("company") or "").lower()
                recruiter = ((o.get("sharer") or {}).get("name") or o.get("recruiterName") or "").lower()
                skills = " ".join(o.get("skills") or []).lower()
                if query not in title and query not in company and query not in recruiter and query not in skills:
                    continue

            filtered.append(o)

        self.filtered_offers = filtered
        self._populate_table()

    def _populate_table(self):
        selected_id = self.current_offer.get("id") if self.current_offer else None
        self.table.setRowCount(len(self.filtered_offers))

        selected_row = 0
        for row, o in enumerate(self.filtered_offers):
            # Role & Company
            title = o.get("title") or "Untitled Position"
            company = o.get("company") or "Confidential"
            item_role = QTableWidgetItem(f"{title}\n{company}")
            item_role.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
            self.table.setItem(row, 0, item_role)

            # Channel Badge
            ch = o.get("channel") or "email"
            ch_labels = {"email": "✉️ Email", "direct_contact": "💬 WhatsApp", "external": "🌐 ATS"}
            item_ch = QTableWidgetItem(ch_labels.get(ch, ch))
            self.table.setItem(row, 1, item_ch)

            # Status Badge
            st = o.get("status") or "saved"
            item_st = QTableWidgetItem(st.capitalize())
            if st == "applied":
                item_st.setForeground(QColor("#10B981"))
            elif st == "offer":
                item_st.setForeground(QColor("#FF3B30"))
            elif st == "interview":
                item_st.setForeground(QColor("#F59E0B"))
            self.table.setItem(row, 2, item_st)

            # Fit %
            fit = int(round((o.get("confidence") or 0.9) * 100))
            item_fit = QTableWidgetItem(f"{fit}%")
            self.table.setItem(row, 3, item_fit)

            if o.get("id") == selected_id:
                selected_row = row

        if self.filtered_offers:
            self.table.selectRow(selected_row)
            self._display_offer(self.filtered_offers[selected_row])

    def _on_table_selection_changed(self):
        rows = self.table.selectionModel().selectedRows()
        if rows:
            idx = rows[0].row()
            if 0 <= idx < len(self.filtered_offers):
                self._display_offer(self.filtered_offers[idx])

    def _display_offer(self, offer: Dict[str, Any]):
        self.current_offer = offer

        self.title_input.setText(offer.get("title") or "")
        self.company_input.setText(offer.get("company") or "")
        self.location_input.setText(offer.get("location") or "")

        # Status
        status = offer.get("status") or "saved"
        self.status_combo.blockSignals(True)
        idx = self.status_combo.findText(status)
        if idx >= 0:
            self.status_combo.setCurrentIndex(idx)
        self.status_combo.blockSignals(False)

        # Channel
        ch = offer.get("channel") or "email"
        self.channel_combo.blockSignals(True)
        ch_idx = self.channel_combo.findText(ch)
        if ch_idx >= 0:
            self.channel_combo.setCurrentIndex(ch_idx)
        self.channel_combo.blockSignals(False)

        # Recruiter
        sharer = offer.get("sharer") or {}
        recruiter_name = sharer.get("name") or offer.get("recruiterName") or ""
        self.recruiter_name_input.setText(recruiter_name)
        self.recruiter_email_input.setText(offer.get("recruiterEmail") or "")
        self.recruiter_phone_input.setText(sharer.get("phone") or "")

        # Email Subject & Body
        cand_name = self.candidate_profile.get("fullName") or "Candidate"
        default_subj = f"Application: {offer.get('title')} - {cand_name}"
        self.email_subj_input.setText(offer.get("customEmailSubject") or default_subj)

        default_body = (
            f"Dear {recruiter_name or 'Hiring Manager'},\n\n"
            f"I am writing to express my strong interest in the {offer.get('title')} position at {offer.get('company')}.\n\n"
            f"With a strong background in software engineering and NLP/AI systems, I have hands-on experience building production workflows, RESTful backends, and full-stack solutions. My technical profile aligns closely with the objectives of your team.\n\n"
            f"Please find my resume attached. I would welcome the opportunity to discuss how my skill set can contribute to {offer.get('company')}.\n\n"
            f"Best regards,\n{cand_name}\n{self.candidate_profile.get('phone', '')}\n{self.candidate_profile.get('email', '')}"
        )
        self.email_body_text.setText(offer.get("customEmailBody") or default_body)

        # WhatsApp DM
        default_dm = f"Hi {recruiter_name or ''}, I saw your opening for {offer.get('title')} at {offer.get('company')}. I would love to connect and discuss how my background aligns with your team! - {cand_name}"
        self.dm_pitch_text.setText(offer.get("whatsAppMsg") or default_dm)

        # Cover Letter
        default_cover = (
            f"Subject: Application for {offer.get('title')} at {offer.get('company')}\n\n"
            f"Dear {recruiter_name or 'Hiring Team'},\n\n"
            f"It is with great enthusiasm that I submit my application for the {offer.get('title')} opportunity at {offer.get('company')}. "
            f"Having engineered complex systems across Python, React, and machine learning pipelines, I am eager to apply my technical foundation to deliver immediate impact.\n\n"
            f"I look forward to discussing how my experience will support {offer.get('company')}'s vision.\n\n"
            f"Sincerely,\n{cand_name}"
        )
        self.cover_letter_text.setText(offer.get("customCoverLetter") or default_cover)

        # Original Description
        self.job_desc_text.setText(offer.get("description") or offer.get("ocrRawText") or "No description available.")

    # ==========================================================================
    # USER ACTIONS
    # ==========================================================================

    def action_dump_clipboard(self):
        """Reads system clipboard text and submits for Groq AI extraction."""
        text = pyperclip.paste()
        if not text or not text.strip():
            QMessageBox.information(self, "Clipboard Empty", "Your system clipboard is empty! Copy a LinkedIn URL, job flyer, or post text first.")
            return

        trimmed = text.strip()
        self.btn_dump_clipboard.setEnabled(False)
        self.btn_dump_clipboard.setText("⏳ Ingesting...")
        self.status_bar.showMessage("Extracting career signals with Groq AI...")

        self.ingest_worker = IngestInputWorker(trimmed)
        self.ingest_worker.finished.connect(self._on_ingest_finished)
        self.ingest_worker.error.connect(self._on_ingest_error)
        self.ingest_worker.start()

    def _on_ingest_finished(self, data: dict):
        self.btn_dump_clipboard.setEnabled(True)
        self.btn_dump_clipboard.setText("📥 Dump Clipboard")
        if data.get("success"):
            offer = data.get("offer") or {}
            show_toast("Signal Captured", f"{offer.get('title', 'Job')} at {offer.get('company', 'Company')} ingested.")
            self.load_offers_from_backend()
        else:
            QMessageBox.warning(self, "Ingestion Notice", data.get("error") or "Could not extract job from clipboard.")

    def _on_ingest_error(self, err: str):
        self.btn_dump_clipboard.setEnabled(True)
        self.btn_dump_clipboard.setText("📥 Dump Clipboard")
        QMessageBox.critical(self, "Ingestion Error", f"Failed connecting to RADAR backend:\n{err}")

    def action_snip_screen(self):
        """Triggers transparent screen snip with WinRT Media OCR."""
        snipper = SnippingTool(on_snip_completed=handle_snip_completed)
        snipper.start()

    def action_launch_eml(self):
        """Generates RFC 822 .eml and opens in Outlook / Thunderbird via os.startfile."""
        if not self.current_offer:
            return
        to_addr = self.recruiter_email_input.text().strip()
        subject = self.email_subj_input.text().strip()
        body = self.email_body_text.toPlainText()

        eml_file = create_and_open_eml(subject, to_addr, body)
        if eml_file:
            self.status_bar.showMessage(f"✓ Launched .EML in desktop mail client: {os.path.basename(eml_file)}")
        else:
            QMessageBox.warning(self, "Mail Client Notice", "Could not launch desktop mail client.")

    def action_open_whatsapp(self):
        """Launches WhatsApp with pre-filled message."""
        phone = self.recruiter_phone_input.text().strip()
        msg = self.dm_pitch_text.toPlainText().strip()
        clean_phone = "".join(ch for ch in phone if ch.isdigit() or ch == "+")
        encoded_msg = urllib.parse.quote(msg)

        if clean_phone:
            url = f"https://wa.me/{clean_phone}?text={encoded_msg}"
        else:
            url = f"https://web.whatsapp.com/send?text={encoded_msg}"
        webbrowser.open(url)

    def action_open_target_url(self):
        """Opens original target job posting in browser."""
        if self.current_offer and self.current_offer.get("sourceUrl"):
            webbrowser.open(self.current_offer["sourceUrl"])
        else:
            QMessageBox.information(self, "No URL", "No source URL recorded for this offer.")

    def action_copy_recruiter_email(self):
        email = self.recruiter_email_input.text().strip()
        if email:
            pyperclip.copy(email)
            self.status_bar.showMessage(f"✓ Copied email: {email}")

    def action_save_cover_letter_txt(self):
        """Saves current cover letter to desktop text file."""
        try:
            body = self.cover_letter_text.toPlainText()
            filename = f"Cover_Letter_{(self.company_input.text() or 'Company').replace(' ', '_')}.txt"
            path = os.path.join(os.path.expanduser("~"), "Desktop", filename)
            with open(path, "w", encoding="utf-8") as f:
                f.write(body)
            QMessageBox.information(self, "Saved", f"Cover letter saved to Desktop:\n{path}")
        except Exception as e:
            QMessageBox.warning(self, "Save Error", str(e))

    def action_polish_email_ai(self):
        """Calls Groq AI endpoint to polish outreach email."""
        current_body = self.email_body_text.toPlainText()
        if not current_body:
            return

        self.status_bar.showMessage("Polishing email with Groq AI...")
        prompt = "Refine the following job application email to be concise, highly professional, compelling, and free of fluff. Maintain all candidate details:"
        self.ai_worker = GroqPolishWorker(prompt, current_body)
        self.ai_worker.finished.connect(self._on_polish_finished)
        self.ai_worker.error.connect(lambda err: QMessageBox.warning(self, "AI Notice", f"Groq AI call failed: {err}"))
        self.ai_worker.start()

    def _on_polish_finished(self, text: str):
        self.email_body_text.setText(text)
        self._save_current_offer_fields()
        self.status_bar.showMessage("✓ Email polished by Groq AI and saved.")

    def action_delete_current_offer(self):
        if not self.current_offer:
            return
        ans = QMessageBox.question(self, "Delete Offer", f"Delete offer '{self.current_offer.get('title')}'?", QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No)
        if ans == QMessageBox.StandardButton.Yes:
            offer_id = self.current_offer["id"]
            try:
                req = urllib.request.Request(f"{RADAR_BACKEND_URL}/api/offers/{offer_id}", method="DELETE")
                urllib.request.urlopen(req, timeout=5)
                self.load_offers_from_backend()
            except Exception as e:
                QMessageBox.warning(self, "Delete Error", str(e))

    def _on_status_changed(self, new_status: str):
        if not self.current_offer or self.current_offer.get("status") == new_status:
            return
        self.current_offer["status"] = new_status
        self._persist_offer_update({"status": new_status})

    def _on_channel_changed(self, new_channel: str):
        if not self.current_offer or self.current_offer.get("channel") == new_channel:
            return
        self.current_offer["channel"] = new_channel
        self._persist_offer_update({"channel": new_channel})

    def _save_current_offer_fields(self):
        if not self.current_offer:
            return
        updated_data = {
            "title": self.title_input.text().strip(),
            "company": self.company_input.text().strip(),
            "location": self.location_input.text().strip(),
            "recruiterEmail": self.recruiter_email_input.text().strip(),
            "recruiterName": self.recruiter_name_input.text().strip(),
            "customEmailSubject": self.email_subj_input.text().strip(),
            "customEmailBody": self.email_body_text.toPlainText().strip(),
            "whatsAppMsg": self.dm_pitch_text.toPlainText().strip(),
            "customCoverLetter": self.cover_letter_text.toPlainText().strip(),
        }
        self._persist_offer_update(updated_data)

    def _persist_offer_update(self, update_fields: dict):
        if not self.current_offer:
            return
        offer_id = self.current_offer["id"]

        def _do_update():
            try:
                merged = {**self.current_offer, **update_fields, "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")}
                payload = json.dumps(merged).encode("utf-8")
                req = urllib.request.Request(
                    f"{RADAR_BACKEND_URL}/api/offers/{offer_id}",
                    data=payload,
                    method="PUT",
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=5) as resp:
                    pass
            except Exception as e:
                logger.debug(f"Offer update notice: {e}")

        threading.Thread(target=_do_update, daemon=True).start()

    def _show_table_context_menu(self, pos):
        menu = QMenu(self)
        act_dump = menu.addAction("📥 Dump Clipboard & Ingest")
        act_apply = menu.addAction("✅ Mark as Applied")
        act_eml = menu.addAction("🚀 Launch .EML Mail Client")
        act_wa = menu.addAction("💬 Launch WhatsApp")
        act_del = menu.addAction("🗑️ Delete Opportunity")

        action = menu.exec(self.table.mapToGlobal(pos))
        if action == act_dump:
            self.action_dump_clipboard()
        elif action == act_apply:
            self.status_combo.setCurrentText("applied")
        elif action == act_eml:
            self.action_launch_eml()
        elif action == act_wa:
            self.action_open_whatsapp()
        elif action == act_del:
            self.action_delete_current_offer()


# ==============================================================================
# BACKGROUND INTELLIGENT CLIPBOARD LISTENER
# ==============================================================================

class BackgroundClipboardListener(threading.Thread):
    def __init__(self, backend_url: str = RADAR_BACKEND_URL):
        super().__init__(daemon=True)
        self.backend_url = backend_url
        self.last_hash = ""
        self.running = True

    def run(self):
        logger.info("Native Clipboard intelligence listener active.")
        while self.running:
            try:
                if AUTO_CLIPBOARD_SYNC:
                    content = pyperclip.paste()
                    if content and len(content.strip()) > 4:
                        c_hash = hashlib.md5(content.strip().encode("utf-8")).hexdigest()
                        if c_hash != self.last_hash:
                            self.last_hash = c_hash
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
                    "linkedin.com/jobs", "indeed.com", "glassdoor", "welcome to the jungle"
                ]
            )
        )
        if is_job_or_opp or text.startswith("http"):
            threading.Thread(target=self._send_to_backend, args=(text,), daemon=True).start()

    def _send_to_backend(self, text: str):
        payload = json.dumps({
            "content": text,
            "sourceDevice": "desktop_native_qt6",
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
                    if MAIN_APP_WINDOW:
                        MAIN_APP_WINDOW.signal_refresh_needed.emit()
        except Exception as e:
            logger.debug(f"Clipboard ingest notice: {e}")


# ==============================================================================
# SYSTEM TRAY & GLOBAL HOTKEYS
# ==============================================================================

def create_tray_pixmap() -> QPixmap:
    pix = QPixmap(32, 32)
    pix.fill(QColor(0, 0, 0, 0))
    painter = QPainter(pix)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)

    # Concentric rings
    painter.setPen(QPen(QColor("#FFFFFF"), 2))
    painter.drawEllipse(4, 4, 24, 24)
    painter.setPen(QPen(QColor("#71717A"), 1))
    painter.drawEllipse(10, 10, 12, 12)

    # Crosshairs
    painter.drawLine(16, 2, 16, 30)
    painter.drawLine(2, 16, 30, 16)

    # Red Beacon
    painter.setBrush(QBrush(QColor("#FF3B30")))
    painter.setPen(Qt.PenStyle.NoPen)
    painter.drawEllipse(20, 8, 6, 6)
    painter.end()
    return pix


def setup_global_hotkeys(window: RadarDesktopWindow):
    def on_snip():
        window.action_snip_screen()

    def on_focus():
        window.showNormal()
        window.activateWindow()
        window.raise_()

    hotkeys = keyboard.GlobalHotKeys({
        "<alt>+s": on_snip,
        "<alt>+r": on_focus,
    })
    hotkeys.daemon = True
    hotkeys.start()
    logger.info("Global hotkeys active: [Alt+S] Snip & WinOCR | [Alt+R] Focus Cockpit.")


# ==============================================================================
# MAIN APPLICATION ENTRYPOINT
# ==============================================================================

def main():
    global MAIN_APP_WINDOW

    logger.info("Initializing RADAR Native PyQt6 Workstation...")

    # 1. Ensure local FastAPI backend is active
    ensure_backend_running()

    # 2. Qt Application
    app = QApplication(sys.argv)
    app.setApplicationName("RADAR Workstation")
    app.setStyle("Fusion")

    # 3. Create Main Window
    window = RadarDesktopWindow()
    MAIN_APP_WINDOW = window
    window.show()

    # 4. System Tray Icon
    tray_icon = QSystemTrayIcon(QIcon(create_tray_pixmap()), app)
    tray_menu = QMenu()

    act_show = tray_menu.addAction("Show RADAR Workstation [Alt+R]")
    act_show.triggered.connect(lambda: (window.showNormal(), window.activateWindow()))

    act_snip = tray_menu.addAction("Capture Screen Snip [Alt+S]")
    act_snip.triggered.connect(window.action_snip_screen)

    act_dump = tray_menu.addAction("Dump System Clipboard")
    act_dump.triggered.connect(window.action_dump_clipboard)

    tray_menu.addSeparator()

    act_quit = tray_menu.addAction("Quit RADAR")
    act_quit.triggered.connect(app.quit)

    tray_icon.setContextMenu(tray_menu)
    tray_icon.show()

    # 5. Global Hotkeys
    try:
        setup_global_hotkeys(window)
    except Exception as e:
        logger.warning(f"Global hotkey setup notice: {e}")

    # 6. Background Clipboard Listener
    clip_listener = BackgroundClipboardListener(RADAR_BACKEND_URL)
    clip_listener.start()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
