from playwright.sync_api import sync_playwright

views = [
    ('Home', 'home'),
    ('Command Center', 'command_center'),
    ('Autonomous Scraper', 'scraper'),
    ('ATS Resume Studio', 'ats_studio'),
    ('Signal Vault', 'signal_vault'),
    ('Pipeline Board', 'pipeline_board'),
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    errors = []
    page.on('pageerror', lambda err: errors.append(f'[PAGE ERROR] {err}'))
    page.on('console', lambda msg: errors.append(f'[CONSOLE ERROR] {msg.text}') if msg.type == 'error' else None)

    print('Opening http://127.0.0.1:8003...')
    page.goto('http://127.0.0.1:8003')
    page.wait_for_timeout(2000)
    page.screenshot(path='audit_home.png')

    for label, fname in views[1:]:
        print(f'Navigating to {label}...')
        btn = page.locator(f'button:has-text("{label}")')
        if btn.count() > 0:
            btn.first.click()
            page.wait_for_timeout(2000)
            page.screenshot(path=f'audit_{fname}.png')
            print(f'Saved audit_{fname}.png')
        else:
            print(f'Button not found: {label}')

    browser.close()
    print('Audit complete. Total console errors:', len(errors))
    for err in errors:
        print(' -', err)

