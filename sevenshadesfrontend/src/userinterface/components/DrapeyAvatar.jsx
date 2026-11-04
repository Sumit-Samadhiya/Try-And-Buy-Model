import { useEffect, useRef } from 'react';
import definition from './strobi.avatar.json';
import pookieBowImg from './pookie-bow.png';

// Strobi by Bible Strong Avatar Lab (AGPL-3.0-only); see docs/DRAPEY_MASCOT.md.
export default function DrapeyAvatar({ mood, reduced }) {
  const host = useRef(null);
  const controller = useRef(null);
  const state = useRef({ mood, reduced });
  state.current = { mood, reduced };

  useEffect(() => {
    let cancelled = false;
    import('@bible-strong/avatar-web')
      .then(({ createAvatar }) => {
        if (cancelled) return;
        controller.current = createAvatar(host.current, { definition, size: '100%', defaultExpression: 'neutral' });
        const svg = host.current.querySelector('svg');
        const ns = 'http://www.w3.org/2000/svg';
        const gradient = document.createElementNS(ns, 'radialGradient');
        const id = `${svg.querySelector('clipPath').id}-shade`;
        gradient.id = id;
        gradient.setAttribute('cx', '30%');
        gradient.setAttribute('cy', '22%');
        gradient.setAttribute('r', '80%');
        [
          ['0%', '#c5e9b7'],
          ['24%', '#69ad80'],
          ['68%', '#177359'],
          ['100%', '#064331']
        ].forEach(([offset, color]) => {
          const stop = document.createElementNS(ns, 'stop');
          stop.setAttribute('offset', offset);
          stop.setAttribute('stop-color', color);
          gradient.append(stop);
        });
        svg.querySelector('defs').append(gradient);
        [...svg.children]
          .filter(element => element.tagName.toLowerCase() === 'path')
          .forEach(path => {
            path.style.fill = `url(#${id})`;
          });
        if (!state.current.reduced) {
          const targetAnim =
            state.current.mood === 'speaking' || state.current.mood === 'yahoo' || state.current.mood === 'celebrating'
              ? 'happy'
              : state.current.mood;
          controller.current.play(targetAnim);
        }
      })
      .catch(() => {
        // Graceful fallback to inline SVG features if dynamic import fails
      });
    return () => {
      cancelled = true;
      controller.current?.destroy();
      controller.current = null;
    };
  }, []);

  useEffect(() => {
    if (reduced) {
      controller.current?.stop();
    } else {
      const targetAnim =
        mood === 'speaking' || mood === 'yahoo' || mood === 'celebrating' || mood === 'angry' ? 'happy' : mood;
      controller.current?.play(targetAnim);
    }
  }, [mood, reduced]);

  return (
    <span className={`drapey-avatar drapey-face--${mood} ${reduced ? 'drapey-face--still' : ''}`} aria-hidden="true">
      <span className="drapey-runtime" ref={host} />

      {/* Pookie Pink Ribbon Bow on Head */}
      <span className="drapey-pookie-bow" aria-hidden="true">
        <img src={pookieBowImg} alt="" className="drapey-bow-img" />
      </span>

      <svg className="drapey-features" viewBox="0 0 100 100">
        <defs>
          <radialGradient id="drapey-tip-shine" cx="30%" cy="25%">
            <stop stopColor="#d9efb1" />
            <stop offset="1" stopColor="#3f996b" />
          </radialGradient>
          <radialGradient id="drapey-tip-rage" cx="30%" cy="25%">
            <stop stopColor="#fca5a5" />
            <stop offset="1" stopColor="#dc2626" />
          </radialGradient>
          {/* Pookie Rosy Blush Glow */}
          <radialGradient id="drapey-blush-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff4d79" stopOpacity="0.85" />
            <stop offset="65%" stopColor="#ff6584" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ff85a2" stopOpacity="0" />
          </radialGradient>
          {/* Eye Iris Depth Gradient */}
          <linearGradient id="drapey-iris-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#022c22" />
            <stop offset="65%" stopColor="#064e3b" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>

        {/* Antenna */}
        <g className="drapey-antenna">
          <path
            d="M52 15Q54 5 58 0"
            stroke={mood === 'angry' ? '#ef4444' : mood === 'soot' ? '#4b5563' : '#5d9e71'}
            strokeWidth="3"
            fill="none"
          />
          <circle
            cx="59"
            cy="0"
            r="4.8"
            fill={mood === 'angry' ? 'url(#drapey-tip-rage)' : mood === 'soot' ? '#374151' : 'url(#drapey-tip-shine)'}
          />
        </g>

        {/* Hands */}
        {mood === 'yahoo' || mood === 'celebrating' ? (
          <g className="drapey-hands drapey-hands--celebrate" fill="#5b9f76">
            <ellipse cx="14" cy="50" rx="4.5" ry="10" transform="rotate(-38 14 50)" />
            <ellipse cx="86" cy="50" rx="4.5" ry="10" transform="rotate(38 86 50)" />
          </g>
        ) : (
          <g className="drapey-hands" fill={mood === 'soot' ? '#374151' : mood === 'angry' ? '#b91c1c' : '#5b9f76'}>
            <ellipse cx="11" cy="68" rx="4.5" ry="10" transform="rotate(28 11 68)" />
            <ellipse cx="89" cy="68" rx="4.5" ry="10" transform="rotate(-28 89 68)" />
          </g>
        )}

        <ellipse cx="36" cy="28" rx="10" ry="5" fill="#e9f9d6" opacity={mood === 'soot' ? 0.05 : 0.25} transform="rotate(-30 36 28)" />

        {/* Cute Eyebrows */}
        {mood !== 'sleeping' && mood !== 'angry' && (
          <g className="drapey-eyebrows" stroke="#064e3b" strokeWidth="2.2" strokeLinecap="round" fill="none">
            <path d="M32 37 Q37 33 43 37" />
            <path d="M57 37 Q63 33 68 37" />
          </g>
        )}

        {/* Cheeks - Cute Rosy Pookie Blush */}
        {mood !== 'soot' && (
          <g className="drapey-cheeks">
            <ellipse cx="27" cy="61" rx="6.5" ry="4" fill="url(#drapey-blush-glow)" />
            <ellipse cx="73" cy="61" rx="6.5" ry="4" fill="url(#drapey-blush-glow)" />
            <circle cx="25" cy="59.5" r="0.9" fill="#ffffff" opacity="0.9" />
            <circle cx="75" cy="59.5" r="0.9" fill="#ffffff" opacity="0.9" />
          </g>
        )}

        {/* Facial Expressions */}
        {mood === 'sleeping' ? (
          <g fill="none" stroke="#092e25" strokeWidth="2.8" strokeLinecap="round">
            <path d="M33 49q5 5 10 0M57 49q5 5 10 0" />
            <path d="M47 65q3-2 6 0" />
          </g>
        ) : mood === 'angry' ? (
          <>
            {/* Slanted Angry Eyebrows */}
            <path d="M28 41 L44 48 M72 41 L56 48" stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round" />
            {/* Angry Burning Eyes */}
            <g className="drapey-angry-eyes">
              <ellipse cx="38" cy="49" rx="5.5" ry="7" fill="#ffffff" />
              <ellipse cx="62" cy="49" rx="5.5" ry="7" fill="#ffffff" />
              <circle cx="39" cy="49" r="3" fill="#dc2626" />
              <circle cx="61" cy="49" r="3" fill="#dc2626" />
              <circle cx="38" cy="48" r="1" fill="#fee2e2" />
              <circle cx="60" cy="48" r="1" fill="#fee2e2" />
            </g>
            {/* Shouting Angry Mouth */}
            <path d="M41 67 Q50 58 59 67 Q50 73 41 67 Z" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1.5" />
            {/* Anger Mark */}
            <path d="M68 18 Q72 12 76 18 Q80 12 84 18" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
          </>
        ) : mood === 'yahoo' || mood === 'celebrating' ? (
          <>
            {/* Happy Crescent Eyes */}
            <g className="drapey-yahoo-eyes" fill="none" stroke="#064e3b" strokeWidth="3.4" strokeLinecap="round">
              <path d="M32 50 Q38 41 44 50" />
              <path d="M56 50 Q62 41 68 50" />
            </g>
            {/* Big Joyful Laughing Mouth with Tongue */}
            <path d="M42 62 Q50 74 58 62 Z" fill="#092e25" />
            <path d="M46 68 Q50 74 54 68 Z" fill="#ff4d79" />
          </>
        ) : mood === 'soot' ? (
          <>
            {/* Dazed Cross Eyes */}
            <g stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round">
              <path d="M33 46 L43 54 M43 46 L33 54" />
              <path d="M57 46 L67 54 M67 46 L57 54" />
            </g>
            <path d="M43 66 Q47 62 50 66 Q53 70 57 66" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="50" cy="10" r="3" fill="#9ca3af" opacity="0.7" />
            <circle cx="58" cy="4" r="4.5" fill="#6b7280" opacity="0.5" />
          </>
        ) : (
          <>
            {/* Glossy Pookie Anime Eyes */}
            <g className="drapey-bright-eyes">
              {/* Eyelash / upper eye rim curve */}
              <path d="M32 46 Q38 41 44 46" fill="none" stroke="#022c22" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M56 46 Q62 41 68 46" fill="none" stroke="#022c22" strokeWidth="2.4" strokeLinecap="round" />

              {/* Eye Orbs */}
              <ellipse cx="38" cy="50" rx="5.6" ry="7.6" fill="url(#drapey-iris-grad)" />
              <ellipse cx="62" cy="50" rx="5.6" ry="7.6" fill="url(#drapey-iris-grad)" />

              {/* Big primary top-left highlight */}
              <ellipse cx="36.2" cy="47" rx="2.2" ry="2.8" fill="#ffffff" />
              <ellipse cx="60.2" cy="47" rx="2.2" ry="2.8" fill="#ffffff" />

              {/* Secondary bottom-right twinkle */}
              <circle cx="40.2" cy="53" r="1.3" fill="#ffffff" />
              <circle cx="64.2" cy="53" r="1.3" fill="#ffffff" />

              {/* Micro green glint */}
              <circle cx="36.2" cy="53.5" r="0.7" fill="#6ee7b7" />
              <circle cx="60.2" cy="53.5" r="0.7" fill="#6ee7b7" />
            </g>

            {mood === 'thinking' ? (
              <ellipse cx="51" cy="65" rx="2.8" ry="3.6" fill="#092e25" />
            ) : mood === 'speaking' ? (
              <g className="drapey-talking-mouth">
                <ellipse cx="50" cy="65" rx="4.8" ry="5.5" fill="#092e25" />
                <ellipse cx="50" cy="67.5" rx="3.2" ry="2.2" fill="#ff4d79" />
              </g>
            ) : (
              /* Naughty Cheeky Smile with tiny visible pink tongue */
              <g className="drapey-naughty-smile">
                <path d="M44 63 Q50 70 56 63" fill="#092e25" stroke="#092e25" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M47 65.5 Q50 69.5 53 65.5 Z" fill="#ff4d79" />
              </g>
            )}
          </>
        )}

        {mood === 'sleeping' && (
          <g className="drapey-sleep-marks" fill="#64876e" fontFamily="sans-serif" fontWeight="bold">
            <text x="77" y="20" fontSize="10">z</text>
            <text x="87" y="9" fontSize="13">Z</text>
          </g>
        )}
      </svg>
    </span>
  );
}
