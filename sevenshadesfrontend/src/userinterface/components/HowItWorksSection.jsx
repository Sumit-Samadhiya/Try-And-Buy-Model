import React from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import CheckroomOutlinedIcon from '@mui/icons-material/CheckroomOutlined';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import PaymentOutlinedIcon from '@mui/icons-material/PaymentOutlined';

export default function HowItWorksSection() {
    const theme = useTheme();
    const sm = useMediaQuery(theme.breakpoints.down('sm'));

    const steps = [
        {
            number: '01',
            icon: <CheckroomOutlinedIcon style={{ fontSize: 28, color: '#047857' }} />,
            title: 'Pick Multiple Sizes & Styles',
            description: 'Select up to 4 outfits or alternate sizes to try at home. Zero advance prepayment required.',
        },
        {
            number: '02',
            icon: <TimerOutlinedIcon style={{ fontSize: 28, color: '#047857' }} />,
            title: '15-Minute Doorstep Trial',
            description: 'Our rider arrives at your doorstep in 30-45 minutes and waits while you try items in your room.',
        },
        {
            number: '03',
            icon: <PaymentOutlinedIcon style={{ fontSize: 28, color: '#047857' }} />,
            title: 'Pay Only For What Fits',
            description: 'Keep the pieces you love and pay via Cash or UPI. Return any unfit items to the rider instantly.',
        },
    ];

    return (
        <section
            aria-labelledby="how-it-works-heading"
            style={{
                width: '100%',
                maxWidth: 1360,
                marginTop: sm ? 32 : 56,
                padding: '0 16px',
                boxSizing: 'border-box',
            }}
        >
            <div
                style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: sm ? '16px' : '20px',
                    padding: sm ? '24px 16px' : '40px 32px',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
                }}
            >
                <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 32px' }}>
                    <span
                        style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                            color: '#047857',
                            backgroundColor: '#ecfdf5',
                            padding: '4px 12px',
                            borderRadius: '999px',
                            display: 'inline-block',
                            marginBottom: '8px',
                        }}
                    >
                        Easy 3-Step Process
                    </span>
                    <h2
                        id="how-it-works-heading"
                        style={{
                            fontSize: sm ? '22px' : '30px',
                            fontWeight: 800,
                            color: '#0f172a',
                            margin: '4px 0 10px',
                            letterSpacing: '-0.02em',
                        }}
                    >
                        How Doorstep Try &amp; Buy Works
                    </h2>
                    <p
                        style={{
                            fontSize: sm ? '13px' : '15px',
                            color: '#64748b',
                            lineHeight: 1.6,
                            margin: 0,
                        }}
                    >
                        Say goodbye to wrong fits and painful return pickups. Try clothes at your home before you pay a single rupee.
                    </p>
                </div>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: sm ? '1fr' : 'repeat(3, 1fr)',
                        gap: sm ? 20 : 28,
                    }}
                >
                    {steps.map((step) => (
                        <div
                            key={step.number}
                            style={{
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '14px',
                                padding: sm ? '20px 16px' : '28px 24px',
                                display: 'flex',
                                flexDirection: 'column',
                                position: 'relative',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: 16,
                                }}
                            >
                                <div
                                    style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: '12px',
                                        backgroundColor: '#d1fae5',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {step.icon}
                                </div>
                                <span
                                    style={{
                                        fontSize: '22px',
                                        fontWeight: 800,
                                        color: '#cbd5e1',
                                        fontFamily: 'monospace',
                                    }}
                                >
                                    {step.number}
                                </span>
                            </div>

                            <h3
                                style={{
                                    fontSize: '17px',
                                    fontWeight: 700,
                                    color: '#0f172a',
                                    margin: '0 0 8px',
                                }}
                            >
                                {step.title}
                            </h3>

                            <p
                                style={{
                                    fontSize: '13px',
                                    color: '#475569',
                                    lineHeight: 1.55,
                                    margin: 0,
                                }}
                            >
                                {step.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
