import { Grid, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from "@mui/material";
import { useState } from "react";
import { Link } from "react-router-dom";
import { serverURL } from "../../services/FetchDjangoApiServices";
import Icons from "./Icons";

export default function Footer() {
    
    const [policyDialog, setPolicyDialog] = useState(null);

    const linkStyle = {
        fontSize: "13px",
        letterSpacing: "0.2px",
        cursor: "pointer",
        color: "#94a3b8",
        transition: "color 0.15s ease",
        margin: "8px 0",
        display: "block", textDecoration: "none",
        background: "none", border: 0, padding: 0, textAlign: "left", fontFamily: "inherit",
    };

    const foo = () => {
        return (
            <div style={{
                width: "100%",
                backgroundColor: "#0f172a",
                color: "#ffffff",
                padding: '48px 24px 32px',
                boxSizing: 'border-box'
            }}>
                <div style={{ maxWidth: 1360, margin: '0 auto' }}>
                    <Grid container spacing={4} justifyContent="space-between">
                        <Grid item xs={12} sm={6} md={3}>
                            <p style={{ fontSize: '13px', letterSpacing: "1px", fontWeight: '800', color: '#ffffff', textTransform: 'uppercase', marginBottom: 16 }}>
                                HELP & INFORMATION
                            </p>
                            <Link style={linkStyle} onMouseEnter={(e) => e.target.style.color = '#ffffff'} onMouseLeave={(e) => e.target.style.color = '#94a3b8'} to="/profile">
                                Help Center & Support Tickets
                            </Link>
                            <Link style={linkStyle} onMouseEnter={(e) => e.target.style.color = '#ffffff'} onMouseLeave={(e) => e.target.style.color = '#94a3b8'} to="/profile">
                                Track Live Trial Orders
                            </Link>
                            <Link style={linkStyle} onMouseEnter={(e) => e.target.style.color = '#ffffff'} onMouseLeave={(e) => e.target.style.color = '#94a3b8'} onClick={() => setPolicyDialog('delivery')}>
                                Doorstep Trial & Returns Policy
                            </button>
                            <button type="button" style={linkStyle} onMouseEnter={(e) => e.target.style.color = '#ffffff'} onMouseLeave={(e) => e.target.style.color = '#94a3b8'} to="/home">
                                Curated Catalog Sitemap
                            </Link>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <p style={{ fontSize: '13px', letterSpacing: "1px", fontWeight: '800', color: '#ffffff', textTransform: 'uppercase', marginBottom: 16 }}>
                                ABOUT SEVENSHADES
                            </p>
                            <Link style={linkStyle} onMouseEnter={(e) => e.target.style.color = '#ffffff'} onMouseLeave={(e) => e.target.style.color = '#94a3b8'} onClick={() => setPolicyDialog('about')}>
                                Our Try & Buy Mission
                            </button>
                            <button type="button" style={linkStyle} onMouseEnter={(e) => e.target.style.color = '#ffffff'} onMouseLeave={(e) => e.target.style.color = '#94a3b8'} onClick={() => setPolicyDialog('careers')}>
                                Careers & Culture
                            </button>
                            <button type="button" style={linkStyle} onMouseEnter={(e) => e.target.style.color = '#ffffff'} onMouseLeave={(e) => e.target.style.color = '#94a3b8'} onClick={() => setPolicyDialog('delivery')}>
                                Zero-Emission EV Fleet
                            </button>
                            <button type="button" style={linkStyle} onMouseEnter={(e) => e.target.style.color = '#ffffff'} onMouseLeave={(e) => e.target.style.color = '#94a3b8'} onClick={() => setPolicyDialog('about')}>
                                Investor Relations
                            </button>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <p style={{ fontSize: '13px', letterSpacing: "1px", fontWeight: '800', color: '#ffffff', textTransform: 'uppercase', marginBottom: 16 }}>
                                HYPERLOCAL SERVICES
                            </p>
                            <button type="button" style={linkStyle} onMouseEnter={(e) => e.target.style.color = '#ffffff'} onMouseLeave={(e) => e.target.style.color = '#94a3b8'} to="/home">
                                Standard Try & Buy (Same Day)
                            </Link>
                            <Link style={linkStyle} onMouseEnter={(e) => e.target.style.color = '#ffffff'} onMouseLeave={(e) => e.target.style.color = '#94a3b8'} to="/home">
                                SOS Fast Fashion (90-120 Min)
                            </Link>
                            <Link style={linkStyle} onMouseEnter={(e) => e.target.style.color = '#ffffff'} onMouseLeave={(e) => e.target.style.color = '#94a3b8'} to="/profile">
                                Wallet Balance & Trial Credits
                            </Link>
                            <Link style={{ ...linkStyle, color: '#34d399', fontWeight: 700 }} onMouseEnter={(e) => e.target.style.color = '#6ee7b7'} onMouseLeave={(e) => e.target.style.color = '#34d399'} to="/delivery/login">
                                🛵 Rider Partner Portal
                            </Link>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <p style={{ fontSize: '13px', letterSpacing: "1px", fontWeight: '800', color: '#ffffff', textTransform: 'uppercase', marginBottom: 16 }}>
                                DOORSTEP COVERAGE
                            </p>
                            <div style={{ fontSize: "14px", color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <span>Serving Prime India Hubs</span>
                                <img src={`${serverURL}/static/india.png`} style={{ width: 18, height: 18 }} alt="India flag" />
                            </div>
                            <p style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.5, margin: 0 }}>
                                Delivering verified trials directly to residential apartments, villas, and gated societies.
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
                backgroundColor: "#020617",
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                padding: "24px 20px",
                textAlign: 'center'
            }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                        © 2026 SevenShades Inc. All rights reserved. Built for modern doorstep fashion.
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3 }}>
                        <Typography
                            variant="caption"
                            component="button" type="button"
                            sx={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', fontWeight: 600, color: '#cbd5e1', '&:hover': { color: '#ffffff' } }}
                            onClick={() => setPolicyDialog('privacy')}
                        >
                            Privacy Policy & Cookies
                        </Typography>
                        <Typography
                            variant="caption"
                            component="button" type="button"
                            sx={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', fontWeight: 600, color: '#cbd5e1', '&:hover': { color: '#ffffff' } }}
                            onClick={() => setPolicyDialog('delivery')}
                        >
                            Try & Buy Terms of Service
                        </Typography>
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
                padding: '24px 16px'
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
                    {policyDialog === 'about' && 'About SevenShades'}
                    {policyDialog === 'careers' && 'Careers at SevenShades'}
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
                                SevenShades respects your privacy. We store only necessary profile, address and order information needed to complete trials and deliveries safely.
                            </Typography>
                            <Typography variant="body2">
                                We do not sell your personal data to third parties. Authentication cookies are protected with HttpOnly and SameSite controls, and tokens are cryptographically signed.
                            </Typography>
                        </Box>
                    )}
                    {(policyDialog === 'about' || policyDialog === 'careers') && (
                        <Box sx={{ color: '#374151', lineHeight: 1.6 }}>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                SevenShades is a Hyperlocal "Try & Buy" fashion e-commerce platform blending online catalog selection with doorstep trial and instant fulfillment.
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
