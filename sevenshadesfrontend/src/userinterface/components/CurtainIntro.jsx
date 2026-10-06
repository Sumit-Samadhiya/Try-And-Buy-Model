import { useEffect, useRef, useState } from 'react';
import './CurtainIntro.css';

/** A bounded loading reveal; never waits indefinitely for the catalog API. */
export default function CurtainIntro({ ready = false }) {
  const dialog = useRef(null);
  const [phase, setPhase] = useState('loading');

  useEffect(() => {
    dialog.current?.showModal?.();
    const timeout = setTimeout(() => setPhase('opening'), 6000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (ready) setPhase('opening');
  }, [ready]);

  useEffect(() => {
    if (phase !== 'opening') return undefined;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timeout = setTimeout(() => {
      dialog.current?.close?.();
      setPhase('done');
    }, reduced ? 0 : 700);
    return () => clearTimeout(timeout);
  }, [phase]);

  if (phase === 'done') return null;
  return (
    <dialog ref={dialog} className={`dd-intro dd-intro--${phase}`} aria-label="Welcome to DoorDrape"
      onCancel={event => { event.preventDefault(); setPhase('opening'); }}>
      <div className="dd-intro__curtain dd-intro__curtain--left" aria-hidden="true" />
      <div className="dd-intro__curtain dd-intro__curtain--right" aria-hidden="true" />
      <div className="dd-intro__brand">
        <svg className="dd-intro__mark" viewBox="0 0 120 140" width="120" height="140" fill="none" aria-hidden="true">
          <path className="dd-intro__arch" d="M20 126V58a40 40 0 0 1 80 0v68M12 126h96" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path className="dd-intro__fold dd-intro__fold--left" d="M27 58c0-19 14-33 33-33v12C56 66 46 85 27 95V58Z" fill="currentColor" />
          <path className="dd-intro__fold dd-intro__fold--right" d="M93 58c0-19-14-33-33-33v12c4 29 14 48 33 58V58Z" fill="currentColor" />
          <path d="M47 110V77h11c23 0 23 33 0 33H47Z" stroke="currentColor" strokeWidth="3" />
        </svg>
        <div className="dd-intro__wordmark">Door<span>Drape</span></div>
        <p className="dd-intro__tagline">YOUR STYLE. AT YOUR DOOR.</p>
        <p className="dd-intro__status" role="status">{phase === 'opening' ? 'Welcome in.' : 'Getting your wardrobe ready…'}</p>
      </div>
      <button className="dd-intro__skip" onClick={() => setPhase('opening')}>Skip intro <span aria-hidden="true">↗</span></button>
    </dialog>
  );
}
