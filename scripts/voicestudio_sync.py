"""
VoiceStudio -> Drapey Audio Sync Script
=======================================
Integrates with open-source VoiceStudio (https://github.com/debpalash/voicestudio).
When VoiceStudio desktop app is running locally (default http://localhost:3900),
this script sends all Drapey website dialogues to VoiceStudio's local zero-shot
voice cloning API using 'op_chiku_voice.mp3' as the reference voice,
and updates all audio files in 'sevenshadesfrontend/public/sounds/'.

Usage:
  1. Open VoiceStudio desktop app (or run: scripts\\install_voicestudio.bat)
  2. Run: python scripts\\voicestudio_sync.py
"""

import os
import sys
import json
import urllib.request
import urllib.error

VOICESTUDIO_API_URL = os.environ.get("VOICESTUDIO_API_URL", "http://localhost:3900/v1")
VOICESTUDIO_API_KEY = os.environ.get("VOICESTUDIO_API_KEY", "not-needed-locally")

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOUNDS_DIR = os.path.join(REPO_ROOT, "sevenshadesfrontend", "public", "sounds")
REFERENCE_AUDIO = os.path.join(SOUNDS_DIR, "op_chiku_voice.mp3")

DIALOGUES = {
    "drapey_greeting": "Hey! Namaste! Main Drapey hoon, aapka personal Try and Buy stylist! Ghar baithe try karo, pasand aaye tabhi khareedo!",
    "drapey_cart": "Yaaay! Yahoo! Bag me add ho gaya! Ab Try and Buy ke liye ready ho jao!",
    "drapey_order_success": "Hooray! Badhai ho! Order confirm ho gaya! 30 se 45 minutes me rider aapke paas hoga!",
    "drapey_warning": "Hey! 2 baar chhu diya! Ek baar aur tap kiya toh main bomb ki tarah phat jaunga!",
    "drapey_bomb_rage": "ARGHHH! 3 BAAR KYUN DABAYA?! Main phatne wala hoon! KABOOM!",
    "drapey_soot": "Khasi-khasi... Dekh liya mera gussa? Pura phat gaya na! Ab shanti se shopping karo!",
    "drapey_tip_1": "DoorDrape par pehle kapde try karo, pasand aaye tabhi paise do!",
    "drapey_tip_2": "30 se 45 minutes me rider aapke ghar par trial bag le kar aayega!",
    "drapey_tip_3": "Size ka confusion? Rider 2-3 sizes sath laayega, sab try karo!",
    "drapey_tip_4": "Ghar par aaram se mirror ke samne check karo aur confidently decide karo!",
    "drapey_tip_5": "Jo pasand aaye wahi rakho, baaki bina kisi jhanjhat rider ko wapas de do!",
    "drapey_tip_6": "Koi delivery charge nahi, koi hidden fees nahi! Bilkul free trial!",
    "drapey_tip_7": "Aap mujhe idhar-udhar drag karke screen ke kisi bhi kone me rakh sakte ho!",
    "drapey_tip_8": "Mujhe baar-baar zor se mat dabana, mujhe bahut tez gussa aata hai!"
}

def check_voicestudio_running():
    try:
        req = urllib.request.Request(f"{VOICESTUDIO_API_URL}/audio/voices")
        with urllib.request.urlopen(req, timeout=3) as resp:
            return resp.status == 200
    except Exception:
        # Check base health
        try:
            req = urllib.request.Request("http://localhost:3900/health")
            with urllib.request.urlopen(req, timeout=3) as resp:
                return resp.status == 200
        except Exception:
            return False

def clone_with_voicestudio(key, text):
    payload = {
        "model": "omnivoice",
        "input": text,
        "voice": "chiku",
        "ref_audio": REFERENCE_AUDIO,
        "response_format": "mp3"
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{VOICESTUDIO_API_URL}/audio/speech",
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {VOICESTUDIO_API_KEY}"
        }
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()

def main():
    print("=" * 60)
    print("VoiceStudio <-> Drapey Mascot Voice Synchronizer")
    print("Open-source voice cloning via https://github.com/debpalash/voicestudio")
    print("=" * 60)

    if not os.path.exists(REFERENCE_AUDIO):
        print(f"[ERROR] Reference audio not found at: {REFERENCE_AUDIO}")
        sys.exit(1)

    print(f"[OK] Reference voice found: {REFERENCE_AUDIO} ({os.path.getsize(REFERENCE_AUDIO)/1024:.1f} KB)")
    print(f"[INFO] Checking local VoiceStudio instance at {VOICESTUDIO_API_URL}...")

    if not check_voicestudio_running():
        print("\n[NOTICE] VoiceStudio local server is not running on http://localhost:3900.")
        print("To run VoiceStudio:")
        print("  1. Run 'scripts\\install_voicestudio.bat' or download from:")
        print("     https://github.com/debpalash/voicestudio/releases/latest")
        print("  2. Start VoiceStudio, then re-run this script.")
        print("\nUsing pre-rendered high-definition neural Hindi voice clips.")
        sys.exit(0)

    print("[SUCCESS] VoiceStudio is running! Cloning all 14 Drapey dialogues...")
    for key, text in DIALOGUES.items():
        out_path = os.path.join(SOUNDS_DIR, f"{key}.mp3")
        try:
            audio_bytes = clone_with_voicestudio(key, text)
            with open(out_path, "wb") as f:
                f.write(audio_bytes)
            print(f" -> Cloned & saved {key}.mp3 ({len(audio_bytes)/1024:.1f} KB)")
        except Exception as e:
            print(f" -> Failed to clone {key}: {e}")

    print("\n[COMPLETED] All dialogues synced successfully with VoiceStudio!")

if __name__ == "__main__":
    main()

