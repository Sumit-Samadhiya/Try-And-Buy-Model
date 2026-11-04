@echo off
echo ========================================================
echo Installing VoiceStudio (Open-source ElevenLabs alternative)
echo GitHub: https://github.com/debpalash/voicestudio
echo ========================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://voicestudio.sh/install.ps1 | iex"
echo.
echo ========================================================
echo VoiceStudio installation initiated.
echo Once installed, open VoiceStudio and run:
echo python scripts\voicestudio_sync.py
echo ========================================================
pause

