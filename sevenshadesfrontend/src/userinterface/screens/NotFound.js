import React from 'react';
import { Container, Paper, Typography, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6, bgcolor: '#f8fafc' }}>
        <Container maxWidth="sm">
          <Paper elevation={0} sx={{ p: 5, borderRadius: 4, textAlign: 'center', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
            <Typography variant="h1" sx={{ fontWeight: 900, fontSize: { xs: '72px', sm: '96px' }, color: '#111827', lineHeight: 1 }}>
              404
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 2, mb: 1, color: '#1f2937' }}>
              Page Not Found
            </Typography>
            <Typography variant="body2" sx={{ color: '#6b7280', mb: 4, maxWidth: 360, mx: 'auto' }}>
              The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </Typography>
            <Button
              variant="contained"
              size="large"
              sx={{ bgcolor: '#111827', py: 1.5, px: 4, fontWeight: 700, borderRadius: 2, textTransform: 'none', '&:hover': { bgcolor: '#000000' } }}
              onClick={() => navigate('/home')}
            >
              Return to Storefront
            </Button>
          </Paper>
        </Container>
      </Box>
      <Footer />
    </div>
  );
}
