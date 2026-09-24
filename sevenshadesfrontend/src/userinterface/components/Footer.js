import { Grid, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { serverURL } from "../../services/FetchDjangoApiServices";
import Icons from "./Icons";

export default function Footer() {
    const navigate = useNavigate();
    const [policyDialog, setPolicyDialog] = useState(null);


    const linkStyle = {
        fontSize: "14px",
        letterSpacing: "0.5px",
        paddingLeft: "10px",
        cursor: "pointer",
        color: "#374151",
        transition: "color 0.15s ease",
        margin: "8px 0"
    };

    const foo = () => {
        return (
            <div style={{width:"100%", minHeight: "240px", backgroundColor: "#E5E7EB", margin: '0 auto', padding: '30px 0'}}>
                <Grid container spacing={3} style={{display:'flex',justifyContent:'center',alignItems:'flex-start',paddingLeft:'50px',paddingRight:'50px'}}>
                    <Grid item xs={12} sm={3}>
                        <p style={{fontSize:'15px',letterSpacing:"1.5px",paddingLeft:"10px",fontWeight:'800',color:'#111827',marginBottom:12}}>HELP & INFORMATION</p>
                        <p style={linkStyle} onClick={() => navigate('/profile')}>Help Center & Tickets</p>
                        <p style={linkStyle} onClick={() => navigate('/profile')}>Track Orders</p>
                        <p style={linkStyle} onClick={() => setPolicyDialog('delivery')}>Delivery & Trial Policy</p>
                        <p style={linkStyle} onClick={() => navigate('/home')}>Storefront Sitemap</p>
                    </Grid>

                    <Grid item xs={12} sm={3}>
                        <p style={{fontSize:'15px',letterSpacing:"1.5px",paddingLeft:"10px",fontWeight:'800',color:'#111827',marginBottom:12}}>ABOUT SEVENSHADES</p>
                        <p style={linkStyle} onClick={() => setPolicyDialog('about')}>About Us</p>
                        <p style={linkStyle} onClick={() => setPolicyDialog('careers')}>Careers at SevenShades</p>
                        <p style={linkStyle} onClick={() => setPolicyDialog('delivery')}>Hyperlocal EV Fleet</p>
                        <p style={linkStyle} onClick={() => setPolicyDialog('about')}>Investor Relations</p>
                    </Grid>

                    <Grid item xs={12} sm={3}>
                        <p style={{fontSize:'15px',letterSpacing:"1.5px",paddingLeft:"10px",fontWeight:'800',color:'#111827',marginBottom:12}}>HYPERLOCAL SERVICES</p>
                        <p style={linkStyle} onClick={() => navigate('/home')}>Standard Try & Buy (Same Day)</p>
                        <p style={linkStyle} onClick={() => navigate('/home')}>Emergency SOS Fashion (90-120 Min)</p>
                        <p style={linkStyle} onClick={() => navigate('/profile')}>My Wallet & Credits</p>
                        <p style={{...linkStyle, color: '#059669', fontWeight: 600}} onClick={() => navigate('/delivery/login')}>🛵 Rider Partner Login</p>
                    </Grid>

                    <Grid item xs={12} sm={3}>
                        <p style={{fontSize:'15px',letterSpacing:"1.5px",paddingLeft:"10px",fontWeight:'800',color:'#111827',marginBottom:12}}>SERVICE REGION</p>
                        <p style={{fontSize:"14px",letterSpacing:"0.5px",paddingLeft:"10px",color:'#374151',display:'flex',alignItems:'center',gap:8}}>
                            Serving in India <img src={`${serverURL}/static/india.png`} style={{width:'20px',height:'20px'}} alt="India flag"/>
                        </p>
                        <p style={{fontSize:"12px",color:"#6b7280",paddingLeft:"10px",marginTop:8}}>
                            Residential & gated societies doorstep trial access.
                        </p>
                    </Grid>
                </Grid>
            </div>
        )
    }

    const foo1 = () => {
        return (
            <div style={{width:'100%',backgroundColor:"#E5E7EB",padding:"20px",textAlign:'center'}}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: '#4b5563' }}>
                        © 2026 SevenShades, Inc. All rights reserved.
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                        <Typography variant="caption" sx={{ cursor: 'pointer', fontWeight: 600, color: '#111827' }} onClick={() => setPolicyDialog('privacy')}>
                            Privacy Policy & Cookies
                        </Typography>
                        <Typography variant="caption" sx={{ cursor: 'pointer', fontWeight: 600, color: '#111827' }} onClick={() => setPolicyDialog('delivery')}>
                            Try & Buy Terms
                        </Typography>
                    </Box>
                </Box>
            </div>
        )
    }

    return (
        <div style={{width:"100%"}}>
            <div style={{width:"100%",display:'flex',justifyContent:'center',alignItems:'center',marginBottom:'30px'}}>
                <Icons/>
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
                                • <b>Fees:</b> First trial order is FREE. Subsequent standard trials carry a ₹49 fee which is adjusted from your purchase bill if any item is purchased. SOS 90-120 minute priority delivery is ₹99.
                            </Typography>
                        </Box>
                    )}
                    {policyDialog === 'privacy' && (
                        <Box sx={{ color: '#374151', lineHeight: 1.6 }}>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                SevenShades respects your privacy. We store only necessary profile, address and order information needed to complete trials and deliveries safely.
                            </Typography>
                            <Typography variant="body2">
                                We do not sell your personal data to third parties. Session cookies and authentication tokens are securely encrypted.
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
                    <Button onClick={() => setPolicyDialog(null)} sx={{ fontWeight: 700 }}>Close</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
