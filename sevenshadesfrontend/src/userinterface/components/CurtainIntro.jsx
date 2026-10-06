import { BrandMark } from './BrandLogo';
import { useEffect, useRef, useState } from 'react';
import './CurtainIntro.css';

/** A bounded loading reveal; never waits indefinitely for the catalog API. */
export default function CurtainIntro({ ready = false }) {
  const dialog = useRef(null);
  const [phase, setPhase] = useState('loading');
  const [introComplete, setIntroComplete] = useState(false);

  useEffect(() => {
    dialog.current?.showModal?.();
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const minimum = setTimeout(() => setIntroComplete(true), reduced ? 0 : 4000);
    const timeout = setTimeout(() => setPhase('opening'), 8500);
    return () => { clearTimeout(minimum); clearTimeout(timeout); };
  }, []);

  useEffect(() => {
    if (ready && introComplete) setPhase(current => current === 'loading' ? 'opening' : current);
  }, [ready, introComplete]);

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
        <div className="dd-intro__spotlight" aria-hidden="true" />
        <div className="dd-intro__fashion dd-intro__fashion--one" aria-hidden="true">✧</div>
        <svg className="dd-intro__fashion dd-intro__fashion--two" width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M24 17a5 5 0 1 1 7 5l-3 2v4L8 41h40L28 28" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <div className="dd-intro__fashion dd-intro__fashion--three" aria-hidden="true">✦</div>
        <BrandMark size={124} animated />
        <div className="dd-intro__wordmark">Door<span>Drape</span></div>
        <p className="dd-intro__tagline">YOUR STYLE. AT YOUR DOOR.</p>
        <div className="dd-intro__story" aria-hidden="true">
          <span>Find your favourites.</span><span>Your room. Your runway.</span><span>Keep what you love.</span>
        </div>
        <div className="dd-intro__steps" aria-hidden="true"><span>01 · CHOOSE</span><i /><span>02 · TRY</span><i /><span>03 · LOVE</span></div>
        <p className="dd-intro__status sr-only" role="status">{phase === 'opening' ? 'Welcome in.' : 'Preparing DoorDrape. You can skip this intro.'}</p>
      </div>
      <button className="dd-intro__skip" onClick={() => setPhase('opening')}>Skip intro <span aria-hidden="true">↗</span></button>
    </dialog>
  );
}
