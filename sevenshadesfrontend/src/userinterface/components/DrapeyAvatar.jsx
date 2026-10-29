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
    import('@bible-strong/avatar-web').then(({ createAvatar }) => {
      if (cancelled) return;
      controller.current = createAvatar(host.current, { definition, size:'100%', defaultExpression:'neutral' });
      // Add a soft highlight to Strobi's actual geometry without replacing its eyes or renderer.
      const svg = host.current.querySelector('svg');
      const ns = 'http://www.w3.org/2000/svg';
      const gradient = document.createElementNS(ns, 'radialGradient');
      const id = `${svg.querySelector('clipPath').id}-shade`;
      gradient.id = id;
      gradient.setAttribute('cx', '30%'); gradient.setAttribute('cy', '22%'); gradient.setAttribute('r', '80%');
      [['0%', '#c5e9b7'], ['24%', '#69ad80'], ['68%', '#177359'], ['100%', '#064331']].forEach(([offset, color]) => {
        const stop = document.createElementNS(ns, 'stop');
        stop.setAttribute('offset', offset); stop.setAttribute('stop-color', color); gradient.append(stop);
      });
      svg.querySelector('defs').append(gradient);
      [...svg.children].filter(element => element.tagName.toLowerCase() === 'path').forEach(path => { path.style.fill = `url(#${id})`; });
      if (!state.current.reduced) controller.current.play(state.current.mood === 'speaking' ? 'happy' : state.current.mood);
    });
    return () => { cancelled = true; controller.current?.destroy(); controller.current = null; };
  }, []);
  useEffect(() => {
    if (reduced) controller.current?.stop();
    else controller.current?.play(mood === 'speaking' ? 'happy' : mood);
  }, [mood, reduced]);
  return <span className={`drapey-avatar drapey-face--${mood} ${reduced ? 'drapey-face--still' : ''}`} aria-hidden="true">
    <span className="drapey-runtime" ref={host} />
    <svg className="drapey-features" viewBox="0 0 100 100">
      <defs><radialGradient id="drapey-tip-shine" cx="30%" cy="25%"><stop stopColor="#d9efb1"/><stop offset="1" stopColor="#3f996b"/></radialGradient></defs>
      <g className="drapey-antenna"><path d="M52 15Q54 5 58 0" stroke="#5d9e71" strokeWidth="3" fill="none"/><circle cx="59" cy="0" r="4.8" fill="url(#drapey-tip-shine)"/></g>
      <g className="drapey-hands" fill="#5b9f76"><ellipse cx="11" cy="68" rx="4.5" ry="10" transform="rotate(28 11 68)"/><ellipse cx="89" cy="68" rx="4.5" ry="10" transform="rotate(-28 89 68)"/></g>
      <ellipse cx="36" cy="28" rx="10" ry="5" fill="#e9f9d6" opacity=".25" transform="rotate(-30 36 28)"/>
      <g className="drapey-cheeks" fill="#deb77b" opacity=".65"><ellipse cx="29" cy="61" rx="5" ry="2.8"/><ellipse cx="71" cy="61" rx="5" ry="2.8"/></g>
      {mood === 'sleeping' ? <g fill="none" stroke="#092e25" strokeWidth="2.8" strokeLinecap="round"><path d="M33 49q5 5 10 0M57 49q5 5 10 0"/><path d="M47 65q3-2 6 0"/></g> : <>
        <g className="drapey-bright-eyes"><g fill="#092e25"><ellipse cx="38" cy="49" rx="5" ry="7"/><ellipse cx="62" cy="49" rx="5" ry="7"/></g><g fill="#fff9e9"><ellipse cx="36.5" cy="46.5" rx="1.9" ry="2.5"/><ellipse cx="60.5" cy="46.5" rx="1.9" ry="2.5"/><circle cx="40" cy="52" r=".9"/><circle cx="64" cy="52" r=".9"/></g></g>
        {mood === 'thinking' ? <ellipse cx="51" cy="65" rx="2.7" ry="3.4" fill="#092e25"/> : mood === 'speaking' ? <ellipse className="drapey-talking-mouth" cx="50" cy="65" rx="4.4" ry="5" fill="#092e25"/> : <path d="M46 64q4 5 8 0" fill="none" stroke="#092e25" strokeWidth="2.3" strokeLinecap="round"/>}
      </>}
      {mood === 'sleeping' && <g className="drapey-sleep-marks" fill="#64876e" fontFamily="sans-serif" fontWeight="bold"><text x="77" y="20" fontSize="10">z</text><text x="87" y="9" fontSize="13">Z</text></g>}
    </svg>
  </span>;
}
