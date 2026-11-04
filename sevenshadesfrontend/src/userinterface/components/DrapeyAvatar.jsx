import { useEffect, useRef } from 'react';
import definition from './strobi.avatar.json';

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
              : ['wink', 'curious'].includes(state.current.mood) ? 'idle' : state.current.mood;
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
        mood === 'speaking' || mood === 'yahoo' || mood === 'celebrating' || mood === 'angry' ? 'happy' : ['wink', 'curious'].includes(mood) ? 'idle' : mood;
      controller.current?.play(targetAnim);
    }
  }, [mood, reduced]);

  return (
    <span className={`drapey-avatar drapey-face--${mood} ${reduced ? 'drapey-face--still' : ''}`} aria-hidden="true">
      <span className="drapey-runtime" ref={host} />

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

        {/* Adorable Rosy Blushing Cheeks with Kawaii Anime Hatching */}
        {mood !== 'soot' && (
          <g className="drapey-cheeks">
            <ellipse
              cx="28"
              cy="61"
              rx="6.5"
              ry="3.6"
              fill={mood === 'angry' ? '#ef4444' : '#ff7aa2'}
              opacity={mood === 'angry' ? 0.85 : 0.78}
            />
            <ellipse
              cx="72"
              cy="61"
              rx="6.5"
              ry="3.6"
              fill={mood === 'angry' ? '#ef4444' : '#ff7aa2'}
              opacity={mood === 'angry' ? 0.85 : 0.78}
            />
            {mood !== 'angry' && (
              <g stroke="#ff4d80" strokeWidth="1.2" strokeLinecap="round" opacity="0.65">
                <line x1="25" y1="60" x2="27" y2="62" />
                <line x1="28" y1="60" x2="30" y2="62" />
                <line x1="31" y1="60" x2="33" y2="62" />
                <line x1="69" y1="60" x2="71" y2="62" />
                <line x1="72" y1="60" x2="74" y2="62" />
                <line x1="75" y1="60" x2="77" y2="62" />
              </g>
            )}
          </g>
        )}

        {/* Face Elements depending on mood */}
        {mood === 'sleeping' ? (
          <g fill="none" stroke="#092e25" strokeWidth="2.8" strokeLinecap="round">
            <path d="M33 49q5 5 10 0M57 49q5 5 10 0" />
            <path d="M47 65q3-2 6 0" />
          </g>
        ) : mood === 'wink' ? (
          <g stroke="#092e25" strokeWidth="2.8" strokeLinecap="round">
            <ellipse cx="38" cy="49" rx="5" ry="7" fill="#092e25" />
            <circle cx="36" cy="46" r="1.7" fill="#fff9e9" stroke="none" />
            <path d="M56 50q6-6 12 0M45 64q6 7 12-1" fill="none" />
          </g>
        ) : mood === 'angry' ? (
          <>
            {/* Slanted Angry Eyebrows */}
            <path d="M28 41 L44 48 M72 41 L56 48" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
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
            {/* Anger Mark (Comic Style) */}
            <path d="M68 18 Q72 12 76 18 Q80 12 84 18" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
          </>
        ) : mood === 'yahoo' || mood === 'celebrating' ? (
          <>
            {/* Happy Squinting Eyes */}
            <g className="drapey-yahoo-eyes" fill="none" stroke="#092e25" strokeWidth="3.2" strokeLinecap="round">
              <path d="M32 50 Q38 42 44 50" />
              <path d="M56 50 Q62 42 68 50" />
            </g>
            {/* Big Joyful Laughing Mouth with Tongue */}
            <path d="M42 62 Q50 74 58 62 Z" fill="#092e25" />
            <path d="M46 68 Q50 74 54 68 Z" fill="#f43f5e" />
          </>
        ) : mood === 'soot' ? (
          <>
            {/* Dazed Cross Eyes */}
            <g stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round">
              <path d="M33 46 L43 54 M43 46 L33 54" />
              <path d="M57 46 L67 54 M67 46 L57 54" />
            </g>
            {/* Wobbly Squiggly Mouth */}
            <path d="M43 66 Q47 62 50 66 Q53 70 57 66" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
            {/* Smoke puffs from head */}
            <circle cx="50" cy="10" r="3" fill="#9ca3af" opacity="0.7" />
            <circle cx="58" cy="4" r="4.5" fill="#6b7280" opacity="0.5" />
          </>
        ) : (
          <>
            {/* Big Expressive Kawaii Eyes with Sparkle Highlights */}
            <g className="drapey-bright-eyes">
              {/* Cute curved upper eyelids */}
              <path d="M32 43 Q38 39 44 44" fill="none" stroke="#092e25" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M56 44 Q62 39 68 43" fill="none" stroke="#092e25" strokeWidth="1.8" strokeLinecap="round" />

              <g fill="#092e25">
                <ellipse cx="38" cy="49" rx="5.2" ry="7.2" />
                <ellipse cx="62" cy="49" rx="5.2" ry="7.2" />
              </g>
              {/* Primary Glint */}
              <g fill="#ffffff">
                <ellipse cx="36.2" cy="46.2" rx="2.1" ry="2.7" />
                <ellipse cx="60.2" cy="46.2" rx="2.1" ry="2.7" />
              </g>
              {/* Secondary Sparkle Glints */}
              <g fill="#ffffff" opacity="0.95">
                <circle cx="40.2" cy="52.2" r="1.1" />
                <circle cx="64.2" cy="52.2" r="1.1" />
                <circle cx="36.5" cy="52.8" r="0.65" />
                <circle cx="60.5" cy="52.8" r="0.65" />
              </g>
            </g>

            {mood === 'thinking' || mood === 'curious' ? (
              <ellipse cx="50" cy="65" rx="2.7" ry="3.4" fill="#092e25" />
            ) : mood === 'speaking' ? (
              <ellipse className="drapey-talking-mouth" cx="50" cy="65" rx="4.4" ry="5" fill="#092e25" />
            ) : (
              /* Ultra-cute smile with little tongue blep */
              <g className="drapey-cute-smile">
                <path d="M44 63 Q50 71 56 63 Z" fill="#092e25" />
                <path d="M47 67 Q50 71 53 67 Z" fill="#ff7aa2" />
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
