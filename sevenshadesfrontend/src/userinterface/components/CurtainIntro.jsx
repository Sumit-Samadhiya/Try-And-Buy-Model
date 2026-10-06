import { BrandMark } from './BrandLogo';
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
        <BrandMark size={124} animated />
        <div className="dd-intro__wordmark">Door<span>Drape</span></div>
        <p className="dd-intro__tagline">YOUR STYLE. AT YOUR DOOR.</p>
        <p className="dd-intro__status" role="status">{phase === 'opening' ? 'Welcome in.' : 'Getting your wardrobe ready…'}</p>
      </div>
      <button className="dd-intro__skip" onClick={() => setPhase('opening')}>Skip intro <span aria-hidden="true">↗</span></button>
    </dialog>
  );
}
