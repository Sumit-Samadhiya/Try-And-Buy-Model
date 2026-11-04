import asyncio
import os
import edge_tts

CUTE_DIALOGUES = {
    "drapey_greeting": "Hehe! Hii cutie! Main Drapey hoon, aapka chhotu sa shopping dost! Pehle ghar baithe mast try karo, pasand aaye tabhi khareedo na! Promise?",
    "drapey_cart": "Yaaayyy! Yahoo! Yeh outfit toh aap par kitni pyaari lagegi! Chalo bag me daal diya!",
    "drapey_order_success": "Woohooo! Party timeee! Badhai ho! Hamare rider bhaiya bas 30 se 45 minutes me trial bag le kar aa rahe hain! Yayy!",
    "drapey_warning": "Oye cutie! 2 baar gudgudi kar di na! Ab 1 baar aur chhua toh main gusse me chhotu sa bomb ban jaunga! Hehe sach me!",
    "drapey_bomb_rage": "ARGHHH! 3 BAAR KYUN GUDGUDI KI?! Main phatne wala hoon! 3... 2... 1... BOOOMMM!",
    "drapey_soot": "Khasi-khasi... Hihihi, dekh liya mera cutie gussa? Ab chalo shanti se pyaari-pyaari shopping karo!",
    "drapey_tip_1": "Psst! Ek secret bataun? Pehle ghar par mirror ke samne 15 minute aaram se try karo!",
    "drapey_tip_2": "Confused ho? 2 sizes order karo, jo fit aaye wahi rakhna, dusra rider le jayega!",
    "drapey_tip_3": "Arey suno! Zero advance payment! Kapda dil ko bhaaye, tabhi paise dena!",
    "drapey_tip_4": "Superfast 30 se 45 minutes me rider bhaiya ghar aayenge, ready rehna trial ke liye!",
    "drapey_tip_5": "Koi fitting issue? Instant return bina kisi sawal ke! Riders bohot friendly hain!",
    "drapey_tip_6": "Ek secret bataun? Try and Buy model sirf smart shoppers use karte hain, jaise aap!",
    "drapey_tip_7": "Aap mujhe ungli se pakad kar screen par kahi bhi ghumma sakte ho! Masti!",
    "drapey_tip_8": "Mujhe baar-baar zor se mat dabana, mujhe bahut tez gussa aata hai! Hehe!"
}

OUT_DIR = os.path.abspath("sevenshadesfrontend/public/sounds")
os.makedirs(OUT_DIR, exist_ok=True)

async def generate_all():
    print(f"Generating {len(CUTE_DIALOGUES)} ultra-cute dialogues into {OUT_DIR}...")
    for key, text in CUTE_DIALOGUES.items():
        out_file = os.path.join(OUT_DIR, f"{key}.mp3")
        # Pitch +55Hz gives that irresistible anime/chibi sweet baby voice
        communicate = edge_tts.Communicate(
            text,
            voice="hi-IN-SwaraNeural",
            pitch="+55Hz",
            rate="+5%"
        )
        await communicate.save(out_file)
        print(f"-> Generated {key}.mp3 ({os.path.getsize(out_file) / 1024:.1f} KB)")

if __name__ == "__main__":
    asyncio.run(generate_all())
