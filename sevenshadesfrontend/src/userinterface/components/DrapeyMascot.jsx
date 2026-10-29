import { useEffect, useRef, useState } from 'react';
import DrapeyAvatar from './DrapeyAvatar';
import './DrapeyMascot.css';

const greeting = 'Hey! I’m Drapey. Let’s find something you’ll love 😊';
const clamp = (value, low, high) => Math.max(low, Math.min(Math.max(low, high), value));

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
  return { x, y:safeY, below, offset:left - x, tail:clamp(x + size / 2 - left, 18, bubbleWidth - 18) };
}

export default function DrapeyMascot({ routeKey = 'home', greetingMessage = greeting }) {
  const [reduced, setReduced] = useState(false);
  const [message, setMessage] = useState(greetingMessage);
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState('thinking');
  const [replay, setReplay] = useState(0);
  const [sleepy, setSleepy] = useState(false);
  const [position, setPosition] = useState(() => guidePosition(0, window.innerWidth, window.innerHeight));
  const bubble = useRef(null);
  const dismissed = useRef(false);
  const feedbackUntil = useRef(0);
  const [tone, setTone] = useState('info');
  const mood = reduced ? 'idle' : sleepy ? 'sleeping' : phase === 'thinking' ? 'thinking' : phase === 'typing' ? 'speaking' : phase === 'speaking' ? (tone === 'error' ? 'thinking' : 'happy') : 'idle';

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
        if (Date.now() >= feedbackUntil.current) {
          setTone('info');
          setMessage(active?.dataset.drapeyMessage || greetingMessage);
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
    window.addEventListener('scroll', update, { passive:true });
    window.addEventListener('resize', update);
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    if (bubble.current) resize?.observe(bubble.current);
    const main = document.querySelector('main');
    if (main) resize?.observe(main);
    return () => { cancelAnimationFrame(frame); resize?.disconnect(); window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [routeKey, greetingMessage]);

  useEffect(() => {
    const feedback = event => {
      const detail = event.detail;
      if (!detail || typeof detail.message !== 'string' || !detail.message.trim()) return;
      feedbackUntil.current = Date.now() + 14000;
      setTone(detail.tone || 'info');
      setMessage(detail.message.slice(0, 220));
      setSleepy(false);
      setReplay(value => value + 1);
    };
    const invalid = () => feedback({ detail: { message: 'Please check the highlighted field before continuing.', tone: 'error' } });
    window.addEventListener('drapey-feedback', feedback);
    document.addEventListener('invalid', invalid, true);
    return () => { window.removeEventListener('drapey-feedback', feedback); document.removeEventListener('invalid', invalid, true); };
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
      let index = 0;
      const letters = Array.from(message);
      typing = setInterval(() => {
        if (dismissed.current) { clearInterval(typing); return; }
        index += 1;
        setTyped(letters.slice(0, index).join(''));
        if (index >= letters.length) {
          clearInterval(typing);
          setPhase('speaking');
          hide = setTimeout(() => setPhase('quiet'), 6500);
        }
      }, 30);
    }, 700);
    return () => { clearTimeout(start); clearTimeout(hide); clearInterval(typing); };
  }, [message, replay, reduced]);

  useEffect(() => {
    let timer;
    const wake = () => { setSleepy(false); clearTimeout(timer); timer = setTimeout(() => setSleepy(true), 30000); };
    const key = event => { if (event.key === 'Escape') { dismissed.current = true; setPhase('quiet'); } wake(); };
    const visibility = () => setSleepy(document.hidden);
    window.addEventListener('scroll', wake, { passive:true });
    window.addEventListener('pointerdown', wake);
    window.addEventListener('keydown', key);
    document.addEventListener('visibilitychange', visibility);
    wake();
    return () => { clearTimeout(timer); window.removeEventListener('scroll', wake); window.removeEventListener('pointerdown', wake); window.removeEventListener('keydown', key); document.removeEventListener('visibilitychange', visibility); };
  }, []);

  return <aside className={`drapey ${position.below ? 'drapey--bubble-below' : 'drapey--bubble-above'} ${reduced ? 'drapey--still' : ''} drapey--${phase}`} aria-label="Drapey style guide"
    style={{ transform:`translate3d(${position.x}px, ${position.y}px, 0)`, '--bubble-offset':`${position.offset}px`, '--tail':`${position.tail}px` }}>
    <button className={`drapey-character drapey--${mood}`} onClick={() => { setSleepy(false); setReplay(value => value + 1); }} aria-label="Talk to Drapey" onKeyDown={event => { if (event.key === 'Escape') setPhase('quiet'); }}>
      <DrapeyAvatar mood={mood} reduced={reduced} />
      <span className="drapey-ground" aria-hidden="true" />
    </button>
    <div ref={bubble} className="drapey-copy" aria-hidden={phase === 'quiet'}>
      <span className="sr-only">{message}</span>
      <span aria-hidden="true" className="drapey-speech">{phase === 'thinking' ? <span className="drapey-dots"><i/><i/><i/></span> : typed}</span>
    </div>
  </aside>;
}
