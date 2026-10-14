' RADAR Silent Background Launcher
' Starts the unified FastAPI backend & Web Command Center with ZERO open terminal windows.

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get current directory
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Command line to run unified server
cmd = "cmd /c cd /d """ & currentDir & """ && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8003"

' Run invisible (0 = hide window, false = do not wait)
WshShell.Run cmd, 0, False

WScript.Sleep 1500

' Display desktop notification
WshShell.Popup "RADAR is running silently in the background!" & vbCrLf & vbCrLf & _
               "• Web Command Center: http://localhost:8003" & vbCrLf & _
               "• Mobile / LAN: http://localhost:8003/api/health" & vbCrLf & _
               "• To stop: Run stop_background.bat", 5, "RADAR Active", 64
