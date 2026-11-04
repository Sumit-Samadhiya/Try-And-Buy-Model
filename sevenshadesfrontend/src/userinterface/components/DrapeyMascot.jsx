import { useEffect, useRef, useState, useCallback } from 'react';
import DrapeyAvatar from './DrapeyAvatar';
import { playDrapeySfx, speakDrapeyVoice, playChikuVoice, stopChikuVoice, playDrapeyDialogue, stopAllVoices, isSoundMuted, setSoundMuted } from './drapeyAudio';
import './DrapeyMascot.css';

const greeting = 'Hey! Hehe! Hii cutie! 💖 Main Drapey hoon — aapka chhotu sa shopping dost! Pehle ghar baithe mast try karo, pasand aaye tabhi khareedo na! 😉✨';
const clamp = (value, low, high) => Math.max(low, Math.min(Math.max(low, high), value));

const NAUGHTY_TIPS = [
  'Psst! Ek secret bataun? Pehle ghar par mirror ke samne 15 minute aaram se try karo! 🪞😎',
  'Confused ho? 2 sizes order karo, jo fit aaye wahi rakhna, dusra rider le jayega! 😉',
  'Arey suno! Zero advance payment! Kapda dil ko bhaaye, tabhi paise dena! 💸💖',
  'Superfast 30 se 45 minutes me rider bhaiya ghar aayenge, ready rehna trial ke liye! 🛵💨',
  'Koi fitting issue? Instant return bina kisi sawal ke! Riders bohot friendly hain! 🤝',
  'Ek secret bataun? Try & Buy model sirf smart shoppers use karte hain, jaise aap! 😉✨',
  'Aap mujhe ungli se pakad kar screen par kahi bhi ghumma sakte ho! Masti! 🎈',
  'Mujhe baar-baar zor se mat dabana, mujhe bahut tez gussa aata hai! Hehe! 😤'
];

export function calculateBubbleLayout(x, y, width, height, bubbleHeight = 98) {
  const mobile = width <= 600;
  const size = mobile ? 54 : 64;
  const bubbleWidth = Math.min(mobile ? 230 : 270, width - 24);
  const bottom = height - (mobile ? 100 : 24);
  const below = y - bubbleHeight - 25 < 60 && y + size + bubbleHeight + 25 < bottom;
  const left = clamp(x + size / 2 - bubbleWidth / 2, 12, width - bubbleWidth - 12);
  const offset = left - x;
  const tail = clamp(x + size / 2 - left, 18, bubbleWidth - 18);
  return { below, offset, tail };
}

export function guidePosition(scroll, width, height, bubbleHeight = 98) {
  const mobile = width <= 600;
  const size = mobile ? 54 : 64;
  const bubbleWidth = Math.min(mobile ? 230 : 270, width - 24);
  const bottom = height - (mobile ? 100 : 24);
  // A continuous curved travel path, independent of heading/section heights.
  const x = clamp(width * (.79 + .12 * Math.sin(scroll / 390)), 12, width - size - 16);
  const y = clamp(height * (.47 + .26 * Math.sin(scroll / 310 + .8)), 118, bottom - size);
  const below = y - bubbleHeight - 25 < 112 && y + size + bubbleHeight + 25 < bottom;
  const safeY = below ? y : Math.max(Math.min(bottom - size, bubbleHeight + 128), y);
  const left = clamp(x + size - bubbleWidth, 12, width - bubbleWidth - 12);
  return { x, y: safeY, below, offset: left - x, tail: clamp(x + size / 2 - left, 18, bubbleWidth - 18) };
}

export default function DrapeyMascot({ routeKey = 'home', greetingMessage = greeting }) {
  const [reduced, setReduced] = useState(false);
  const [message, setMessage] = useState(greetingMessage);
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState('thinking');
  const [replay, setReplay] = useState(0);
  const [sleepy, setSleepy] = useState(false);
  const [position, setPosition] = useState(() => guidePosition(0, window.innerWidth, window.innerHeight));
  const [isDragging, setIsDragging] = useState(false);
  const [muted, setMuted] = useState(() => isSoundMuted());
  const bubble = useRef(null);
  const dismissed = useRef(false);
  const feedbackUntil = useRef(0);
  const [tone, setTone] = useState('info');

  // Drag & Drop tracking
  const isCustomPlacedRef = useRef(false);
  const dragStartRef = useRef(null);
  const hasDraggedRef = useRef(false);
  const lastDragEndTimeRef = useRef(0);

  // Emotional states & Easter egg states
  const [rageState, setRageState] = useState('normal'); // 'normal' | 'angry' | 'exploding' | 'soot'
  const [specialAction, setSpecialAction] = useState(null); // null | 'yahoo' | 'order_success' | 'poke'
  const [hearts, setHearts] = useState([]);
  const clickTimestamps = useRef([]);
  const rageTimer = useRef(null);
  const tipIndex = useRef(0);

  // Computed mood for avatar
  const mood = reduced
    ? 'idle'
    : rageState === 'angry' || rageState === 'exploding'
    ? 'angry'
    : rageState === 'soot'
    ? 'soot'
    : specialAction === 'yahoo'
    ? 'yahoo'
    : specialAction === 'order_success'
    ? 'celebrating'
    : sleepy
    ? 'sleeping'
    : phase === 'thinking'
    ? 'thinking'
    : phase === 'typing'
    ? 'speaking'
    : phase === 'speaking'
    ? (tone === 'error' ? 'thinking' : 'happy')
    : 'idle';

  const handleToggleMute = useCallback(e => {
    e.stopPropagation();
    setMuted(prev => {
      const next = !prev;
      setSoundMuted(next);
      if (!next) {
        playDrapeySfx('pop');
        playDrapeyDialogue('greeting', greetingMessage, 'happy');
      } else {
        stopAllVoices();
      }
      return next;
    });
  }, [greetingMessage]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    let frame;
    const update = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        const sections = ['home', '/', '/home'].includes(routeKey) ? [...document.querySelectorAll('[data-drapey-message]')] : [];
        const active = sections.filter(section => section.getBoundingClientRect().top <= window.innerHeight * .5).pop();
        if (Date.now() >= feedbackUntil.current && rageState === 'normal' && !specialAction) {
          setTone('info');
          setMessage(active?.dataset.drapeyMessage || greetingMessage);
        }

        // If user has custom placed Drapey via drag-drop, maintain his position and clamp on resize
        if (isCustomPlacedRef.current) {
          setPosition(old => {
            const mobile = window.innerWidth <= 600;
            const size = mobile ? 54 : 64;
            const clampedX = clamp(old.x, 10, window.innerWidth - size - 10);
            const clampedY = clamp(old.y, 40, window.innerHeight - size - 20);
            const layout = calculateBubbleLayout(clampedX, clampedY, window.innerWidth, window.innerHeight, bubble.current?.offsetHeight || 98);
            if (old.x === clampedX && old.y === clampedY && old.below === layout.below && old.offset === layout.offset && old.tail === layout.tail) {
              return old;
            }
            return { x: clampedX, y: clampedY, below: layout.below, offset: layout.offset, tail: layout.tail };
          });
          return;
        }

        const next = guidePosition(window.scrollY, window.innerWidth, window.innerHeight, bubble.current?.offsetHeight || 98);
        if (!['home', '/', '/home'].includes(routeKey)) {
          const mobile = window.innerWidth <= 600;
          next.x = mobile ? window.innerWidth - 70 : 24;
          next.y = Math.max(150, window.innerHeight - (mobile ? 170 : 100));
          next.below = false;
          next.offset = mobile ? -176 : 0;
          next.tail = mobile ? 200 : 32;
        }
        setPosition(old => Object.keys(next).every(key => old[key] === next[key]) ? old : next);
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    if (bubble.current) resize?.observe(bubble.current);
    const main = document.querySelector('main');
    if (main) resize?.observe(main);
    return () => {
      cancelAnimationFrame(frame);
      resize?.disconnect();
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [routeKey, greetingMessage, rageState, specialAction]);

  useEffect(() => {
    const feedback = event => {
      const detail = event.detail;
      if (!detail || typeof detail.message !== 'string' || !detail.message.trim()) return;

      const actionTone = detail.tone || 'info';
      setSleepy(false);
      setTone(actionTone);
      setMessage(detail.message.slice(0, 220));
      setReplay(value => value + 1);

      if (actionTone === 'add_to_cart') {
        feedbackUntil.current = Date.now() + 6000;
        setSpecialAction('yahoo');
        playDrapeySfx('yahoo');
        playDrapeyDialogue('cart', detail.message, 'yahoo');
        setTimeout(() => setSpecialAction(null), 3600);
      } else if (actionTone === 'order_success') {
        feedbackUntil.current = Date.now() + 9000;
        setSpecialAction('order_success');
        playDrapeySfx('order_success');
        playDrapeyDialogue('order_success', detail.message, 'celebrating');
        setTimeout(() => setSpecialAction(null), 5000);
      } else {
        feedbackUntil.current = Date.now() + 14000;
        playDrapeySfx('pop');
        speakDrapeyVoice(detail.message, actionTone === 'error' ? 'thinking' : 'happy');
      }
    };

    const invalid = () => feedback({ detail: { message: 'Please check the highlighted field before continuing.', tone: 'error' } });
    window.addEventListener('drapey-feedback', feedback);
    document.addEventListener('invalid', invalid, true);
    return () => {
      window.removeEventListener('drapey-feedback', feedback);
      document.removeEventListener('invalid', invalid, true);
    };
  }, []);

  useEffect(() => {
    let typing;
    let hide;
    dismissed.current = false;
    setTyped(reduced ? message : '');
    setPhase(reduced ? 'speaking' : 'thinking');
    const start = setTimeout(() => {
      if (reduced || dismissed.current) return;
      setPhase('typing');
      speakDrapeyVoice(message, mood);
      let index = 0;
      const letters = Array.from(message);
      typing = setInterval(() => {
        if (dismissed.current) {
          clearInterval(typing);
          return;
        }
        index += 1;
        setTyped(letters.slice(0, index).join(''));
        if (index >= letters.length) {
          clearInterval(typing);
          setPhase('speaking');
          hide = setTimeout(() => setPhase('quiet'), 7000);
        }
      }, 25);
    }, 600);
    return () => {
      clearTimeout(start);
      clearTimeout(hide);
      clearInterval(typing);
    };
  }, [message, replay, reduced]);

  useEffect(() => {
    let timer;
    const wake = () => {
      setSleepy(false);
      clearTimeout(timer);
      timer = setTimeout(() => setSleepy(true), 30000);
    };
    const key = event => {
      if (event.key === 'Escape') {
        dismissed.current = true;
        setPhase('quiet');
        stopAllVoices();
      }
      wake();
    };
    const visibility = () => setSleepy(document.hidden);
    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('pointerdown', wake);
    window.addEventListener('keydown', key);
    document.addEventListener('visibilitychange', visibility);
    wake();
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', wake);
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', key);
      document.removeEventListener('visibilitychange', visibility);
      clearTimeout(rageTimer.current);
    };
  }, []);

  // Rapid Touch / Triple Click Bomb Rage Trigger
  const triggerBombRage = useCallback(() => {
    feedbackUntil.current = Date.now() + 10000;
    setTone('error');
    setRageState('angry');
    const rageMsg = 'ARGHHH! 3 BAAR KYUN DABAYA?! 💣😡 Ab dekho mera cutie gussa... Main phatne wala hoon! 💥';
    setMessage(rageMsg);
    setReplay(v => v + 1);
    playDrapeySfx('bomb');
    playDrapeyDialogue('bomb_rage', rageMsg, 'angry');

    clearTimeout(rageTimer.current);
    rageTimer.current = setTimeout(() => {
      // Explosion phase
      setRageState('exploding');
      setMessage('💥 KABOOOMMM!! 💥💣🔥');

      rageTimer.current = setTimeout(() => {
        // Soot recovery phase
        setRageState('soot');
        const sootMsg = 'Khasi-khasi... 💨 Hihihi, dekh liya mera cutie gussa? Ab chalo shanti se pyaari shopping karo! 💖';
        setMessage(sootMsg);
        setReplay(v => v + 1);
        playDrapeySfx('soot');
        playDrapeyDialogue('soot', sootMsg, 'soot');

        rageTimer.current = setTimeout(() => {
          // Return to normal
          setRageState('normal');
          setMessage(greetingMessage);
          setTone('info');
          setReplay(v => v + 1);
        }, 2800);
      }, 1000);
    }, 1400);
  }, [greetingMessage]);

  // Drag & Drop Pointer Handlers
  const handlePointerDown = event => {
    if (event.button !== undefined && event.button !== 0 && event.pointerType === 'mouse') return;
    const clientX = event.clientX ?? (event.touches?.[0]?.clientX ?? 0);
    const clientY = event.clientY ?? (event.touches?.[0]?.clientY ?? 0);
    dragStartRef.current = {
      pointerX: clientX,
      pointerY: clientY,
      mascotX: position.x,
      mascotY: position.y,
      pointerId: event.pointerId
    };
    hasDraggedRef.current = false;
    playDrapeySfx('drag');
    try {
      event.currentTarget?.setPointerCapture?.(event.pointerId);
    } catch (_) {}
  };

  const handlePointerMove = event => {
    if (!dragStartRef.current) return;
    const clientX = event.clientX ?? (event.touches?.[0]?.clientX ?? 0);
    const clientY = event.clientY ?? (event.touches?.[0]?.clientY ?? 0);
    const dx = clientX - dragStartRef.current.pointerX;
    const dy = clientY - dragStartRef.current.pointerY;

    if (!hasDraggedRef.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      hasDraggedRef.current = true;
      isCustomPlacedRef.current = true;
      setIsDragging(true);
    }

    if (hasDraggedRef.current) {
      const mobile = window.innerWidth <= 600;
      const size = mobile ? 54 : 64;
      const newX = clamp(dragStartRef.current.mascotX + dx, 10, window.innerWidth - size - 10);
      const newY = clamp(dragStartRef.current.mascotY + dy, 40, window.innerHeight - size - 20);
      const layout = calculateBubbleLayout(newX, newY, window.innerWidth, window.innerHeight, bubble.current?.offsetHeight || 98);
      setPosition({
        x: newX,
        y: newY,
        below: layout.below,
        offset: layout.offset,
        tail: layout.tail
      });
    }
  };

  const handlePointerUp = event => {
    if (!dragStartRef.current) return;
    try {
      event.currentTarget?.releasePointerCapture?.(event.pointerId);
    } catch (_) {}
    dragStartRef.current = null;
    setIsDragging(false);
    if (hasDraggedRef.current) {
      playDrapeySfx('drop');
      lastDragEndTimeRef.current = Date.now();
      setTimeout(() => {
        hasDraggedRef.current = false;
      }, 350);
    }
  };

  const handlePointerCancel = event => {
    if (!dragStartRef.current) return;
    try {
      event.currentTarget?.releasePointerCapture?.(event.pointerId);
    } catch (_) {}
    dragStartRef.current = null;
    setIsDragging(false);
    hasDraggedRef.current = false;
  };

  const handleCharacterClick = () => {
    // If user was dragging, ignore click event
    if (hasDraggedRef.current || Date.now() - lastDragEndTimeRef.current < 350) {
      return;
    }

    setSleepy(false);
    if (rageState !== 'normal') return;

    const now = Date.now();
    // Keep clicks within the last 1200ms
    clickTimestamps.current = clickTimestamps.current.filter(t => now - t <= 1200);
    clickTimestamps.current.push(now);

    const clicksInWindow = clickTimestamps.current.length;

    if (clicksInWindow >= 3) {
      clickTimestamps.current = [];
      triggerBombRage();
      return;
    }

    // Cute floating heart or sparkle particle on every tap
    const cuteSymbols = ['💖', '✨', '🌸', '🎀'];
    const newHeart = {
      id: Date.now() + Math.random(),
      symbol: cuteSymbols[Math.floor(Math.random() * cuteSymbols.length)],
      x: Math.random() * 24 - 12
    };
    setHearts(prev => [...prev.slice(-3), newHeart]);
    setTimeout(() => {
      setHearts(prev => prev.filter(h => h.id !== newHeart.id));
    }, 950);

    if (clicksInWindow === 2) {
      feedbackUntil.current = Date.now() + 4500;
      setTone('warning');
      const warnMsg = 'Oye cutie! 2 baar chhu diya na! 🙈 Ek baar aur tap kiya toh main gusse me bomb ban jaunga, bata raha hoon! 😤⚠️💣';
      setMessage(warnMsg);
      setReplay(v => v + 1);
      setSpecialAction('poke');
      playDrapeySfx('squeak');
      playDrapeyDialogue('warning', warnMsg, 'angry');
      setTimeout(() => setSpecialAction(null), 800);
      return;
    }

    // Single click: cycle through tips
    const currentIdx = tipIndex.current % NAUGHTY_TIPS.length;
    const tip = NAUGHTY_TIPS[currentIdx];
    tipIndex.current += 1;
    feedbackUntil.current = Date.now() + 8000;
    setTone('info');
    setMessage(tip);
    setReplay(v => v + 1);
    setSpecialAction('poke');
    playDrapeySfx('squeak');
    playDrapeyDialogue(`tip_${currentIdx + 1}`, tip, 'happy');
    setTimeout(() => setSpecialAction(null), 800);
  };

  const isRage = rageState !== 'normal';
  const characterModifier = isRage
    ? `drapey-rage--${rageState}`
    : specialAction
    ? `drapey--${specialAction}-active`
    : `drapey--${mood}`;

  return (
    <aside
      className={`drapey ${position.below ? 'drapey--bubble-below' : 'drapey--bubble-above'} ${
        reduced ? 'drapey--still' : ''
      } drapey--${phase} ${isRage ? `drapey-mode--${rageState}` : ''} ${
        specialAction ? `drapey-action--${specialAction}` : ''
      } ${isDragging ? 'drapey--dragging' : ''}`}
      aria-label="Drapey style guide"
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        '--bubble-offset': `${position.offset}px`,
        '--tail': `${position.tail}px`
      }}
    >
      <button
        className={`drapey-character ${characterModifier}`}
        onClick={handleCharacterClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        aria-label="Talk to Drapey"
        title="Drag me anywhere or click to chat!"
        onKeyDown={event => {
          if (event.key === 'Escape') setPhase('quiet');
        }}
      >
        <DrapeyAvatar mood={mood} reduced={reduced} />
        <span className="drapey-ground" aria-hidden="true" />

        {/* Floating Cute Hearts & Sparkles on Tap */}
        {hearts.map(h => (
          <span key={h.id} className="drapey-heart-particle" style={{ '--hx': `${h.x}px` }} aria-hidden="true">
            {h.symbol}
          </span>
        ))}

        {/* Visual FX Overlays */}
        {specialAction === 'yahoo' && (
          <span className="drapey-yahoo-stars" aria-hidden="true">
            <span>✨</span><span>🎉</span><span>💃</span>
          </span>
        )}

        {specialAction === 'order_success' && (
          <span className="drapey-order-particles" aria-hidden="true">
            <span>🛵</span><span>🎊</span><span>💖</span>
          </span>
        )}

        {rageState === 'exploding' && (
          <span className="drapey-bomb-explosion" aria-hidden="true">
            <span className="drapey-shockwave" />
            <span className="drapey-boom-text">💥 BOOM! 💥</span>
          </span>
        )}
      </button>

      <div
        ref={bubble}
        className={`drapey-copy drapey-copy--${tone} ${isRage ? `drapey-copy--${rageState}` : ''} ${
          specialAction ? `drapey-copy--${specialAction}` : ''
        }`}
        aria-hidden={phase === 'quiet'}
      >
        <span
          role="switch"
          aria-checked={!muted}
          tabIndex={0}
          className="drapey-sound-toggle"
          onClick={handleToggleMute}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleToggleMute(e);
            }
          }}
          title={muted ? 'Cute baby voice muted - click to enable' : 'Cute baby voice active - click to mute'}
          aria-label={muted ? 'Unmute Drapey baby voice' : 'Mute Drapey baby voice'}
        >
          {muted ? '🔇' : '🔊'}
        </span>
        <span className="sr-only">{message}</span>
        <span aria-hidden="true" className="drapey-speech">
          {phase === 'thinking' ? (
            <span className="drapey-dots">
              <i /><i /><i />
            </span>
          ) : (
            typed
          )}
        </span>
      </div>
    </aside>
  );
}
