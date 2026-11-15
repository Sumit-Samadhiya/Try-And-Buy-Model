import React, { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import FAQ_ITEMS from '../../services/homeFaq.json';

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
