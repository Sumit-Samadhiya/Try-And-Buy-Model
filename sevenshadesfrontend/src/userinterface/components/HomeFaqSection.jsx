import React, { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const FAQ_ITEMS = [
    {
        question: 'How does Doordrape Try & Buy work?',
        answer: 'Browse our catalog and add up to 4 styles or alternate sizes to your cart. Select Doorstep Try & Buy at checkout. Our delivery rider arrives at your doorstep in 30-45 minutes and gives you a 15-minute trial window to try the clothes in your room. Keep what fits and pay on the spot via Cash or UPI; the rider takes back unwanted items immediately.',
    },
    {
        question: 'How much time do I get for the doorstep clothes trial?',
        answer: 'You receive a dedicated 15-minute trial window at your home. This gives you plenty of time to check the fitting, fabric texture, mirror look, and comfort before making any payment decision.',
    },
    {
        question: 'Can I order multiple sizes of the same product to try?',
        answer: 'Yes! That is one of our most popular features. You can order multiple sizes (e.g., Medium and Large) of the same dress or shirt to see which one fits best, keep the right size, and return the other size on the spot with zero hassle.',
    },
    {
        question: 'What happens if none of the clothes fit me?',
        answer: 'If none of the clothes match your size or liking, you are never forced to buy! Simply return all items directly to the delivery partner at the doorstep. You only pay nominal doorstep trial delivery fees.',
    },
    {
        question: 'What payment methods are accepted after trying clothes?',
        answer: 'You pay after your 15-minute trial is complete. We accept Cash on Delivery (COD), UPI (Google Pay, PhonePe, Paytm, BHIM), and all major debit and credit cards.',
    },
];

export default function HomeFaqSection() {
    const theme = useTheme();
    const sm = useMediaQuery(theme.breakpoints.down('sm'));
    const [openIndex, setOpenIndex] = useState(0);

    const toggleFaq = (index) => {
        setOpenIndex(prev => (prev === index ? -1 : index));
    };

    return (
        <section
            aria-labelledby="faq-heading"
            style={{
                width: '100%',
                maxWidth: 1360,
                marginTop: sm ? 32 : 56,
                marginBottom: sm ? 36 : 60,
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
                <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 28px' }}>
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
                        Got Questions?
                    </span>
                    <h2
                        id="faq-heading"
                        style={{
                            fontSize: sm ? '22px' : '30px',
                            fontWeight: 800,
                            color: '#0f172a',
                            margin: '4px 0 10px',
                            letterSpacing: '-0.02em',
                        }}
                    >
                        Frequently Asked Questions About Try &amp; Buy
                    </h2>
                    <p
                        style={{
                            fontSize: sm ? '13px' : '15px',
                            color: '#64748b',
                            lineHeight: 1.6,
                            margin: 0,
                        }}
                    >
                        Everything you need to know about ordering, home trials, and paying only for what you keep.
                    </p>
                </div>

                <div
                    style={{
                        maxWidth: 860,
                        margin: '0 auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                    }}
                >
                    {FAQ_ITEMS.map((item, idx) => {
                        const isOpen = openIndex === idx;
                        return (
                            <div
                                key={idx}
                                style={{
                                    border: '1px solid',
                                    borderColor: isOpen ? '#a7f3d0' : '#e2e8f0',
                                    borderRadius: '12px',
                                    backgroundColor: isOpen ? '#f0fdf4' : '#f8fafc',
                                    transition: 'all 0.2s ease',
                                    overflow: 'hidden',
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => toggleFaq(idx)}
                                    aria-expanded={isOpen}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: sm ? '14px 16px' : '18px 20px',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        gap: 12,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: sm ? '14px' : '16px',
                                            fontWeight: 700,
                                            color: '#0f172a',
                                        }}
                                    >
                                        {item.question}
                                    </span>
                                    <ExpandMoreIcon
                                        style={{
                                            color: isOpen ? '#047857' : '#64748b',
                                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.25s ease',
                                            flexShrink: 0,
                                        }}
                                    />
                                </button>
                                {isOpen && (
                                    <div
                                        style={{
                                            padding: sm ? '0 16px 16px' : '0 20px 20px',
                                            fontSize: sm ? '13px' : '14px',
                                            color: '#334155',
                                            lineHeight: 1.6,
                                        }}
                                    >
                                        {item.answer}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
