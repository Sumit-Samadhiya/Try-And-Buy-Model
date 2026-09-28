import React, { useEffect } from 'react';
import { Container, Box, Typography, Paper, Divider, Breadcrumbs, Link as MuiLink } from '@mui/material';
import { Link } from 'react-router-dom';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import SecurityIcon from '@mui/icons-material/Security';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function PrivacyPolicy() {
    useEffect(() => {
        window.scrollTo(0, 0);
        document.title = "Privacy Policy | SevenShades Try & Buy";
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
                            Privacy Policy
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
                            <SecurityIcon sx={{ color: '#0f172a', fontSize: 28 }} />
                            <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: '#0f172a', fontSize: { xs: 24, sm: 30 } }}>
                                Privacy Policy
                            </Typography>
                        </Box>
                        
                        <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                            Effective Date: January 1, 2026 | Last Updated: September 2026
                        </Typography>

                        <Divider sx={{ mb: 4 }} />

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, color: '#334155', lineHeight: 1.7, fontSize: 15 }}>
                            <section>
                                <Typography variant="h6" component="h2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
                                    1. Introduction
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.7 }}>
                                    SevenShades ("we", "our", or "us") operates a hyperlocal Doorstep Try & Buy fashion commerce platform. We are committed to safeguarding the privacy and security of your personal data. This Privacy Policy details how we collect, store, process, and protect your information when you access our website, mobile interface, and doorstep trial delivery services.
                                </Typography>
                            </section>

                            <section>
                                <Typography variant="h6" component="h2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
                                    2. Information We Collect
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.7, mb: 1 }}>
                                    To provide our doorstep fashion trials and fulfill orders safely, we collect the following categories of information:
                                </Typography>
                                <ul style={{ paddingLeft: 20, margin: '8px 0', color: '#475569' }}>
                                    <li><b>Identity & Contact Data:</b> Your name, 10-digit mobile phone number, email address, and delivery addresses (flat/house number, building, landmark, city, and PIN code).</li>
                                    <li><b>Doorstep Trial & Order Data:</b> Items reserved for trial, selected sizes/colors, final items purchased, trial outcome logs, and payment method details.</li>
                                    <li><b>Location Data:</b> Delivery address coordinates and hyperlocal zone identification used solely to route assigned delivery partners to your designated address.</li>
                                    <li><b>Technical & Device Data:</b> IP address, browser type, operating system, and secure session tokens used to authenticate your account and prevent fraudulent transactions.</li>
                                </ul>
                            </section>

                            <section>
                                <Typography variant="h6" component="h2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
                                    3. Doorstep Try & Buy Data Usage
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.7 }}>
                                    Our business model relies on trusted physical delivery where our rider partner brings selected garments to your door for a 15-minute trial window. We share only necessary contact and address details with verified delivery personnel assigned to your active trial order. Delivery personnel are bound by strict non-disclosure obligations and access your phone number solely through masked communication channels.
                                </Typography>
                            </section>

                            <section id="cookies">
                                <Typography variant="h6" component="h2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
                                    4. Cookies & Tracking Technologies
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.7, mb: 1 }}>
                                    We use cookies and similar browser storage mechanisms to enhance user experience and maintain secure sessions:
                                </Typography>
                                <ul style={{ paddingLeft: 20, margin: '8px 0', color: '#475569' }}>
                                    <li><b>Strictly Essential Cookies:</b> Required for authentication, CSRF security, shopping bag persistence, and session management. These cannot be disabled.</li>
                                    <li><b>Functional Cookies:</b> Remember your preferences, trial selections, and delivery city for seamless browsing.</li>
                                    <li><b>Performance & Analytics Cookies:</b> Help us analyze page load times, catalog interactions, and navigation efficiency to improve the Try & Buy platform.</li>
                                </ul>
                                <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.7, mt: 1 }}>
                                    You can manage your cookie preferences anytime through our on-site Cookie Consent banner or via your browser settings.
                                </Typography>
                            </section>

                            <section>
                                <Typography variant="h6" component="h2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
                                    5. Payment & Financial Data Security
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.7 }}>
                                    We do not store complete credit card or debit card numbers on our servers. All digital payments (UPI, cards, net banking) are processed through Reserve Bank of India (RBI) authorized, PCI-DSS compliant payment gateways. Cash on Delivery (COD) and doorstep UPI payments are confirmed directly via secure rider verification.
                                </Typography>
                            </section>

                            <section>
                                <Typography variant="h6" component="h2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
                                    6. Data Retention & Security Measures
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.7 }}>
                                    We apply industry-standard security measures including end-to-end TLS/HTTPS encryption, cryptographic password hashing (Argon2 / PBKDF2), SameSite secure cookie flags, and database access controls. Your profile data is retained as long as your account remains active or as required by statutory taxation and commerce regulations in India.
                                </Typography>
                            </section>

                            <section>
                                <Typography variant="h6" component="h2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
                                    7. Your Rights & Consent Withdrawal
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.7 }}>
                                    Under the Digital Personal Data Protection Act, 2023 (DPDP) and applicable privacy regulations, you have the right to review, update, or request the deletion of your personal data. You may withdraw consent or request complete profile erasure by submitting a request through your profile Help Desk or contacting our Grievance Officer.
                                </Typography>
                            </section>

                            <section>
                                <Typography variant="h6" component="h2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
                                    8. Contact & Grievance Redressal
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.7 }}>
                                    If you have inquiries, complaints, or feedback regarding our privacy practices, please contact our designated Grievance Officer:
                                </Typography>
                                <Box sx={{ mt: 1.5, p: 2, bgcolor: '#f1f5f9', borderRadius: 2, border: '1px solid #cbd5e1' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                                        Grievance Officer — SevenShades Hyperlocal Fashion
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#475569' }}>
                                        Email: privacy@sevenshades.in / support@sevenshades.in
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#475569' }}>
                                        Location: SevenShades Logistics Hub, Prime India Tech Corridor
                                    </Typography>
                                </Box>
                            </section>
                        </Box>
                    </Paper>
                </Container>
            </Box>

            <Footer />
        </div>
    );
}
