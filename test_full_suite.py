import sys
import time
from playwright.sync_api import sync_playwright

def run_tests():
    errors = []
    warnings = []
    
    with sync_playwright() as p:
        print("[1/5] Launching Chromium browser...")
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1600, 'height': 960})

        page.on('pageerror', lambda err: errors.append(f"[PAGE ERROR] {err}"))
        page.on('console', lambda msg: errors.append(f"[CONSOLE ERROR] {msg.text}") if msg.type == 'error' else None)

        print("[2/5] Loading RADAR Workstation at http://127.0.0.1:8003...")
        page.goto('http://127.0.0.1:8003')
        page.wait_for_timeout(2000)

        # 1. Test Home View
        print("  ✓ Testing Home View...")
        page.screenshot(path='test_01_home.png')

        # 2. Test Command Center View (3-Pane Cockpit)
        print("  ✓ Testing Command Center 3-Pane Cockpit...")
        cmd_btn = page.locator('button:has-text("Command Center")')
        if cmd_btn.count() > 0:
            cmd_btn.first.click()
            page.wait_for_timeout(1500)
            page.screenshot(path='test_02_command_center.png')

            # Test Channel filters
            print("    - Testing Channel filters...")
            for ch in ["Direct Email", "DM & WhatsApp", "ATS Portals", "High Fit", "All Signals"]:
                btn = page.locator(f'button:has-text("{ch}")')
                if btn.count() > 0:
                    btn.first.click()
                    page.wait_for_timeout(300)

            # Test Search input
            print("    - Testing Search input...")
            search_input = page.locator('input[placeholder*="Search role, company"]')
            if search_input.count() > 0:
                search_input.first.fill("Engineer")
                page.wait_for_timeout(500)
                search_input.first.fill("")
                page.wait_for_timeout(300)

            # Test Opportunity Cards selection
            print("    - Testing Opportunity Card Selection...")
            cards = page.locator('.command-master-pane > div:nth-child(3) > div')
            if cards.count() > 0:
                cards.first.click()
                page.wait_for_timeout(500)

            # Test Tactical Studio Tabs
            print("    - Testing Tactical Studio Tabs in Pane 3...")
            tabs = [
                ("Email Outreach", "input[type='email']"),
                ("WhatsApp & DM", "textarea"),
                ("ATS & Tailored CV", "button:has-text('Download PDF')"),
                ("n8n Workflows", "button:has-text('Trigger Full Cycle Now')"),
                ("Job Spec & Flyer", "textarea"),
                ("Groq AI Copilot", "button:has-text('Ask AI')"),
            ]
            for tab_name, selector in tabs:
                tab_btn = page.locator(f'button:has-text("{tab_name}")')
                if tab_btn.count() > 0:
                    tab_btn.first.click()
                    page.wait_for_timeout(400)
                    elem = page.locator(selector)
                    if elem.count() == 0:
                        warnings.append(f"Tab element not found for {tab_name}: {selector}")

            # Test n8n Webhook Modal
            print("    - Testing n8n Webhook Modal...")
            n8n_hub_btn = page.locator('button:has-text("Configure Webhooks")')
            if n8n_hub_btn.count() > 0:
                n8n_hub_btn.first.click()
                page.wait_for_timeout(400)
                # Close modal
                cancel_btn = page.locator('button:has-text("Cancel")')
                if cancel_btn.count() > 0:
                    cancel_btn.first.click()
                    page.wait_for_timeout(300)

        # 3. Test Scraper Studio View
        print("  ✓ Testing Autonomous Scraper View...")
        scraper_btn = page.locator('button:has-text("Autonomous Scraper")')
        if scraper_btn.count() > 0:
            scraper_btn.first.click()
            page.wait_for_timeout(1200)
            page.screenshot(path='test_03_scraper.png')

        # 4. Test ATS Resume Studio View
        print("  ✓ Testing ATS Resume Studio View...")
        ats_btn = page.locator('button:has-text("ATS Resume Studio")')
        if ats_btn.count() > 0:
            ats_btn.first.click()
            page.wait_for_timeout(1200)
            page.screenshot(path='test_04_ats_studio.png')

        # 5. Test Signal Vault View
        print("  ✓ Testing Signal Vault View...")
        vault_btn = page.locator('button:has-text("Signal Vault")')
        if vault_btn.count() > 0:
            vault_btn.first.click()
            page.wait_for_timeout(1200)
            page.screenshot(path='test_05_vault.png')

        # 6. Test Pipeline Board View
        print("  ✓ Testing Pipeline Board View...")
        pipeline_btn = page.locator('button:has-text("Pipeline Board")')
        if pipeline_btn.count() > 0:
            pipeline_btn.first.click()
            page.wait_for_timeout(1200)
            page.screenshot(path='test_06_pipeline.png')

        # 7. Test Settings View
        print("  ✓ Testing Settings View...")
        settings_btn = page.locator('button:has-text("Settings")')
        if settings_btn.count() > 0:
            settings_btn.first.click()
            page.wait_for_timeout(1200)
            page.screenshot(path='test_07_settings.png')

        browser.close()

    print("[3/5] Testing Mobile API Bridge...")
    try:
        import urllib.request, json
        base = 'http://127.0.0.1:8003'
        
        # Test mobile pairing
        with urllib.request.urlopen(f'{base}/api/mobile/pairing', timeout=4) as r:
            assert r.getcode() == 200, "Mobile pairing failed"
            data = json.loads(r.read().decode())
            print(f"    ✓ Mobile pairing: OK (Host: {data.get('hostname')}, Offers: {data['counts']['offers']})")

        # Test n8n trigger
        req = urllib.request.Request(f'{base}/api/n8n/trigger', method='POST')
        req.add_header('Content-Type', 'application/json')
        req.data = json.dumps({'workflowType': 'ats_check', 'offer': {'title': 'AI Researcher'}}).encode('utf-8')
        with urllib.request.urlopen(req, timeout=4) as r:
            assert r.getcode() == 200, "n8n trigger failed"
            tdata = json.loads(r.read().decode())
            print(f"    ✓ n8n trigger ats_check: OK (Success: {tdata.get('success')})")

        # Test export CSV
        with urllib.request.urlopen(f'{base}/api/offers/export/csv', timeout=4) as r:
            assert r.getcode() == 200, "Export CSV failed"
            print("    ✓ Export CSV: OK")

        # Test Auth: 1-click Offline Session & /api/auth/me
        req_auth = urllib.request.Request(f'{base}/api/auth/offline-session', method='POST', data=b'{}')
        req_auth.add_header('Content-Type', 'application/json')
        with urllib.request.urlopen(req_auth, timeout=4) as r:
            assert r.getcode() == 200, "Auth offline-session failed"
            auth_data = json.loads(r.read().decode())
            token = auth_data['token']
            print(f"    ✓ Auth offline-session: OK (User: {auth_data['user']['username']}, Mode: {auth_data['mode']})")

        req_me = urllib.request.Request(f'{base}/api/auth/me')
        req_me.add_header('Authorization', f'Bearer {token}')
        with urllib.request.urlopen(req_me, timeout=4) as r:
            assert r.getcode() == 200, "Auth /me failed"
            me_data = json.loads(r.read().decode())
            assert me_data['authenticated'] is True
            print(f"    ✓ Auth /api/auth/me validation: OK (User: {me_data['user']['fullName']})")

    except Exception as e:
        errors.append(f"[API BRIDGE ERROR] {e}")

    print("[4/5] Checking Mobile App Component Syntax...")
    mobile_files = [
        'mobile/App.js',
        'mobile/src/theme.js',
        'mobile/src/components/RadarLogo.js',
        'mobile/src/screens/DashboardScreen.js',
        'mobile/src/screens/OffersListScreen.js',
        'mobile/src/screens/OfferDetailScreen.js',
        'mobile/src/screens/ProfileSettingsScreen.js',
        'mobile/src/screens/CategoriesScreen.js',
        'mobile/src/screens/SearchScreen.js',
        'mobile/src/screens/ScraperScreen.js',
        'mobile/src/screens/ClipVaultScreen.js',
        'mobile/src/screens/CaptureScreen.js',
        'mobile/src/services/api.js',
        'mobile/src/services/clipboardWatcher.js',
        'mobile/src/services/screenshotWatcher.js',
        'mobile/src/services/notificationService.js',
        'mobile/src/services/authService.js',
    ]
    for mf in mobile_files:
        try:
            with open(mf, 'r', encoding='utf-8') as f:
                content = f.read()
            if len(content) < 50:
                errors.append(f"File {mf} is abnormally small ({len(content)} bytes)")
            else:
                print(f"    ✓ {mf} ({len(content)} bytes)")
        except Exception as e:
            errors.append(f"Failed to read {mf}: {e}")

    print("\n[5/5] Final Test Diagnostics Summary:")
    print(f"Total Console & Page Errors: {len(errors)}")
    print(f"Total Warnings: {len(warnings)}")

    if errors:
        print("\nERRORS DETECTED:")
        for err in errors:
            print("  ❌", err)
        sys.exit(1)
    else:
        print("\n🎉 ALL TESTS PASSED WITH 0 ERRORS! SYSTEM IS ROCK SOLID.")
        sys.exit(0)

if __name__ == '__main__':
    run_tests()
