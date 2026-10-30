import TrialRoom3D from './TrialRoom3D';
import DrapeyAvatar from './DrapeyAvatar';
import { useEffect, useRef, useState } from 'react';
import './TryBuyScene.css';

const steps = [
  { title: 'Pick Without Second-Guessing', short: 'Select', copy: 'Confused between Medium and Large? Cart mein dono daalein. Koi upfront charge nahi.', hint: 'Size M + Size L · ₹0 upfront', message: 'Confused between Medium and Large? Cart mein dono daalein. Koi upfront charge nahi.', scene: 0 },
  { title: 'From Your Bag to Your Door', short: 'Dispatch', copy: 'Hyperlocal rider aapki selection doorstep par laata hai. Delivery availability aur slot checkout par confirm honge.', hint: '35-minute countdown is an accelerated demo, not a delivery guarantee.', message: 'Local delivery, seedha aapke doorstep par. Yeh 35-minute timer sirf demo hai; actual slot checkout par dekhein.', scene: 0 },
  { title: '15 Minutes at Your Mirror', short: 'Trial', copy: 'Apne bedroom ki light aur matching shoes ke saath pehan kar dekhein—fitting, fabric, aur feel sab confirm karein.', hint: '15-minute home trial · Ring shown in accelerated demo time', message: 'Apne bedroom ki light aur matching shoes ke saath try karein. 15 minutes mein fitting, fabric aur feel confirm karein.', scene: 1 },
  { title: 'Pay for What Fits. Hand Back the Rest.', short: 'Keep', copy: 'Jo fit ho use rakhein, doosra rider ko turant wapas dein. Final bill check karke cash dein. Applicable fees bill mein dikhengi.', hint: 'Sound-box concept is illustrative. Current checkout: cash on delivery.', message: 'Ek dress rakhein, doosri turant rider ko wapas dein. Final bill aur applicable fees check karke cash pay karein—no return label needed.', scene: 2 },
];
function Shirt({ x, y, color, selected }) {
  return <g transform={`translate(${x} ${y})`} className={selected ? 'tb-garment tb-garment--picked' : 'tb-garment'}>
    <path d="M0 0q0-7 5-7q5 0 3 6L0 5l-15 9h30L0 5" fill="none" stroke="#b08a50" strokeWidth="2" />
    <path d="M-9 12l-13 7 6 13 7-4v33h25V28l7 4 6-13-13-7q-12 10-25 0" fill={color} stroke="#284d40" strokeWidth="1.4" />
    <path d="M-9 14q12 13 25 0M-7 56h21M-13 20l4 8M20 20l-4 8" fill="none" stroke="#ffffff" opacity=".45" />
    <path d="M3 22v30" stroke="#163e32" opacity=".22" />
  </g>;
}
function SceneArt({ step }) {
  return <svg viewBox="0 0 660 390" aria-hidden="true" className={`tb-art tb-art--${step}`}>
    <ellipse cx="334" cy="339" rx="249" ry="28" fill="#0c493a" opacity=".08" />
    {/* A shallow stage with visible thickness and parquet seams. */}
    <path d="M75 254l278-126 245 125-279 127z" fill="#e9ddc2" />
    <path d="M75 254v15l244 126v-15z" fill="#c4b698" /><path d="M319 380l279-127v15L319 395z" fill="#d6c7a9" />
    {[0,1,2,3,4,5].map(i => <path key={i} d={`M${100+i*40} ${267+i*20}l278-126`} stroke="#d2c3a4" strokeWidth="1" />)}
    {/* Back wall, top cap and inset skirting. */}
    <path d="M353 128V43L598 167v86z" fill="#f0e8d5" /><path d="M353 43l7-4 245 124-7 4z" fill="#fffaf0" />
    <path d="M359 133l233 118v-7L359 126z" fill="#c8b993" />
    {/* Wardrobe with side depth, inset back, feet and drawers. */}
    <path d="M108 101l32-16 151 75-32 16z" fill="#46836e" /><path d="M108 101v151l151 76V176z" fill="#125440" />
    <path d="M259 176l32-16v152l-32 16z" fill="#063c2e" />
    <path d="M119 119v116l128 64V183z" fill="#082f25" />
    <path d="M119 235l128 64v-12l-116-58z" fill="#38745f" />
    <path d="M117 252l130 65v-20l-130-65z" fill="#296c54" />
    {[0,1].map(i => <g key={i}><path d={`M${125+i*102} ${262+i*51}v13l9 5v-13`} fill="#634e32" /><circle cx={150+i*62} cy={263+i*31} r="2.5" fill="#e3c58c" /></g>)}
    <path d="M129 141l111 56" stroke="#c9ad70" strokeWidth="4" strokeLinecap="round" />
    <Shirt x={148} y={148} color="#e7cfa7" selected={step === 0} /><Shirt x={202} y={175} color="#d59686" selected={step === 0} />
    {/* Trial alcove: frame, mirror, curtain rings and pleats. */}
    <path d="M343 99l23-12 99 50v147l-23 12-99-50z" fill="#b39663" />
    <path d="M350 105l85 43v132l-85-43z" fill="#f8f2e5" />
    <path d="M360 122l65 33v104l-65-33z" fill="#c9dcd1" stroke="#e1bd7d" strokeWidth="4" />
    <path d="M365 188l53-27M366 207l52-26" stroke="#eef7f1" strokeWidth="5" opacity=".75" />
    <path d="M341 100l104 52" stroke="#886d40" strokeWidth="4" />
    {[0,1,2,3,4,5,6].map(i => <ellipse key={i} cx={349+i*14} cy={105+i*7} rx="3" ry="5" fill="none" stroke="#e5c990" strokeWidth="2" />)}
    <g className="tb-curtain"><path d="M346 110l94 47v130l-94-47z" fill="#387a60" />{[0,1,2,3,4,5].map(i => <path key={i} d={`M${351+i*15} ${113+i*7.5}v124`} stroke={i%2 ? '#16553e' : '#72a287'} strokeWidth="7" opacity=".6" />)}</g>
    {/* Trial outfit on its stand. */}
    <g className="tb-trial-outfit"><path d="M390 207v78m-17 4 17-4 17 4" fill="none" stroke="#987b4d" strokeWidth="3" /><Shirt x={390} y={172} color="#ead8af" /></g>
    {/* Two bags: sewn sides, handles, monogram and folded clothes. */}
    {[0,1].map(i => <g key={i} className={`tb-bag tb-bag--${i}`} transform={`translate(${282+i*198} ${264+i*2})`}>
      <path d="M-23-13l36 8 12-8-34-8z" fill="#c3ac7a" /><path d="M-23-13v55l36 9V-5z" fill={i ? '#e6dbc3' : '#175b45'} /><path d="M13-5l12-8v56l-12 8z" fill={i ? '#b6a684' : '#083d2d'} />
      <path d="M-14-10v-12q11-14 20 5v12" stroke="#c9a76b" strokeWidth="3" fill="none" /><path d="M-17 36l24 6" stroke="#fff" opacity=".2" />
      <path d="M-10 9v21h5q15-5 0-18z" fill="none" stroke={i ? '#56715a' : '#f2dfb7'} strokeWidth="2" />
      {step === 2 && <g><path d="M-17-14l8-13 18 5 9 12-11 4z" fill={i ? '#d59686' : '#ead8af'} /><path d="M-12-18l17 5" stroke="#fff" opacity=".5" /></g>}
    </g>)}
    {/* Doorstep parcel and label. */}
    <g className="tb-parcel"><path d="M501 206l39-18 33 17-38 18z" fill="#d8b77b" /><path d="M501 206v32l34 17v-32z" fill="#b28b4f" /><path d="M535 223l38-18v32l-38 18z" fill="#c6a062" /><path d="M517 199l34 17v14l-8 4v-14l-34-17z" fill="#eddab5" /><path d="M507 219l16 8v9l-16-8z" fill="#fff4dd" /></g>
    {/* Potted plant with rim, stem and layered leaves. */}
    <path d="M510 158l7 32q12 12 25 0l6-32" fill="#c18e65" /><ellipse cx="529" cy="158" rx="20" ry="9" fill="#e2b997" /><ellipse cx="529" cy="158" rx="15" ry="5" fill="#78583c" />
    <path d="M529 159v-47" stroke="#386049" strokeWidth="3" />
    {[0,1,2].map(i => <g key={i}><path d={`M529 ${150-i*14}q-31-2-25-24q22 1 25 24`} fill="#528168" /><path d={`M529 ${143-i*13}q26-2 24-23q-22 2-24 23`} fill="#2b624b" /></g>)}
  </svg>;
}
export default function TryBuyScene() {
  const [step, setStep] = useState(0), [playing, setPlaying] = useState(true), [visible, setVisible] = useState(false), [reduced, setReduced] = useState(false);
  const host = useRef(null);
  const [pageVisible, setPageVisible] = useState(!document.hidden);
  useEffect(() => {
    const update = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => { setReduced(media.matches); if (media.matches) setPlaying(false); };
    change(); media.addEventListener?.('change', change);
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .2 });
    if (observer) observer.observe(host.current); else setVisible(true);
    return () => { observer?.disconnect(); media.removeEventListener?.('change', change); };
  }, []);
  useEffect(() => {
    if (!playing || !visible || !pageVisible || reduced) return;
    const timer = setInterval(() => setStep(value => (value + 1) % steps.length), 12000);
    return () => clearInterval(timer);
  }, [playing, visible, pageVisible, reduced]);
  return <section ref={host} className={`try-buy-scene tb-cinematic ${reduced || !visible || !pageVisible ? 'tb-still' : ''}`} aria-labelledby="try-buy-title" data-active={visible && pageVisible ? 'true' : 'false'}>
    <div className="tb-heading"><span>THE DOORDRAPE WAY</span><h2 id="try-buy-title">Your home. Your fitting room.</h2><p>Let Drapey show you how it works.</p></div>
    <div className="tb-theatre" data-stage={step}>
      <div className="tb-stage-glow" />
      <TrialRoom3D step={step} active={visible && pageVisible} reduced={reduced} fallback={<div className="tb-world"><SceneArt step={steps[step].scene} /></div>} />
      <div className="tb-scene-host">
        <div className="tb-host-bubble" key={step}><strong className="tb-narration-title">{steps[step].title}</strong><span>{steps[step].message}</span></div>
        <DrapeyAvatar mood={visible && !reduced ? 'speaking' : 'idle'} reduced={reduced || !visible || !pageVisible} />
        <span className="tb-host-shadow" />
      </div>
      <div className="tb-scene-caption">{steps[step].hint}</div>
    </div>
    <p className="tb-footnote">Illustrative journey. Availability and applicable fees are shown at checkout.</p>
    {reduced && <div className="tb-accessible-summary">{steps.map(item => <p key={item.short}><strong>{item.title}</strong> — {item.copy}</p>)}</div>}
  </section>;
}
