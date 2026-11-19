#!/usr/bin/env python3
"""
RADAR Native Desktop Cockpit & Intelligence Engine
Powered by Microsoft Edge WebView2 (60fps DirectWrite & hardware acceleration)
with Direct Python Native OS Bridge.

Key Native Capabilities:
- Alt+S Global Hotkey: Transparent Screen Snip & Instant WinRT Local Media OCR (15ms, 0 LLM tokens)
- Alt+R Global Hotkey: Instant Focus & Restore RADAR Desktop Cockpit
- Background OS Clipboard Intelligence Listener: Auto-detects job postings, LinkedIn URLs, tech stacks
- Native Windows Action Center Toasts
- Direct RFC 822 .EML Desktop Mail Client Dispatch (Outlook / Thunderbird via os.startfile)
- Direct WhatsApp Desktop Launcher
- System Tray HUD with tactical beacon indicator & quick-action context menu
- Native File Dialogs and Clipboard Sync
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
from typing import Dict, Any, Optional

import webview
from PIL import Image, ImageDraw, ImageGrab
import pyperclip
from pynput import keyboard
import pystray

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("radar.desktop")

RADAR_BACKEND_URL = os.getenv("RADAR_BACKEND_URL", "http://127.0.0.1:8003")
AUTO_CLIPBOARD_SYNC = True
BACKEND_PROCESS = None
DESKTOP_WINDOW: Optional[webview.Window] = None
TRAY_ICON = None


# ==============================================================================
# BACKEND PROCESS SUPERVISOR
# ==============================================================================

def is_backend_healthy(url: str = RADAR_BACKEND_URL) -> bool:
    """Checks if the local RADAR FastAPI backend is responsive."""
    try:
        req = urllib.request.Request(f"{url}/api/health", headers={"User-Agent": "RADAR-Desktop-Native"})
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
# NATIVE OS NOTIFICATIONS & SHELL DISPATCH
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
# LOCAL WINRT MEDIA OCR (15ms, Zero LLM Tokens)
# ==============================================================================

def extract_text_local_ocr(pil_img: Image.Image, lang: str = "en") -> str:
    """
    Extracts text using native Windows Media OCR (WinRT).
    Runs locally on CPU/GPU in ~15-20ms with 0 LLM token cost.
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
    """Processes snipped image with local OCR and updates WebView2 window."""
    t0 = time.time()
    ocr_text = extract_text_local_ocr(pil_img)
    duration_ms = round((time.time() - t0) * 1000, 1)

    logger.info(f"Local winocr finished in {duration_ms}ms: {len(ocr_text)} chars extracted.")

    buffered = io.BytesIO()
    pil_img.save(buffered, format="PNG")
    img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

    show_toast("RADAR Snip Extracted (Local OCR)", f"{len(ocr_text)} characters captured in {duration_ms}ms.")

    # 1. Asynchronously persist into RADAR Vault backend
    threading.Thread(target=_persist_snip_to_backend, args=(img_b64, ocr_text), daemon=True).start()

    # 2. Dispatch event directly into WebView2 DOM
    if DESKTOP_WINDOW:
        try:
            payload = json.dumps({
                "text": ocr_text,
                "durationMs": duration_ms,
                "charCount": len(ocr_text),
                "imageBase64": f"data:image/png;base64,{img_b64}"
            })
            DESKTOP_WINDOW.evaluate_js(f"""
                window.dispatchEvent(new CustomEvent('radar:desktop-snip', {{ detail: {payload} }}));
            """)
        except Exception as e:
            logger.debug(f"evaluate_js snip notice: {e}")


def _persist_snip_to_backend(img_b64: str, ocr_text: str):
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
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("success") and DESKTOP_WINDOW:
                DESKTOP_WINDOW.evaluate_js("window.dispatchEvent(new CustomEvent('radar:data-refresh'));")
    except Exception as e:
        logger.debug(f"Snip backend sync notice: {e}")


# ==============================================================================
# BACKGROUND INTELLIGENT CLIPBOARD LISTENER
# ==============================================================================

class ClipboardListener(threading.Thread):
    def __init__(self, backend_url: str = RADAR_BACKEND_URL):
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
            "sourceDevice": "desktop_native",
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
                    if DESKTOP_WINDOW:
                        try:
                            payload_json = json.dumps({"text": text, "clip": clip})
                            DESKTOP_WINDOW.evaluate_js(f"""
                                window.dispatchEvent(new CustomEvent('radar:clipboard-item', {{ detail: {payload_json} }}));
                                window.dispatchEvent(new CustomEvent('radar:data-refresh'));
                            """)
                        except Exception:
                            pass
        except Exception as e:
            logger.debug(f"Clipboard ingest notice: {e}")


# ==============================================================================
# TWO-WAY DESKTOP JAVASCRIPT BRIDGE (pywebview js_api)
# ==============================================================================

class DesktopNativeBridge:
    """
    Exposed directly to the frontend via window.pywebview.api.
    Provides hardware-accelerated access to native Windows OS APIs.
    """

    def __init__(self):
        self.window: Optional[webview.Window] = None

    def set_window(self, win: webview.Window):
        self.window = win

    def get_native_info(self) -> Dict[str, Any]:
        """Returns hardware & OS capabilities of this desktop instance."""
        return {
            "isNative": True,
            "platform": sys.platform,
            "version": "2.4.0-Production",
            "ocrEngine": "Windows Media OCR (WinRT - 15ms)",
            "hotkeySnip": "Alt+S",
            "hotkeyFocus": "Alt+R",
            "clipboardSync": AUTO_CLIPBOARD_SYNC,
            "backendUrl": RADAR_BACKEND_URL,
        }

    def snip_screen(self) -> Dict[str, Any]:
        """Triggers the transparent snipping tool from a button click in UI."""
        snipper = SnippingTool(on_snip_completed=handle_snip_completed)
        snipper.start()
        return {"status": "started", "message": "Crosshair snip tool active. Press ESC to cancel."}

    def export_eml(self, subject: str = "", to_addr: str = "", body: str = "") -> Dict[str, Any]:
        """Creates an RFC 822 .eml file and launches default desktop mail client."""
        path = create_and_open_eml(subject, to_addr, body)
        return {"success": bool(path), "path": path or ""}

    def open_whatsapp(self, phone: str = "", message: str = "") -> Dict[str, Any]:
        """Launches WhatsApp with prefilled message."""
        clean_phone = "".join(ch for ch in phone if ch.isdigit() or ch == "+")
        encoded_msg = urllib.parse.quote(message or "")
        url = f"https://wa.me/{clean_phone}?text={encoded_msg}" if clean_phone else f"https://web.whatsapp.com/send?text={encoded_msg}"
        webbrowser.open(url)
        return {"success": True, "url": url}

    def copy_to_clipboard(self, text: str) -> Dict[str, Any]:
        """Copies text directly to the Windows system clipboard."""
        try:
            pyperclip.copy(text)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def read_clipboard(self) -> Dict[str, Any]:
        """Reads current clipboard text."""
        try:
            return {"success": True, "text": pyperclip.paste()}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def toggle_clipboard_watcher(self, enabled: bool) -> Dict[str, Any]:
        """Toggles the background clipboard monitor."""
        global AUTO_CLIPBOARD_SYNC
        AUTO_CLIPBOARD_SYNC = bool(enabled)
        logger.info(f"Clipboard watcher set to {AUTO_CLIPBOARD_SYNC}")
        return {"success": True, "enabled": AUTO_CLIPBOARD_SYNC}

    def show_toast(self, title: str, message: str) -> Dict[str, Any]:
        """Emits a Windows Action Center notification."""
        show_toast(title, message)
        return {"success": True}

    def open_external(self, url: str) -> Dict[str, Any]:
        """Opens URL in the user's default external browser."""
        if url:
            webbrowser.open(url)
        return {"success": True}

    def minimize_window(self) -> Dict[str, Any]:
        """Minimizes desktop window."""
        if self.window:
            self.window.minimize()
        return {"success": True}

    def focus_window(self) -> Dict[str, Any]:
        """Brings desktop window to front."""
        if self.window:
            self.window.restore()
            self.window.focus()
        return {"success": True}


# ==============================================================================
# SYSTEM TRAY & GLOBAL HOTKEYS
# ==============================================================================

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


def setup_global_hotkeys(bridge: DesktopNativeBridge):
    """Registers Alt+S (Screen Snip) and Alt+R (Focus Cockpit)."""
    def on_snip():
        bridge.snip_screen()

    def on_focus():
        bridge.focus_window()

    hotkeys = keyboard.GlobalHotKeys({
        "<alt>+s": on_snip,
        "<alt>+r": on_focus,
    })
    hotkeys.daemon = True
    hotkeys.start()
    logger.info("Global hotkeys active: [Alt+S] Snip & WinOCR | [Alt+R] Focus Cockpit.")


def run_system_tray(bridge: DesktopNativeBridge):
    """Runs system tray icon in a background daemon thread."""
    global TRAY_ICON

    def on_show_cockpit(icon, item):
        bridge.focus_window()

    def on_snip_tray(icon, item):
        bridge.snip_screen()

    def on_open_external(icon, item):
        webbrowser.open(RADAR_BACKEND_URL)

    def on_quit_all(icon, item):
        icon.stop()
        if BACKEND_PROCESS:
            try:
                BACKEND_PROCESS.terminate()
            except Exception:
                pass
        if bridge.window:
            bridge.window.destroy()
        os._exit(0)

    menu = pystray.Menu(
        pystray.MenuItem("Open RADAR Cockpit [Alt+R]", on_show_cockpit, default=True),
        pystray.MenuItem("Capture Screen Snip [Alt+S]", on_snip_tray),
        pystray.MenuItem("Open in External Browser", on_open_external),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Quit RADAR", on_quit_all)
    )

    tray_img = create_tray_icon_image()
    TRAY_ICON = pystray.Icon("RADAR", tray_img, "RADAR Native Cockpit", menu)
    TRAY_ICON.run()


# ==============================================================================
# MAIN APPLICATION ENTRYPOINT
# ==============================================================================

def main():
    global DESKTOP_WINDOW

    logger.info("Initializing RADAR Native Desktop Application (WebView2)...")

    # 1. Ensure local FastAPI backend is active
    ensure_backend_running()

    # 2. Instantiate native bridge
    bridge = DesktopNativeBridge()

    # 3. Configure pywebview settings
    webview.settings["ALLOW_DOWNLOADS"] = True
    webview.settings["ALLOW_FILE_URLS"] = True
    webview.settings["OPEN_EXTERNAL_LINKS_IN_BROWSER"] = True

    # 4. Create Native Desktop Window
    window = webview.create_window(
        title="RADAR // Signal Intelligence & Career Cockpit",
        url=RADAR_BACKEND_URL,
        width=1440,
        height=920,
        min_size=(1100, 720),
        js_api=bridge,
        background_color="#000000",
        text_select=True,
        zoomable=True
    )
    bridge.set_window(window)
    DESKTOP_WINDOW = window

    # 5. Start Background Clipboard Listener
    clip_listener = ClipboardListener(RADAR_BACKEND_URL)
    clip_listener.start()

    # 6. Register Global Hotkeys (Alt+S, Alt+R)
    try:
        setup_global_hotkeys(bridge)
    except Exception as e:
        logger.warning(f"Global hotkey setup notice: {e}")

    # 7. Start System Tray
    threading.Thread(target=run_system_tray, args=(bridge,), daemon=True).start()

    # 8. Start Native WebView2 Event Loop
    try:
        webview.start(debug=False)
    finally:
        if BACKEND_PROCESS:
            try:
                BACKEND_PROCESS.terminate()
            except Exception:
                pass


if __name__ == "__main__":
    main()
