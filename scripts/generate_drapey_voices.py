import asyncio
import os
import edge_tts

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

OUT_DIR = os.path.abspath("sevenshadesfrontend/public/sounds")
os.makedirs(OUT_DIR, exist_ok=True)

async def generate_all():
    print(f"Generating {len(DIALOGUES)} dialogues into {OUT_DIR}...")
    for key, text in DIALOGUES.items():
        out_file = os.path.join(OUT_DIR, f"{key}.mp3")
        # Pitch +35Hz gives a youthful, lively, cute baby/child tone
        communicate = edge_tts.Communicate(
            text,
            voice="hi-IN-SwaraNeural",
            pitch="+35Hz",
            rate="+6%"
        )
        await communicate.save(out_file)
        print(f"-> Generated {key}.mp3 ({os.path.getsize(out_file) / 1024:.1f} KB)")

if __name__ == "__main__":
    asyncio.run(generate_all())

