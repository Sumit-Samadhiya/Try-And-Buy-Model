import { useEffect, useRef, useState } from 'react';
import './DrapeyMascot.css';

const tips = [
  'Your next favourite outfit starts with a little try-on.',
  'Pick your favourites, then try them in the comfort of home.',
  'Keep what you love. Hand back the rest after your trial.',
];

// Original SVG artwork and CSS motion; no external avatar runtime or requests.
export default function DrapeyMascot() {
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem('doordrape-mascot-hidden') === '1'; } catch { return false; }
  });
  const [mood, setMood] = useState('waking');
  const [tip, setTip] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const reaction = useRef();

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    if (dismissed || paused || reduced) return undefined;
    let sleep;
    const wake = () => {
      setMood(current => current === 'sleeping' ? 'idle' : current);
      clearTimeout(sleep);
      sleep = setTimeout(() => setMood('sleeping'), 30000);
    };
    reaction.current = setTimeout(() => setMood('idle'), 1800);
    const events = ['pointerdown', 'keydown', 'scroll'];
    events.forEach(event => window.addEventListener(event, wake, { passive: true }));
    wake();
    return () => {
      clearTimeout(sleep);
      clearTimeout(reaction.current);
      events.forEach(event => window.removeEventListener(event, wake));
    };
  }, [dismissed, paused, reduced]);

  if (dismissed) return null;
  const greet = () => {
    setTip(value => (value + 1) % tips.length);
    if (paused || reduced) return;
    clearTimeout(reaction.current);
    setMood('happy');
    reaction.current = setTimeout(() => setMood('idle'), 1800);
  };
  const dismiss = () => {
    try { sessionStorage.setItem('doordrape-mascot-hidden', '1'); } catch { /* Optional preference. */ }
    setDismissed(true);
  };

  return <aside className={`drapey ${paused || reduced ? 'drapey--still' : ''}`} aria-label="Meet Drapey, your style companion">
    <button className={`drapey-character drapey--${mood}`} onClick={greet} aria-label="Say hello to Drapey and show another shopping tip">
      <svg viewBox="0 0 140 150" width="112" height="120" aria-hidden="true">
        <ellipse className="drapey-shadow" cx="70" cy="137" rx="36" ry="5" fill="#0b493b" opacity=".12" />
        <g className="drapey-body">
          <path d="M49 45V32a21 21 0 0 1 42 0v13" fill="none" stroke="#b88d47" strokeWidth="7" strokeLinecap="round" />
          <path d="M32 42Q70 32 108 42l9 73q1 17-18 18H41q-19-1-18-18Z" fill="#07513f" />
          <path d="M35 48q31-8 64-1" fill="none" stroke="#508674" strokeWidth="3" strokeLinecap="round" />
          <g className="drapey-eyes" fill="#fff0cf">
            <rect x="47" y="65" width="11" height="19" rx="5.5" />
            <rect x="82" y="65" width="11" height="19" rx="5.5" />
          </g>
          <path d="M62 94q8 7 16 0" fill="none" stroke="#fff0cf" strokeWidth="3" strokeLinecap="round" />
          <path d="M65 112v10h5a5 5 0 0 0 0-10Z" fill="none" stroke="#d9bb7f" strokeWidth="2" />
        </g>
      </svg>
    </button>
    <div className="drapey-copy">
      <span className="drapey-eyebrow">A LITTLE STYLE COMPANY</span>
      <h2>Meet Drapey.</h2>
      <p aria-live="polite">{tips[tip]}</p>
      <button className="drapey-tip" onClick={greet}>Next style tip <span aria-hidden="true">↗</span></button>
    </div>
    <div className="drapey-controls">
      {!reduced && <button onClick={() => setPaused(value => !value)} aria-label={paused ? 'Play mascot animation' : 'Pause mascot animation'} aria-pressed={paused}>{paused ? '▷' : 'Ⅱ'}</button>}
      <button onClick={dismiss} aria-label="Hide Drapey for this session">×</button>
    </div>
  </aside>;
}
