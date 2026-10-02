import { useEffect, useState } from 'react';
import { responsiveImage } from '../../services/imageUrl';
import './StorefrontCarousels.css';

export default function SliderComponent({ data = [], onBannerClick }) {
  const slides = data.map(value => typeof value === 'object' ? value : { image: value }).filter(value => value?.image?.trim());
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update(); query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  useEffect(() => {
    if (paused || reducedMotion || slides.length < 2) return;
    const timer = setInterval(() => setIndex(value => (value + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [paused, reducedMotion, slides.length]);
  if (!slides.length) return <div className="home-banner hero-placeholder" aria-label="Loading featured collection" />;
  const active = index % slides.length;
  const item = slides[active];
  const [audience = 'Featured', headline = 'Try it at home', subline = 'Pay only for what you keep'] = String(item.bannerdescription || '').split('|');
  const change = delta => { setPaused(true); setIndex(value => (value + delta + slides.length) % slides.length); };
  return <section className="home-banner" aria-label="Featured collections" aria-roledescription="carousel" onFocusCapture={() => setPaused(true)}>
    <button type="button" className={`home-banner-slide home-banner-slide-${audience.trim().toLowerCase()}`} onClick={() => onBannerClick?.(item, active)}>
      <img {...responsiveImage(item.image, '(max-width: 1392px) 100vw, 1360px', true)} width="1440" height="460" loading="eager" fetchPriority="high" decoding="async" alt="" />
      <span className="home-banner-copy">
        <span className="home-banner-eyebrow">Doordrape · Try &amp; Buy</span>
        <strong>{headline.trim()}</strong><span>{subline.trim()}</span>
        <span className="home-banner-cta">Shop {audience.trim()} →</span>
      </span>
    </button>
    {slides.length > 1 && <div className="hero-controls">
      <button type="button" onClick={() => change(-1)} aria-label="Previous collection">←</button>
      <span aria-live={paused ? 'polite' : 'off'}>{active + 1} / {slides.length}</span>
      <button type="button" onClick={() => change(1)} aria-label="Next collection">→</button>
      {!reducedMotion && <button type="button" onClick={() => setPaused(value => !value)} aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}>{paused ? 'Play' : 'Pause'}</button>}
    </div>}
  </section>;
}
