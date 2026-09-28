import PaymentRecovery from './PaymentRecovery';
import { useState } from 'react';
import { Box, Button, Chip, Drawer, IconButton, List, ListItemButton, ListItemText, Stack, ThemeProvider, Toolbar, Typography, createTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { logout } from '../../services/FetchDjangoApiServices';
import useOrderEvents from '../../services/useOrderEvents';
import { SalesReport, SupportTickets } from './AdminReports';
import Category from './Category';
import DisplayAllCategory from "./DisplayAllCategory"
import MySubCategory from './MySubCategory'
import DisplayAllSubCategory from './DisplayAllSubCategory'
import Brand from './Brand'
import DisplayAllBrand from './DisplayAllBrand'
import Product from './Product'
import DisplayAllProduct from './DisplayAllProduct'
import ProductDetails from './ProductDetails';
import DisplayProductDetails from './DisplayProductDetails';
import Banner from './Banner';
import DeliveryOps from './DeliveryOps';
import DisplayAllOrders from './DisplayAllOrders';
import Dashboard from './Dashboard';
import PincodeManager from './PincodeManager';
import BudgetBazaarManager from './BudgetBazaarManager';




const theme = createTheme({
  palette: {
    primary: { main: '#064e3b', light: '#10b981', dark: '#022c22' },
    secondary: { main: '#d97706' },
    background: { default: '#f8fafc', paper: '#ffffff' },
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  shape: { borderRadius: 14 },
  components: {
    MuiTableCell: {
      styleOverrides: {
        head: { background: '#f1f5f9', fontWeight: 800, whiteSpace: 'nowrap', color: '#1e293b' },
        body: { borderColor: '#f1f5f9' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 700, borderRadius: 10 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
  },
});

const sections = [
  ['OVERVIEW', [['Quick Dashboard', 'dashboard'], ['Sales Report', 'sales'], ['Support Tickets', 'tickets']]],
  ['OPERATIONS', [['Orders', 'orders'], ['Payment Recovery', 'payment-recovery'], ['Delivery Ops', 'deliveryops'], ['Pincodes & Zones', 'pincodes']]],
  ['CATALOG', [['Categories', 'category'], ['Subcategories', 'subcategory'], ['Brands', 'brand'], ['Products & Variants', 'displayallproduct'], ['Budget Bazaar Deals', 'budgetbazaar'], ['Banners', 'banner']]],
];

export default function AdminDashboard() {
  const navigate = useNavigate(), location = useLocation();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');

  useOrderEvents(event => {
    if (['order_created', 'trial_payment_captured'].includes(event.reason)) setNotice(event.order_id);
  });

  const current = location.pathname.split('/')[2] || 'dashboard';

  const sidebar = (
    <Box sx={{
      height: '100%',
      background: 'linear-gradient(180deg, #022c22 0%, #064e3b 45%, #0f172a 100%)',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      p: 2.2,
      borderRight: '1px solid rgba(255, 255, 255, 0.08)',
    }}>
      {/* Brand Header */}
      <Box sx={{ px: 1.5, pt: 1.5, pb: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Stack direction="row" alignItems="center" spacing={1.2}>
          <Box sx={{
            width: 36,
            height: 36,
            borderRadius: 2.5,
            bgcolor: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
          }}>
            <Typography sx={{ fontWeight: 900, color: '#ffffff', fontSize: 18 }}>D</Typography>
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={900} sx={{ letterSpacing: 0.5, lineHeight: 1.1 }}>
              Doordrape
            </Typography>
            <Typography variant="caption" sx={{ color: '#6ee7b7', fontWeight: 700, letterSpacing: 1.2 }}>
              ENTERPRISE ADMIN
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Navigation Sections */}
      <Box sx={{ flex: 1, overflowY: 'auto', mt: 2, pr: 0.5 }}>
        {sections.map(([heading, items]) => (
          <Box key={heading} sx={{ mb: 2.5 }}>
            <Typography
              variant="caption"
              sx={{
                px: 1.5,
                color: '#94a3b8',
                fontWeight: 800,
                letterSpacing: 1.5,
                fontSize: 10,
                display: 'block',
                mb: 0.8,
              }}
            >
              {heading}
            </Typography>
            <List dense disablePadding>
              {items.map(([label, to]) => {
                const isSelected = current === to || (to === 'displayallproduct' && ['displayallproduct', 'product', 'productdetails', 'displayproductdetails'].includes(current));
                return (
                  <ListItemButton
                    key={to}
                    selected={isSelected}
                    onClick={() => {
                      navigate('/admindashboard/' + to);
                      setOpen(false);
                    }}
                    sx={{
                      borderRadius: 2.5,
                      mb: 0.4,
                      px: 1.8,
                      py: 0.9,
                      transition: 'all 0.15s ease-in-out',
                      '&.Mui-selected': {
                        bgcolor: 'rgba(16, 185, 129, 0.18)',
                        color: '#ffffff',
                        borderLeft: '3px solid #10b981',
                        fontWeight: 700,
                        '& .MuiListItemText-primary': { fontWeight: 800, color: '#34d399' },
                      },
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.08)',
                        transform: 'translateX(3px)',
                      },
                    }}
                  >
                    <ListItemText
                      primary={label}
                      primaryTypographyProps={{
                        fontSize: 13.5,
                        fontWeight: isSelected ? 800 : 500,
                        color: isSelected ? '#34d399' : '#cbd5e1',
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      {/* System Status footer */}
      <Box sx={{ pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.08)', px: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981', boxShadow: '0 0 8px #10b981' }} />
          <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
            Live Dispatch Sync Active
          </Typography>
        </Stack>
      </Box>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8fafc' }}>
        <Box component="nav" sx={{ width: { md: 250 }, flexShrink: 0 }}>
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': { width: 250, border: 0 },
            }}
          >
            {sidebar}
          </Drawer>
          <Drawer
            open={open}
            onClose={() => setOpen(false)}
            sx={{ '& .MuiDrawer-paper': { width: 250, border: 0 } }}
          >
            {sidebar}
          </Drawer>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Top Glass Toolbar */}
          <Toolbar
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(12px)',
              borderBottom: '1px solid #e2e8f0',
              gap: 2,
              position: 'sticky',
              top: 0,
              zIndex: 100,
              px: { xs: 2, md: 3 },
            }}
          >
            <IconButton
              sx={{ display: { md: 'none' }, color: '#064e3b' }}
              aria-label="Open admin menu"
              onClick={() => setOpen(true)}
            >
              <MenuIcon />
            </IconButton>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem', lineHeight: 1.2 }}>
                Store Administration
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Try & Buy Operations · Doorstep Fulfillment
              </Typography>
            </Box>

            <Chip
              size="small"
              label="Admin Active"
              sx={{
                bgcolor: 'rgba(16, 185, 129, 0.1)',
                color: '#047857',
                fontWeight: 700,
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}
            />
            <Button
              variant="outlined"
              size="small"
              sx={{
                borderColor: '#cbd5e1',
                color: '#475569',
                '&:hover': { borderColor: '#ef4444', color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.05)' },
              }}
              onClick={async () => {
                const result = await logout();
                if (result.status) navigate('/adminlogin');
                else setNotice(result.message);
              }}
            >
              Sign out
            </Button>
          </Toolbar>

          {notice && (
            <Button
              fullWidth
              sx={{
                bgcolor: '#064e3b',
                color: '#ffffff',
                borderRadius: 0,
                py: 1,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 0.5,
                '&:hover': { bgcolor: '#047857' },
              }}
              onClick={() => {
                navigate('/admindashboard/orders');
                setNotice('');
              }}
            >
              🔔 New Order Activity: {notice} · Click to review in Orders
            </Button>
          )}

          <Box component="main" sx={{ p: { xs: 2, md: 3.5 }, maxWidth: 1800, width: '100%', mx: 'auto', flex: 1 }}>
            <Routes>
              <Route path="payment-recovery" element={<PaymentRecovery />} />
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="sales" element={<SalesReport />} />
              <Route path="tickets" element={<SupportTickets />} />
              <Route element={<Category />} path='/category'></Route>
              <Route element={<DisplayAllCategory />} path='/displayallcategory'></Route>
              <Route element={<MySubCategory />} path="/subcategory" />
              <Route element={<DisplayAllSubCategory />} path="/displayallsubcategory" />
              <Route element={<Brand />} path='/brand' />
              <Route element={<DisplayAllBrand />} path='/displayallbrand' />
              <Route element={<Product />} path='/product' />
              <Route element={<DisplayAllProduct />} path='/displayallproduct' />
              <Route element={<ProductDetails />} path="/productdetails" />
              <Route element={<DisplayProductDetails />} path="/displayproductdetails" />
              <Route element={<Banner />} path="/banner" />
              <Route element={<BudgetBazaarManager />} path="/budgetbazaar" />
              <Route element={<DeliveryOps />} path="/deliveryops" />
              <Route element={<PincodeManager />} path="/pincodes" />
              <Route element={<PincodeManager />} path="/deliveryzones" />
              <Route element={<DisplayAllOrders />} path="/orders" />
              <Route element={<Dashboard />} path="/dashboard" />
              <Route path="*" element={<Navigate to="/admindashboard/dashboard" replace />} />
            </Routes>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
