@echo off
title OmniHunt • Remote Public Access Tunnel
cls
echo ==============================================================================
echo    🌐 OmniHunt Remote Connectivity Wizard (Mobile 4G / External Networks)
echo ==============================================================================
echo.
echo  This script exposes your local PC backend (port 8003) to a secure public HTTPS
echo  URL so your phone can sync from anywhere (4G/5G, foreign Wi-Fi, outside home)
echo  WITHOUT touching your home router or port-forwarding!
echo.
echo  Choose your tunneling provider:
echo.
echo    [1] Localtunnel (Zero-install, works instantly via npx)
echo    [2] Cloudflare Quick Tunnel (Free, zero-account, high-performance)
echo    [3] Tailscale Mesh Guide (Direct peer-to-peer, encrypted)
echo    [4] Exit
echo.
echo ==============================================================================
set /p tunnelChoice="Select option (1-4, default is 1): "

if "%tunnelChoice%"=="" set tunnelChoice=1
if "%tunnelChoice%"=="1" goto LOCALTUNNEL
if "%tunnelChoice%"=="2" goto CLOUDFLARE
if "%tunnelChoice%"=="3" goto TAILSCALE
if "%tunnelChoice%"=="4" exit

:LOCALTUNNEL
cls
echo ==============================================================================
echo  Launching Localtunnel for port 8003...
echo ==============================================================================
echo.
echo  1. Once the tunnel is ready, copy the "your url is: https://xxxx.loca.lt" URL.
echo  2. Open OmniHunt Mobile App -> Tap Settings / Connect.
echo  3. Paste that HTTPS URL and tap "Test Ping".
echo  4. When you visit this URL for the first time in a browser, it may ask for
echo     your public IP as a security check (find it at https://ipv4.icanhazip.com).
echo.
echo  Press Ctrl+C to close the tunnel when finished.
echo ------------------------------------------------------------------------------
npx -y localtunnel --port 8003
pause
exit

:CLOUDFLARE
cls
echo ==============================================================================
echo  Launching Cloudflare Quick Tunnel for port 8003...
echo ==============================================================================
echo.
set "CF_BIN="
where cloudflared >nul 2>&1 && set "CF_BIN=cloudflared"
if not defined CF_BIN if exist "C:\Program Files (x86)\cloudflared\cloudflared.exe" set "CF_BIN=C:\Program Files (x86)\cloudflared\cloudflared.exe"
if not defined CF_BIN if exist "C:\Program Files\cloudflared\cloudflared.exe" set "CF_BIN=C:\Program Files\cloudflared\cloudflared.exe"

if defined CF_BIN (
    echo Cloudflared detected at "%CF_BIN%".
    echo Starting tunnel...
    echo ------------------------------------------------------------------------------
    echo 1. Look for the "https://xxxx.trycloudflare.com" link below.
    echo 2. Paste it in OmniHunt Mobile App -> Connect / Settings.
    echo 3. Press Ctrl+C when finished to terminate the tunnel.
    echo ------------------------------------------------------------------------------
    "%CF_BIN%" tunnel --url http://localhost:8003
) else (
    echo [INFO] Cloudflared is not installed. You can download it with:
    echo        winget install Cloudflare.cloudflared
    echo.
    echo Falling back to Localtunnel...
    timeout /t 3 >nul
    goto LOCALTUNNEL
)
pause
exit

:TAILSCALE
cls
echo ==============================================================================
echo  Tailscale Mesh Overlay Guide (Permanent Zero-Latency Cross-Network Sync)
echo ==============================================================================
echo.
echo  1. Download Tailscale on PC: https://tailscale.com
echo  2. Download Tailscale app on your Phone from App Store / Google Play.
echo  3. Sign in with the SAME account on both devices.
echo  4. Find your PC's 100.x.y.z IP in the Tailscale app.
echo  5. In OmniHunt Mobile App, connect to:
echo     http://100.x.y.z:8003
echo.
echo  Tailscale provides an encrypted direct wire between your phone and PC
echo  everywhere in the world with ZERO public exposure!
echo.
pause
exit
