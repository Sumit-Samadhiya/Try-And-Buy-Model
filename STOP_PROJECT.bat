@echo off
setlocal
cd /d "%~dp0"
set "project_powershell=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
"%project_powershell%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-project.ps1" -Stop
set "launcher_result=%errorlevel%"
if not "%launcher_result%"=="0" pause
endlocal & exit /b %launcher_result%
