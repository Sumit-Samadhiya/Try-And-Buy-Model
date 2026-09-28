import React, { useState } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import CookieOutlinedIcon from '@mui/icons-material/CookieOutlined';
import { Link } from 'react-router-dom';

export default function CookieConsent() {
    const [visible, setVisible] = useState(() => {
        try {
            return typeof window !== 'undefined' && !(localStorage.getItem('doordrape_cookie_consent') || localStorage.getItem('sevenshades_cookie_consent'));
        } catch (e) {
            return false;
        }
    });

    const handleChoice = (choice) => {
        try {
            localStorage.setItem('doordrape_cookie_consent', choice);
            localStorage.setItem('sevenshades_cookie_consent', choice);
            window.dispatchEvent(new CustomEvent('cookie-consent-updated', { detail: { choice } }));
        } catch (e) {}
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <Box
            role="region"
            aria-label="Cookie consent banner"
            sx={{
                position: 'fixed',
                bottom: { xs: 12, sm: 20 },
                left: { xs: 12, sm: 20 },
                right: { xs: 12, sm: 'auto' },
                maxWidth: { sm: 460 },
                zIndex: 1400,
            }}
        >
            <Paper
                elevation={6}
                sx={{
                    p: 2.5,
                    bgcolor: '#0f172a',
                    color: '#f8fafc',
                    borderRadius: 3,
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                    <CookieOutlinedIcon sx={{ color: '#38bdf8', fontSize: 24, mt: 0.2 }} />
                    <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#ffffff' }}>
                            We Value Your Privacy
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#cbd5e1', lineHeight: 1.5, display: 'block', mt: 0.5 }}>
                            We use essential cookies to maintain your Try & Buy cart, secure doorstep orders, and improve your browsing experience.
                            Read our{' '}
                            <Link 
                                to="/privacy-policy" 
                                style={{ color: '#38bdf8', textDecoration: 'underline', fontWeight: 600 }}
                            >
                                Cookie Policy
                            </Link>.
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleChoice('essential')}
                        sx={{
                            color: '#e2e8f0',
                            borderColor: 'rgba(255, 255, 255, 0.25)',
                            textTransform: 'none',
                            fontSize: 12,
                            fontWeight: 600,
                            borderRadius: 1.5,
                            '&:hover': {
                                borderColor: '#ffffff',
                                bgcolor: 'rgba(255, 255, 255, 0.06)'
                            }
                        }}
                    >
                        Essential Only
                    </Button>
                    <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleChoice('accepted')}
                        sx={{
                            bgcolor: '#2563eb',
                            color: '#ffffff',
                            textTransform: 'none',
                            fontSize: 12,
                            fontWeight: 700,
                            borderRadius: 1.5,
                            boxShadow: 'none',
                            '&:hover': {
                                bgcolor: '#1d4ed8',
                                boxShadow: 'none'
                            }
                        }}
                    >
                        Accept All
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}
