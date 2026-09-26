@echo off
setlocal
cd /d "%~dp0"
set "project_powershell=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
"%project_powershell%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-project.ps1" %*
set "launcher_result=%errorlevel%"
if not "%launcher_result%"=="0" (
  echo.
  echo Startup failed. Read the message above and check .runtime\logs.
  pause
)
endlocal & exit /b %launcher_result%
