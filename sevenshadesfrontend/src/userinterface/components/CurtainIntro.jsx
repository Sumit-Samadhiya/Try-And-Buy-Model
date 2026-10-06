import { BrandMark } from './BrandLogo';
import { useEffect, useRef, useState } from 'react';
import './CurtainIntro.css';

const STORY_STEPS = [
  {
    tag: '01 · CURATED SELECTION',
    title: 'Handpicked Styles At Your Doorstep',
    desc: 'Select your favorites to try at home with zero upfront pressure.',
  },
  {
    tag: '02 · 10-MINUTE TRIAL',
    title: 'Your Room Is Your Runway',
    desc: 'Try outfits with your own accessories, footwear, and mirror lighting.',
  },
  {
    tag: '03 · ZERO COMPROMISE',
    title: 'Keep Only What You Love',
    desc: 'Pay cash or online only for what fits. Instant returns on the spot.',
  },
];

/**
 * A luxury theatrical curtain reveal that introduces DoorDrape's Try-and-Buy
 * experience through bespoke brand storytelling without feeling like a loading screen.
 */
export default function CurtainIntro({ ready = false, minDuration = 5500, maxDuration = 9500 }) {
  const dialog = useRef(null);
  const [phase, setPhase] = useState('loading');
  const [introComplete, setIntroComplete] = useState(false);
  const [activeStory, setActiveStory] = useState(0);

  useEffect(() => {
    dialog.current?.showModal?.();
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const minimum = setTimeout(() => setIntroComplete(true), reduced ? 0 : minDuration);
    const timeout = setTimeout(() => setPhase('opening'), reduced ? 0 : maxDuration);
    return () => {
      clearTimeout(minimum);
      clearTimeout(timeout);
    };
  }, [minDuration, maxDuration]);

  // Cycle through the 3 couture storylines every 1750ms
  useEffect(() => {
    if (phase !== 'loading') return undefined;
    const interval = setInterval(() => {
      setActiveStory(prev => (prev + 1) % STORY_STEPS.length);
    }, 1750);
    return () => clearInterval(interval);
  }, [phase]);

  // Open curtains only once both the minimum dwell time has elapsed AND catalog is ready
  useEffect(() => {
    if (ready && introComplete) {
      setPhase(current => (current === 'loading' ? 'opening' : current));
    }
  }, [ready, introComplete]);

  // Cleanup dialog when opening transition finishes
  useEffect(() => {
    if (phase !== 'opening') return undefined;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timeout = setTimeout(() => {
      dialog.current?.close?.();
      setPhase('done');
    }, reduced ? 0 : 800);
    return () => clearTimeout(timeout);
  }, [phase]);

  if (phase === 'done') return null;

  return (
    <dialog
      ref={dialog}
      className={`dd-intro dd-intro--${phase}`}
      aria-label="Welcome to DoorDrape"
      onCancel={event => {
        event.preventDefault();
        setPhase('opening');
      }}
    >
      {/* Heavy Velvet Curtain Panels with Gold Braid Trim */}
      <div className="dd-intro__curtain dd-intro__curtain--left" aria-hidden="true" />
      <div className="dd-intro__curtain dd-intro__curtain--right" aria-hidden="true" />

      {/* Center Theatrical Stage */}
      <div className="dd-intro__brand">
        {/* Ambient Warm Golden Spotlight */}
        <div className="dd-intro__spotlight" aria-hidden="true" />

        {/* Ambient Golden Couture Shimmer Sparkles */}
        <div className="dd-intro__sparkle dd-intro__sparkle--1" aria-hidden="true">✦</div>
        <div className="dd-intro__sparkle dd-intro__sparkle--2" aria-hidden="true">✧</div>
        <div className="dd-intro__sparkle dd-intro__sparkle--3" aria-hidden="true">✨</div>
        <div className="dd-intro__sparkle dd-intro__sparkle--4" aria-hidden="true">✦</div>

        {/* Elegant Tailor Hanger Motif */}
        <svg
          className="dd-intro__hanger"
          width="54"
          height="54"
          viewBox="0 0 56 56"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <path
            d="M28 14a4 4 0 1 1 5 4c-3 2-4 4-4 6v2M10 39l18-13 18 13H10Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Brand Emblem with Golden Halo Glow */}
        <div className="dd-intro__logo-wrapper">
          <BrandMark size={124} animated />
        </div>

        {/* Shimmering Brand Typography */}
        <div className="dd-intro__wordmark">
          Door<span>Drape</span>
        </div>
        <p className="dd-intro__tagline">YOUR STYLE. AT YOUR DOOR.</p>

        {/* Dynamic Storytelling Vignette Card */}
        <div className="dd-intro__story-card" aria-live="polite">
          <div className="dd-intro__story-pill">
            {STORY_STEPS[activeStory].tag}
          </div>
          <h2 className="dd-intro__story-title">
            {STORY_STEPS[activeStory].title}
          </h2>
          <p className="dd-intro__story-desc">
            {STORY_STEPS[activeStory].desc}
          </p>
        </div>

        {/* Golden Tailor Thread Line & Step Indicators */}
        <div className="dd-intro__thread-container" aria-hidden="true">
          <div
            className="dd-intro__thread-bar"
            style={{ animationDuration: `${minDuration}ms` }}
          />
          <div className="dd-intro__thread-dots">
            {STORY_STEPS.map((step, idx) => (
              <span
                key={idx}
                className={`dd-intro__dot ${idx === activeStory ? 'is-active' : ''} ${idx < activeStory ? 'is-passed' : ''}`}
                title={step.tag}
              />
            ))}
          </div>
        </div>

        {/* Screen Reader Announcement */}
        <p className="dd-intro__status sr-only" role="status">
          {phase === 'opening'
            ? 'Welcome to DoorDrape.'
            : 'Unveiling your doorstep try and buy fitting room.'}
        </p>
      </div>

      {/* Luxury Brass Skip Button */}
      <button
        className="dd-intro__skip"
        onClick={() => setPhase('opening')}
        aria-label="Skip intro"
      >
        <span>Skip intro</span>
        <span className="dd-intro__skip-arrow" aria-hidden="true">↗</span>
      </button>
    </dialog>
  );
}
