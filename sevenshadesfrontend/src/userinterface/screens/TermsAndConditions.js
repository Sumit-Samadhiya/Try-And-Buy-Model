import React, { useEffect } from 'react';
import { Container, Box, Typography, Paper, Divider, Breadcrumbs, Link as MuiLink } from '@mui/material';
import { Link } from 'react-router-dom';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import GavelIcon from '@mui/icons-material/Gavel';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function TermsAndConditions() {
    useEffect(() => {
        window.scrollTo(0, 0);
        document.title = "Terms & Conditions | Doordrape Try & Buy";
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
            <Header />

            <Box component="main" sx={{ flexGrow: 1, py: { xs: 4, md: 6 } }}>
                <Container maxWidth="md">
                    {/* Breadcrumbs */}
                    <Breadcrumbs 
                        separator={<NavigateNextIcon fontSize="small" sx={{ color: '#94a3b8' }} />} 
                        aria-label="breadcrumb"
                        sx={{ mb: 3 }}
                    >
                        <MuiLink component={Link} to="/home" underline="hover" color="#64748b" sx={{ fontSize: 14, fontWeight: 500 }}>
                            Home
                        </MuiLink>
                        <Typography color="#0f172a" sx={{ fontSize: 14, fontWeight: 600 }}>
                            Terms & Conditions
                        </Typography>
                    </Breadcrumbs>

                    <Paper 
                        elevation={0} 
                        sx={{ 
                            p: { xs: 3, sm: 5 }, 
                            borderRadius: 3, 
                            border: '1px solid #e2e8f0', 
                            bgcolor: '#ffffff' 
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                            <GavelIcon sx={{ color: '#0f172a', fontSize: 28 }} />
                            <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: '#0f172a', fontSize: { xs: 24, sm: 30 } }}>
                                Terms & Conditions of Service
                            </Typography>
                        </Box>
                        
                        <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                            Effective Date: January 1, 2026 | Last Updated: September 2026
                        </Typography>

                        <Divider sx={{ mb: 4 }} />

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, color: '#334155', lineHeight: 1.7, fontSize: 15 }}>
                            <section>
                                <Typography variant="h6" component="h2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
                                    1. Acceptance of Terms
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.7 }}>
                                    Welcome to Doordrape. By creating an account, browsing our catalog, or scheduling a Doorstep Try & Buy delivery, you agree to be bound by these Terms and Conditions ("Terms"). If you disagree with any portion of these Terms, please refrain from using our services.
                                </Typography>
                            </section>

                            <section>
                                <Typography variant="h6" component="h2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
                                    2. The Doorstep "Try & Buy" Service Model
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.7, mb: 1 }}>
                                    Doordrape operates an experiential hyperlocal fashion model designed to eliminate size uncertainty:
                                </Typography>
                                <ul style={{ paddingLeft: 20, margin: '8px 0', color: '#475569' }}>
                                    <li><b>Trial Item Limit:</b> Customers may reserve up to four (4) apparel items per trial order across different sizes, styles, or colors.</li>
                                    <li><b>15-Minute Trial Window:</b> Upon delivery partner arrival at your designated residential address, a 15-minute trial window begins. Customers are encouraged to try garments in the comfort of their home.</li>
                                    <li><b>Instant Rejection / Handback:</b> Unselected garments that do not fit or meet your expectations must be handed back immediately to the rider partner in their original condition.</li>
                                    <li><b>Immediate Settlement:</b> You pay only for the garments you decide to keep via UPI, Card, or Cash on Delivery (COD).</li>
                                </ul>
                            </section>

                            <section>
                                <Box sx={{ p: 2, bgcolor: '#fffbeb', borderRadius: 2, border: '1px solid #fde68a' }}>
                                    <Typography variant="h6" component="h2" sx={{ fontWeight: 700, color: '#92400e', mb: 1 }}>
                                        3. Post-Purchase Policy (No Returns After Handover)
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#78350f', lineHeight: 1.7 }}>
                                        Because every customer has the exclusive opportunity to physically inspect, feel the fabric, and try the garment on before completing payment, <b>no returns, refunds, or replacements are accepted once the trial is concluded and the rider has departed</b>. Please inspect all items thoroughly during your 15-minute trial window before finalizing payment.
                                    </Typography>
                                </Box>
                            </section>

                            <section>
                                <Typography variant="h6" component="h2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
                                    4. Trial & Delivery Pricing Structure
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.7, mb: 1 }}>
                                    Our doorstep service is transparent with zero hidden fees:
                                </Typography>
                                <ul style={{ paddingLeft: 20, margin: '8px 0', color: '#475569' }}>
                                    <li><b>Item Purchased:</b> If you purchase one or more items from the trial bag, all delivery and trial fees are completely <b>waived (Free Delivery)</b>.</li>
                                    <li><b>First Standard Trial:</b> Your first standard trial order is completely complimentary, even if zero items are kept.</li>
                                    <li><b>Subsequent Zero-Purchase Trials:</b> If no items are purchased from subsequent standard trial orders, a nominal convenience fee of ₹49 is charged to compensate the delivery partner.</li>
                                    <li><b>SOS Fast Fashion:</b> Urgent SOS express trials (90–120 minute fulfillment) carry a nominal service fee of ₹99 if zero items are kept.</li>
                                </ul>
                            </section>

                            <section>
                                <Typography variant="h6" component="h2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
                                    5. Customer Conduct & Rider Safety
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.7 }}>
                                    Doordrape prioritizes the safety and dignity of our rider partners. Customers agree to provide accurate delivery addresses, be present at the scheduled time, respect the 15-minute trial period, and treat delivery personnel with courtesy. Any abuse, harassment, or garment damage during trial will result in immediate suspension of account privileges.
                                </Typography>
                            </section>

                            <section>
                                <Typography variant="h6" component="h2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
                                    6. Garment Condition During Trial
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.7 }}>
                                    Items must be tried on carefully without removing brand tags, damaging zippers, or causing stains (e.g., makeup, perfume, sweat, or food stains). Damaged or altered items cannot be returned to the rider and will be billed at full retail price.
                                </Typography>
                            </section>

                            <section>
                                <Typography variant="h6" component="h2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
                                    7. Governing Law & Dispute Resolution
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.7 }}>
                                    These Terms are governed by and construed in accordance with the laws of the Republic of India. Any legal dispute or claim arising out of or in connection with our services shall be subject to the exclusive jurisdiction of the competent courts in India.
                                </Typography>
                            </section>
                        </Box>
                    </Paper>
                </Container>
            </Box>

            <Footer />
        </div>
    );
}
