// Web Audio API procedural sound effects & Cute Child/Baby Text-to-Speech
// 100% lightweight, zero external MP3 dependencies, fast & instant

let audioCtx = null;

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

// Clean emojis & special symbols for clean text-to-speech pronunciation
export const cleanTextForSpeech = (text) => {
  if (!text) return '';
  return text
    // Remove specific emojis & unicode symbols
    .replace(/[🙏✨😉😎💸🚫🛵💨🤝💃🪞😤⚠️💣💥🔥🤪💖🎊🎉]/gu, '')
    // Remove general emojis
    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
    // Clean repetitive exclamation marks or spaces
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

// Cute Child / Baby Voice Text-To-Speech with Emotion
export const speakDrapeyVoice = (rawText, mood = 'happy') => {
  if (isSoundMuted()) return;
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  const text = cleanTextForSpeech(rawText);
  if (!text) return;

  try {
    // Cancel any previous speech so queues don't overlap
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Pick best child-friendly / Hindi / natural female voice
    const voices = window.speechSynthesis.getVoices?.() || [];
    const preferredVoice =
      voices.find(v => v.lang.startsWith('hi') || v.name.toLowerCase().includes('hindi')) ||
      voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('samantha')) ||
      voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    // Configure Child Baby Timbre (High pitch, cute cadence) with emotional pitch modulation
    if (mood === 'yahoo') {
      utterance.pitch = 1.85; // Extra high squeal of joy!
      utterance.rate = 1.22;  // Fast excited
    } else if (mood === 'celebrating') {
      utterance.pitch = 1.72; // Sing-song celebration
      utterance.rate = 1.15;
    } else if (mood === 'angry' || mood === 'exploding') {
      utterance.pitch = 1.48; // Squeaky baby tantrum!
      utterance.rate = 1.32;
    } else if (mood === 'soot') {
      utterance.pitch = 1.05; // Dazed groggy baby
      utterance.rate = 0.88;
    } else {
      // Default sweet baby / child voice
      utterance.pitch = 1.62; // High-pitch cute baby
      utterance.rate = 1.12;  // Cheerful sweet pace
    }

    utterance.volume = 0.85;

    window.speechSynthesis.speak(utterance);
  } catch (_) {}
};
