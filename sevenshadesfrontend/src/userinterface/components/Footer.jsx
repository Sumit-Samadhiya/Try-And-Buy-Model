import BrandLogo from './BrandLogo';
import { Grid, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useState } from "react";
import { Link } from "react-router-dom";
import { serverURL } from "../../services/FetchDjangoApiServices";
import Icons from "./Icons";

export default function Footer() {
    const theme = useTheme();
    const sm = useMediaQuery(theme.breakpoints.down('sm'));
    const [policyDialog, setPolicyDialog] = useState(null);

    const linkStyle = {
        fontSize: sm ? "12px" : "13px",
        letterSpacing: "0.1px",
        cursor: "pointer",
        color: "#d1fae5",
        transition: "color 0.15s ease",
        margin: sm ? "5px 0" : "8px 0",
        display: "block",
        textDecoration: "none",
        background: "none",
        border: 0,
        padding: 0,
        textAlign: "left",
        fontFamily: "inherit",
    };

    const foo = () => {
        return (
            <div style={{
                width: "100%",
                background: "linear-gradient(135deg, #064e3b 0%, #065f46 60%, #022c22 100%)",
                borderTop: "1px solid rgba(16, 185, 129, 0.25)",
                color: "#ffffff",
                padding: sm ? '24px 16px 20px' : '48px 24px 32px',
                boxSizing: 'border-box'
            }}>
                <div style={{ maxWidth: 1360, margin: '0 auto' }}>
                    <div style={{ fontSize: 28, marginBottom: 28 }}><BrandLogo light size={38} /></div>
                    {/* Responsive 2x2 Grid on Mobile (xs=6), 4 columns on Desktop (md=3) */}
                    <Grid container spacing={sm ? 2.5 : 4} justifyContent="space-between">
                        {/* Column 1: Help & Information */}
                        <Grid item xs={6} sm={6} md={3}>
                            <h3 style={{
                                fontSize: sm ? '13px' : '14px',
                                letterSpacing: "0.02em",
                                fontWeight: '700',
                                color: '#ffffff',
                                margin: sm ? '0 0 10px' : '0 0 16px'
                            }}>
                                Help &amp; Information
                            </h3>
                            <Link style={linkStyle} onMouseEnter={(e) => e.target.style.color = '#ffffff'} onMouseLeave={(e) => e.target.style.color = '#d1fae5'} to="/profile">
                                Help Center &amp; Support
                            </Link>
                            <Link style={linkStyle} onMouseEnter={(e) => e.target.style.color = '#ffffff'} onMouseLeave={(e) => e.target.style.color = '#d1fae5'} to="/profile">
                                Track Live Orders
                            </Link>
                            <Link style={linkStyle} onMouseEnter={(e) => e.target.style.color = '#ffffff'} onMouseLeave={(e) => e.target.style.color = '#d1fae5'} to="/terms-and-conditions">
                                Trial &amp; Returns Policy
                            </Link>
                            <Link style={linkStyle} onMouseEnter={(e) => e.target.style.color = '#ffffff'} onMouseLeave={(e) => e.target.style.color = '#d1fae5'} to="/privacy-policy">
                                Privacy Policy
                            </Link>
                        </Grid>

                        {/* Column 2: About Doordrape */}
                        <Grid item xs={6} sm={6} md={3}>
                            <h3 style={{
                                fontSize: sm ? '13px' : '14px',
                                letterSpacing: "0.02em",
                                fontWeight: '700',
                                color: '#ffffff',
                                margin: sm ? '0 0 10px' : '0 0 16px'
                            }}>
                                About Doordrape
                            </h3>
                            <button type="button" style={linkStyle} onMouseEnter={(e) => e.target.style.color = '#ffffff'} onMouseLeave={(e) => e.target.style.color = '#d1fae5'} onClick={() => setPolicyDialog('about')}>
                                Try &amp; Buy Mission
                            </button>
                            <button type="button" style={linkStyle} onMouseEnter={(e) => e.target.style.color = '#ffffff'} onMouseLeave={(e) => e.target.style.color = '#d1fae5'} onClick={() => setPolicyDialog('careers')}>
                                Careers &amp; Culture
                            </button>
                            <button type="button" style={linkStyle} onMouseEnter={(e) => e.target.style.color = '#ffffff'} onMouseLeave={(e) => e.target.style.color = '#d1fae5'} onClick={() => setPolicyDialog('delivery')}>
                                Zero-Emission Fleet
                            </button>
                            <button type="button" style={linkStyle} onMouseEnter={(e) => e.target.style.color = '#ffffff'} onMouseLeave={(e) => e.target.style.color = '#d1fae5'} onClick={() => setPolicyDialog('about')}>
                                Investor Relations
                            </button>
                        </Grid>

                        {/* Column 3: Hyperlocal Services */}
                        <Grid item xs={6} sm={6} md={3}>
                            <h3 style={{
                                fontSize: sm ? '13px' : '14px',
                                letterSpacing: "0.02em",
                                fontWeight: '700',
                                color: '#ffffff',
                                margin: sm ? '0 0 10px' : '0 0 16px'
                            }}>
                                Hyperlocal Services
                            </h3>
                            <Link style={linkStyle} onMouseEnter={(e) => e.target.style.color = '#ffffff'} onMouseLeave={(e) => e.target.style.color = '#d1fae5'} to="/home">
                                Standard Try &amp; Buy
                            </Link>
                            <Link style={linkStyle} onMouseEnter={(e) => e.target.style.color = '#ffffff'} onMouseLeave={(e) => e.target.style.color = '#d1fae5'} to="/home">
                                SOS Fast Fashion
                            </Link>
                            <Link style={linkStyle} onMouseEnter={(e) => e.target.style.color = '#ffffff'} onMouseLeave={(e) => e.target.style.color = '#d1fae5'} to="/profile">
                                Wallet &amp; Trial Credits
                            </Link>
                            <Link style={{ ...linkStyle, color: '#34d399', fontWeight: 700 }} onMouseEnter={(e) => e.target.style.color = '#6ee7b7'} onMouseLeave={(e) => e.target.style.color = '#34d399'} to="/delivery/login">
                                🛵 Rider Partner Portal
                            </Link>
                        </Grid>

                        {/* Column 4: Doorstep Coverage */}
                        <Grid item xs={6} sm={6} md={3}>
                            <h3 style={{
                                fontSize: sm ? '13px' : '14px',
                                letterSpacing: "0.02em",
                                fontWeight: '700',
                                color: '#ffffff',
                                margin: sm ? '0 0 10px' : '0 0 16px'
                            }}>
                                Doorstep Coverage
                            </h3>
                            <div style={{ fontSize: sm ? "12px" : "14px", color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6, marginBottom: sm ? 4 : 8 }}>
                                <span>Prime India Hubs</span>
                                <img src={`${serverURL}/static/india.png`} style={{ width: 16, height: 16 }} alt="India flag" />
                            </div>
                            <p style={{ fontSize: sm ? "11px" : "12px", color: "#a7f3d0", lineHeight: 1.45, margin: 0 }}>
                                Delivering verified trials to residential apartments &amp; gated societies.
                            </p>
                        </Grid>
                    </Grid>
                </div>
            </div>
        );
    };

    const foo1 = () => {
        return (
            <div style={{
                width: '100%',
                backgroundColor: "#022c22",
                borderTop: '1px solid rgba(16, 185, 129, 0.2)',
                padding: sm ? "14px 16px" : "24px 20px",
                textAlign: 'center'
            }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: sm ? 1 : 1.5, alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#a7f3d0', fontSize: sm ? '0.7rem' : '0.75rem' }}>
                        © 2026 Doordrape Inc. All rights reserved.
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: sm ? 2 : 3 }}>
                        <Link
                            to="/privacy-policy"
                            style={{
                                textDecoration: 'none',
                                fontSize: sm ? '0.7rem' : '0.75rem',
                                fontWeight: 600,
                                color: '#d1fae5',
                                transition: 'color 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.target.style.color = '#ffffff'}
                            onMouseLeave={(e) => e.target.style.color = '#d1fae5'}
                        >
                            Privacy Policy
                        </Link>
                        <Link
                            to="/terms-and-conditions"
                            style={{
                                textDecoration: 'none',
                                fontSize: sm ? '0.7rem' : '0.75rem',
                                fontWeight: 600,
                                color: '#d1fae5',
                                transition: 'color 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.target.style.color = '#ffffff'}
                            onMouseLeave={(e) => e.target.style.color = '#d1fae5'}
                        >
                            Terms of Service
                        </Link>
                    </Box>
                </Box>
            </div>
        );
    };

    return (
        <footer style={{ width: "100%", marginTop: 'auto' }}>
            <div style={{
                width: "100%",
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#ffffff',
                borderTop: '1px solid #e2e8f0',
                padding: sm ? '12px 14px' : '22px 16px'
            }}>
                <Icons />
            </div>
            {foo()}
            {foo1()}

            {/* POLICY MODAL DIALOG */}
            <Dialog open={!!policyDialog} onClose={() => setPolicyDialog(null)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 800 }}>
                    {policyDialog === 'delivery' && 'Try & Buy Delivery & Returns Policy'}
                    {policyDialog === 'privacy' && 'Privacy & Cookies Policy'}
                    {policyDialog === 'about' && 'About Doordrape'}
                    {policyDialog === 'careers' && 'Careers at Doordrape'}
                </DialogTitle>
                <DialogContent dividers>
                    {policyDialog === 'delivery' && (
                        <Box sx={{ color: '#374151', lineHeight: 1.6 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Doorstep Trial Model</Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                • Customers can select up to 4 items for home trial. Delivery partners bring the clothes directly to your doorstep.
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                • <b>15-Minute Trial Window:</b> Enjoy 15 minutes to try your selected items. Purchase only what fits and you love; unselected items are handed back immediately to the rider.
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                • <b>Post-Purchase Policy:</b> Once items are purchased and confirmed at doorstep, no returns or replacements are available.
                            </Typography>
                            <Typography variant="body2">
                                • <b>Fees:</b> No prepaid charge. If any item is purchased, the delivery fee is waived. If no item is kept, the first standard trial is free, later standard trials cost ₹49, and SOS costs ₹99.
                            </Typography>
                        </Box>
                    )}
                    {policyDialog === 'privacy' && (
                        <Box sx={{ color: '#374151', lineHeight: 1.6 }}>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                Doordrape respects your privacy. We store only necessary profile, address and order information needed to complete trials and deliveries safely.
                            </Typography>
                            <Typography variant="body2">
                                We do not sell your personal data to third parties. Authentication cookies are protected with HttpOnly and SameSite controls, and tokens are cryptographically signed.
                            </Typography>
                        </Box>
                    )}
                    {(policyDialog === 'about' || policyDialog === 'careers') && (
                        <Box sx={{ color: '#374151', lineHeight: 1.6 }}>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                Doordrape is a Hyperlocal "Try & Buy" fashion e-commerce platform blending online catalog selection with doorstep trial and instant fulfillment.
                            </Typography>
                            <Typography variant="body2">
                                For inquiries or careers, connect with our support desk via the Help Center in your profile.
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPolicyDialog(null)} sx={{ fontWeight: 700, color: '#0f172a' }}>Close</Button>
                </DialogActions>
            </Dialog>
        </footer>
    );
}
