import './BrandLogo.css';

export function BrandMark({ size = 36, animated = false }) {
  return <svg className={`dd-brand-mark${animated ? ' dd-brand-mark--animated' : ''}`} viewBox="0 0 100 112" width={size} height={size * 1.12} fill="none" aria-hidden="true" focusable="false">
    <path d="M14 100V47a36 36 0 0 1 72 0v53H14Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
    <path className="dd-brand-drape" d="M23 47a27 27 0 0 1 23-27c-1 26-8 40-23 51V47Z" fill="currentColor" />
    <path className="dd-brand-drape dd-brand-drape--right" d="M77 47a27 27 0 0 0-23-27c1 26 8 40 23 51V47Z" fill="currentColor" />
    <path d="M39 88V61h10c18 0 18 27 0 27H39Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
    <path d="M10 100h80" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
  </svg>;
}

export default function BrandLogo({ size = 32, light = false }) {
  return <span className={`dd-brand${light ? ' dd-brand--light' : ''}`} role="img" aria-label="DoorDrape">
    <BrandMark size={size} />
    <span className="dd-brand__name" aria-hidden="true">Door<span>Drape</span></span>
  </span>;
}
