// Web Audio API procedural sound effects & Natural Sweet / Cute Text-to-Speech
// 100% lightweight, zero external MP3 dependencies, fast & instant

let audioCtx = null;
let cachedVoices = [];

// Pre-cache voices and update when available
export const refreshVoices = () => {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    cachedVoices = window.speechSynthesis.getVoices() || [];
  }
};

if (typeof window !== 'undefined' && window.speechSynthesis) {
  refreshVoices();
  window.speechSynthesis.onvoiceschanged = refreshVoices;
}

export const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

// Check if sound is muted
export const isSoundMuted = () => {
  try {
    return localStorage.getItem('drapey_voice_muted') === 'true';
  } catch (_) {
    return false;
  }
};

export const setSoundMuted = (muted) => {
  try {
    localStorage.setItem('drapey_voice_muted', muted ? 'true' : 'false');
  } catch (_) {}
};

// Voice Profile (Sweet Natural vs Chibi Cartoon)
export const getVoiceProfile = () => {
  try {
    return localStorage.getItem('drapey_voice_profile') || 'sweet';
  } catch (_) {
    return 'sweet';
  }
};

export const setVoiceProfile = (profile) => {
  try {
    localStorage.setItem('drapey_voice_profile', profile);
  } catch (_) {}
};

// Clean emojis & symbols for natural text-to-speech pronunciation
export const cleanTextForSpeech = (text) => {
  if (!text) return '';
  return text
    .replace(/[🙏✨😉😎💸🚫🛵💨🤝💃🪞😤⚠️💣💥🔥🤪💖🎊🎉]/gu, '')
    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// Procedural Sound Effects using Web Audio API (Zero KB network overhead)
export const playDrapeySfx = (type) => {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  try {
    if (type === 'pop') {
      // Cute bubble pop (on tap / tips)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'yahoo') {
      // Cheerful multi-tone chime (Cart Add)
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = now + i * 0.055;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);
        gain.gain.setValueAtTime(0.18, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(noteStart);
        osc.stop(noteStart + 0.16);
      });
    } else if (type === 'order_success') {
      // Victory fanfare arpeggio
      const notes = [440, 554.37, 659.25, 880, 1108.73];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = now + i * 0.08;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);
        gain.gain.setValueAtTime(0.22, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.26);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(noteStart);
        osc.stop(noteStart + 0.26);
      });
    } else if (type === 'bomb') {
      // Comic cartoon explosion rumble & pop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.45);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === 'soot') {
      // Comic slide whistle down (post-explosion recovery)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.35);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'drag') {
      // Soft gentle pickup whoosh
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(560, now + 0.1);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'drop') {
      // Soft gentle landing plop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.09);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    }
  } catch (_) {}
};

// Select the most sweet, natural, pleasant voice available on the device
export const getBestCuteVoice = () => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = cachedVoices.length ? cachedVoices : (window.speechSynthesis.getVoices?.() || []);
  if (!voices.length) return null;

  // 1. Top preference: Indian Natural / Hindi Female (Swara, Neerja, Google Hindi, Kalpana)
  const indianFemale = voices.find(v => {
    const name = v.name.toLowerCase();
    const lang = (v.lang || '').toLowerCase();
    const isIndian = lang.startsWith('hi') || lang.includes('in') || name.includes('india') || name.includes('hindi');
    const isFemale = name.includes('female') || name.includes('swara') || name.includes('neerja') || name.includes('kalpana') || name.includes('heera');
    return isIndian && isFemale;
  });
  if (indianFemale) return indianFemale;

  // 2. High-quality natural female voices (Aria, Jenny, Google UK English Female, Samantha, Victoria, Zira)
  const naturalFemale = voices.find(v => {
    const name = v.name.toLowerCase();
    return (
      name.includes('swara') ||
      name.includes('neerja') ||
      name.includes('natural') ||
      name.includes('google uk english female') ||
      name.includes('aria') ||
      name.includes('jenny') ||
      name.includes('samantha') ||
      name.includes('zira') ||
      name.includes('victoria') ||
      name.includes('female')
    );
  });
  if (naturalFemale) return naturalFemale;

  // 3. Any female-sounding voice, explicitly avoiding adult male voices (David, Mark, George, Guy)
  const nonMale = voices.find(v => {
    const name = v.name.toLowerCase();
    return !name.includes('david') && !name.includes('mark') && !name.includes('george') && !name.includes('guy') && !name.includes('male');
  });
  if (nonMale) return nonMale;

  return voices[0] || null;
};

// Sweet, Natural, Pleasant Voice Text-To-Speech with Emotion
export const speakDrapeyVoice = (rawText, mood = 'happy') => {
  if (isSoundMuted()) return;
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  const text = cleanTextForSpeech(rawText);
  if (!text) return;

  try {
    // Cancel any previous speech so queues don't overlap
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoice = getBestCuteVoice();

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang || 'hi-IN';
    }

    const profile = getVoiceProfile();

    // Natural, sweet, youthful pitch (1.18x instead of chipmunk 1.62x)
    if (profile === 'chibi') {
      // Playful chibi / cartoon
      if (mood === 'yahoo') {
        utterance.pitch = 1.45;
        utterance.rate = 1.18;
      } else if (mood === 'celebrating') {
        utterance.pitch = 1.35;
        utterance.rate = 1.1;
      } else if (mood === 'angry' || mood === 'exploding') {
        utterance.pitch = 1.38;
        utterance.rate = 1.25;
      } else if (mood === 'soot') {
        utterance.pitch = 0.95;
        utterance.rate = 0.9;
      } else {
        utterance.pitch = 1.32;
        utterance.rate = 1.08;
      }
    } else {
      // 'sweet': Natural, sweet, human, gentle and cheerful (Default)
      if (mood === 'yahoo') {
        utterance.pitch = 1.28; // Cheerful bright lift
        utterance.rate = 1.12;
      } else if (mood === 'celebrating') {
        utterance.pitch = 1.22; // Sing-song joyful
        utterance.rate = 1.06;
      } else if (mood === 'angry' || mood === 'exploding') {
        utterance.pitch = 1.25; // Energetic dramatic
        utterance.rate = 1.18;
      } else if (mood === 'soot') {
        utterance.pitch = 0.92; // Dazed groggy
        utterance.rate = 0.88;
      } else {
        utterance.pitch = 1.16; // Natural sweet, warm, friendly (Sounds human & pleasant!)
        utterance.rate = 1.02;  // Clear, natural pace
      }
    }

    utterance.volume = 0.9;

    window.speechSynthesis.speak(utterance);
  } catch (_) {}
};


// Real OP Chiku Voice Clips (Extracted from user audio)
const CHIKU_SOUNDS = {
  greet: '/sounds/chiku_greet.wav',
  cart: '/sounds/chiku_cart.wav',
  poke: '/sounds/chiku_poke.wav',
  angry: '/sounds/chiku_angry.wav',
  full: '/sounds/op_chiku_voice.mp3'
};

let currentChikuAudio = null;

export const playChikuVoice = (clip = 'poke') => {
  if (isSoundMuted()) return;
  if (typeof window === 'undefined') return;

  try {
    if (currentChikuAudio) {
      currentChikuAudio.pause();
      currentChikuAudio.currentTime = 0;
    }
    const url = CHIKU_SOUNDS[clip] || CHIKU_SOUNDS.poke;
    const audio = new Audio(url);
    audio.volume = 0.95;
    currentChikuAudio = audio;
    audio.play().catch(() => {});
  } catch (_) {}
};

export const stopChikuVoice = () => {
  try {
    if (currentChikuAudio) {
      currentChikuAudio.pause();
      currentChikuAudio.currentTime = 0;
    }
  } catch (_) {}
};
