import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';

export default function HeroVariantA() {
    const navigate = useNavigate();
    const theme = useTheme();
    const sm = useMediaQuery(theme.breakpoints.down('sm'));

    const scrollToHowItWorks = () => {
        const el = document.getElementById('how-it-works-heading');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            navigate('/productpage');
        }
    };

    const benefits = [
        {
            icon: '🪞',
            title: 'Your Mirror, Your Shoes',
            desc: 'No cramped trial rooms or harsh lighting. Match with your real wardrobe before deciding.',
        },
        {
            icon: '⏳',
            title: '15-Min Home Trial',
            desc: 'Rider waits downstairs while you try sizes comfortably in your room.',
        },
        {
            icon: '🚫',
            title: 'Zero Advance & No Refund Wait',
            desc: 'Pay ₹0 upfront. No 7-day wait for bank refunds or store credits.',
        },
        {
            icon: '📦',
            title: 'Instant Doorstep Return',
            desc: 'Hand back whatever doesn\'t fit in 5 seconds. Zero repacking or courier hassle.',
        },
    ];

    return (
        <section
            aria-label="Doorstep Try and Buy Hero"
            style={{
                width: '100%',
                maxWidth: 1360,
                margin: sm ? '12px auto 0' : '20px auto 0',
                padding: '0 16px',
                boxSizing: 'border-box',
            }}
        >
            <div
                style={{
                    background: 'linear-gradient(135deg, #091e17 0%, #064e3b 45%, #022c22 100%)',
                    borderRadius: sm ? '20px' : '28px',
                    padding: sm ? '28px 18px 24px' : '48px 44px 40px',
                    color: '#ffffff',
                    boxShadow: '0 20px 45px -10px rgba(6, 78, 59, 0.35), 0 0 0 1px rgba(16, 185, 129, 0.2)',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Subtle Background Glow Spheres */}
                <div
                    aria-hidden="true"
                    style={{
                        position: 'absolute',
                        top: '-80px',
                        right: '-60px',
                        width: '280px',
                        height: '280px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(52, 211, 153, 0.22) 0%, rgba(52, 211, 153, 0) 70%)',
                        pointerEvents: 'none',
                    }}
                />
                <div
                    aria-hidden="true"
                    style={{
                        position: 'absolute',
                        bottom: '-90px',
                        left: '-40px',
                        width: '260px',
                        height: '260px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, rgba(16, 185, 129, 0) 70%)',
                        pointerEvents: 'none',
                    }}
                />

                {/* Eyebrow Pill Badge */}
                <div style={{ textAlign: sm ? 'center' : 'left', marginBottom: '16px' }}>
                    <div
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(52, 211, 153, 0.4)',
                            backdropFilter: 'blur(10px)',
                            padding: '6px 14px',
                            borderRadius: '999px',
                            fontSize: sm ? '11px' : '12px',
                            fontWeight: 700,
                            letterSpacing: '0.6px',
                            color: '#a7f3d0',
                        }}
                    >
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#34d399', boxShadow: '0 0 8px #34d399' }} />
                        <span>INDIA’S 1ST DOORSTEP FITTING ROOM · ZERO ADVANCE PAYMENT</span>
                    </div>
                </div>

                {/* Headline & Subtitle */}
                <div style={{ maxWidth: '820px', textAlign: sm ? 'center' : 'left' }}>
                    <h1
                        style={{
                            fontSize: sm ? '28px' : '44px',
                            fontWeight: 800,
                            lineHeight: sm ? 1.2 : 1.15,
                            letterSpacing: '-0.03em',
                            margin: '0 0 14px 0',
                            color: '#ffffff',
                        }}
                    >
                        The Fitting Room Comes to Your Bedroom.{' '}
                        <span
                            style={{
                                display: sm ? 'block' : 'inline',
                                background: 'linear-gradient(90deg, #34d399 0%, #a7f3d0 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            Try Before You Buy.
                        </span>
                    </h1>

                    <p
                        style={{
                            fontSize: sm ? '14px' : '17px',
                            lineHeight: 1.6,
                            color: '#e2e8f0',
                            margin: '0 0 28px 0',
                            maxWidth: '720px',
                        }}
                    >
                        Order up to 4 styles and sizes right to your doorstep. Try them on in front of your own mirror with your favourite shoes. Keep only what feels right, return the rest on the spot.
                    </p>
                </div>

                {/* CTA Action Buttons */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: sm ? 'column' : 'row',
                        alignItems: sm ? 'stretch' : 'center',
                        gap: '14px',
                        marginBottom: sm ? '32px' : '40px',
                    }}
                >
                    <button
                        type="button"
                        onClick={() => navigate('/productpage')}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            backgroundColor: '#34d399',
                            color: '#022c22',
                            padding: sm ? '14px 24px' : '16px 32px',
                            borderRadius: '12px',
                            fontSize: sm ? '14px' : '15px',
                            fontWeight: 800,
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 8px 24px rgba(52, 211, 153, 0.35)',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#6ee7b7';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 12px 28px rgba(52, 211, 153, 0.45)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = '#34d399';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(52, 211, 153, 0.35)';
                        }}
                    >
                        <span>Book Your Doorstep Trial — It's Free</span>
                        <ArrowForwardIcon style={{ fontSize: 18 }} />
                    </button>

                    <button
                        type="button"
                        onClick={scrollToHowItWorks}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            color: '#ffffff',
                            padding: sm ? '12px 20px' : '15px 24px',
                            borderRadius: '12px',
                            fontSize: sm ? '13px' : '14px',
                            fontWeight: 700,
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            backdropFilter: 'blur(8px)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.18)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        }}
                    >
                        <HelpOutlineRoundedIcon style={{ fontSize: 17, color: '#34d399' }} />
                        <span>How It Works (See 3 Steps)</span>
                    </button>
                </div>

                {/* 4 Benefit-Driven Grid Cards */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: sm ? '1fr' : 'repeat(4, 1fr)',
                        gap: sm ? '12px' : '16px',
                        paddingTop: sm ? '16px' : '24px',
                        borderTop: '1px solid rgba(52, 211, 153, 0.2)',
                    }}
                >
                    {benefits.map((b, idx) => (
                        <div
                            key={idx}
                            style={{
                                backgroundColor: 'rgba(6, 78, 59, 0.45)',
                                border: '1px solid rgba(52, 211, 153, 0.2)',
                                borderRadius: '14px',
                                padding: sm ? '14px 14px' : '16px 18px',
                                backdropFilter: 'blur(6px)',
                                transition: 'all 0.2s ease',
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(6, 78, 59, 0.7)';
                                e.currentTarget.style.borderColor = 'rgba(52, 211, 153, 0.45)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(6, 78, 59, 0.45)';
                                e.currentTarget.style.borderColor = 'rgba(52, 211, 153, 0.2)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{b.icon}</div>
                            <h3
                                style={{
                                    fontSize: sm ? '14px' : '15px',
                                    fontWeight: 700,
                                    color: '#ffffff',
                                    margin: '0 0 6px 0',
                                }}
                            >
                                {b.title}
                            </h3>
                            <p
                                style={{
                                    fontSize: '12px',
                                    color: '#cbd5e1',
                                    lineHeight: 1.5,
                                    margin: 0,
                                }}
                            >
                                {b.desc}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Trust Footer Strip */}
                <div
                    style={{
                        marginTop: sm ? '20px' : '24px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: sm ? 'center' : 'flex-start',
                        gap: sm ? '12px' : '24px',
                        fontSize: sm ? '11px' : '12px',
                        color: '#a7f3d0',
                        fontWeight: 600,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircleRoundedIcon style={{ fontSize: 16, color: '#34d399' }} />
                        <span>₹0 Upfront Required</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircleRoundedIcon style={{ fontSize: 16, color: '#34d399' }} />
                        <span>Pay via Cash or UPI After Trial</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircleRoundedIcon style={{ fontSize: 16, color: '#34d399' }} />
                        <span>Instant WhatsApp Order Updates</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircleRoundedIcon style={{ fontSize: 16, color: '#34d399' }} />
                        <span>Instant Doorstep Handover</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
