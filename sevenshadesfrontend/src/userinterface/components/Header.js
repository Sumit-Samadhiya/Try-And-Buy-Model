import imageUrl from '../../services/imageUrl';
import * as React from 'react';
import { useState, useEffect } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Button, Badge } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import { Divider, Grid } from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import SearchBarComponent from './SearchBarComponent';
import { useTheme } from '@mui/material/styles';
import UseMediaQuery from '@mui/material/useMediaQuery';
import DrawerComponent from './DrawerComponent';
import { postData, getData } from '../../services/FetchDjangoApiServices';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

export default function Header() {
    const theme = useTheme();
    const products = useSelector(state => state.product);
    const keys = Object.values(products);
    const user = useSelector(state => state.user);
    let userData = {};
    try {
        userData = Object.values(user)[0];
    } catch (e) { }

    const navigate = useNavigate();
    const md_matches = UseMediaQuery(theme.breakpoints.down('md'));
    const sm_matches = UseMediaQuery(theme.breakpoints.down('sm'));
    const [open, setOpen] = useState(false);
    const [subCategoryList, setSubCategoryList] = useState([]);
    const [backgroundColor, setBgStatus] = useState(null);
    const [categories, setCategories] = useState([]);
    const menId = categories.find(c => c.maincategoryname?.toLowerCase() === 'men')?.id;
    const womenId = categories.find(c => c.maincategoryname?.toLowerCase() === 'women')?.id;
    const [brandList, setBrandList] = useState([]);
    const [statusSubMenu, setStatusSubMenu] = useState(false);

    const fetchAllSubCategory = async (id) => {
        if (!id) return;
        const result = await postData('user_mysubcategory_list_by_maincategoryid', { maincategoryid: id });
        setSubCategoryList(result?.data || []);
        setBgStatus(id);
    };

    const fetchAllBrands = async (sid) => {
        const result = await getBrandsByCategory(sid);
        setBrandList(result);
    };

    const getBrandsByCategory = async (sid) => {
        const productsByCategory = await postData('user_products_maincategory', { maincategoryid: backgroundColor });
        const filteredProducts = (productsByCategory?.data || []).filter((item) => item?.subcategoryid?.id === sid);
        const uniqueBrand = {};
        filteredProducts.forEach((item) => {
            if (item?.brandid?.id) {
                uniqueBrand[item.brandid.id] = item.brandid;
            }
        });
        return Object.values(uniqueBrand);
    };

    const handleDrawerOpen = () => {
        setOpen(true);
    };

    useEffect(() => {
        getData('user_maincategory_list').then(result => {
            const rows = result?.data || []; setCategories(rows);
            fetchAllSubCategory(rows.find(c => c.maincategoryname?.toLowerCase() === 'men')?.id || rows[0]?.id);
        });
    }, []);

    const showAllSubCategory = () => {
        return subCategoryList.map((item) => {
            return (
                <div
                    key={item.id}
                    onMouseOver={() => handleSubMenu(item)}
                    onClick={() => navigate('/productpage', { state: { products: item, pageView: 'SubCategoryComponent' } })}
                    style={{
                        marginRight: 20,
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap',
                        color: '#f8fafc',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                    {item.subcategoryname}
                </div>
            );
        });
    };

    const showAllBrands = () => {
        return brandList.map((item) => {
            return (
                <div
                    key={item.id}
                    onClick={() => {
                        setStatusSubMenu(false);
                        navigate('/productpage', { state: { products: item, pageView: 'BrandComponent' } });
                    }}
                    style={{
                        padding: '6px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        cursor: 'pointer',
                        borderRadius: 6,
                        transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                    <img src={imageUrl(item?.icon)} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{item?.brandname}</span>
                </div>
            );
        });
    };

    const handleSubMenu = (item) => {
        fetchAllBrands(item.id);
        setStatusSubMenu(true);
    };

    const handleGotoCartPage = () => {
        navigate('/mybagdisplay');
    };

    const handleLoginPage = () => {
        if (userData?.mobileno) {
            navigate('/profile');
        } else {
            navigate('/signindisplay');
        }
    };

    const showSubMenu = () => {
        return (
            <div
                onMouseLeave={() => setStatusSubMenu(false)}
                style={{
                    width: '640px',
                    maxHeight: '340px',
                    backgroundColor: '#ffffff',
                    position: 'absolute',
                    zIndex: 99,
                    left: 120,
                    top: 108,
                    padding: 20,
                    borderRadius: 12,
                    boxShadow: '0 16px 36px rgba(15, 23, 42, 0.15)',
                    border: '1px solid #e2e8f0',
                }}
            >
                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <div style={{ fontWeight: 800, fontSize: 12, color: '#64748b', letterSpacing: '0.8px', marginBottom: 8 }}>
                            FEATURED BRANDS
                            <Divider sx={{ my: 1 }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
                            {showAllBrands()}
                        </div>
                    </Grid>
                    <Grid item xs={6}>
                        <div style={{ fontWeight: 800, fontSize: 12, color: '#64748b', letterSpacing: '0.8px', marginBottom: 8 }}>
                            TRY & BUY SERVICE
                            <Divider sx={{ my: 1 }} />
                        </div>
                        <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                            <p style={{ margin: '0 0 8px 0' }}>• Choose multiple sizes or colors</p>
                            <p style={{ margin: '0 0 8px 0' }}>• Doorstep delivery with scheduled call</p>
                            <p style={{ margin: '0 0 8px 0' }}>• 100% Cash / UPI on Delivery</p>
                            <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>• Pay only for what you keep</p>
                        </div>
                    </Grid>
                </Grid>
            </div>
        );
    };

    return (
        <Box sx={{ flexGrow: 1, position: 'sticky', top: 0, zIndex: 100 }}>
            {/* Primary Dark Slate Header */}
            <AppBar
                elevation={0}
                position="static"
                sx={{
                    backgroundColor: '#0f172a',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                }}
            >
                <Toolbar sx={{ height: 68, px: { xs: 2, sm: 3 } }}>
                    {sm_matches && (
                        <IconButton
                            size="large"
                            edge="start"
                            color="inherit"
                            aria-label="menu"
                            sx={{ mr: 1 }}
                            onClick={handleDrawerOpen}
                        >
                            <MenuIcon />
                        </IconButton>
                    )}

                    {/* Logo & Brand Name */}
                    <div
                        onClick={() => navigate('/home')}
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: 6 }}
                    >
                        <Typography
                            variant="h6"
                            component="div"
                            sx={{
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                fontWeight: 800,
                                fontSize: { xs: 20, sm: 24 },
                                letterSpacing: '-0.02em',
                                color: '#ffffff',
                            }}
                        >
                            SevenShades
                        </Typography>
                        <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.6px',
                            color: '#94a3b8',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            padding: '2px 6px',
                            borderRadius: 4,
                            textTransform: 'uppercase',
                        }}>
                            TRY & BUY
                        </span>
                    </div>

                    {/* Men / Women Switcher */}
                    {!sm_matches && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 28 }}>
                            <Button
                                onClick={() => {
                                    fetchAllSubCategory(menId);
                                    navigate('/home');
                                }}
                                onMouseOver={() => fetchAllSubCategory(menId)}
                                sx={{
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    fontSize: 14,
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    px: 2,
                                    py: 0.6,
                                    textTransform: 'none',
                                    color: '#ffffff',
                                    backgroundColor: backgroundColor === menId ? 'rgba(255, 255, 255, 0.16)' : 'transparent',
                                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.22)' }
                                }}
                            >
                                Men
                            </Button>
                            <Button
                                onClick={() => {
                                    fetchAllSubCategory(womenId);
                                    navigate('/home');
                                }}
                                onMouseOver={() => fetchAllSubCategory(womenId)}
                                sx={{
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    fontSize: 14,
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    px: 2,
                                    py: 0.6,
                                    textTransform: 'none',
                                    color: '#ffffff',
                                    backgroundColor: backgroundColor === womenId ? 'rgba(255, 255, 255, 0.16)' : 'transparent',
                                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.22)' }
                                }}
                            >
                                Women
                            </Button>
                        </div>
                    )}

                    {/* Search Bar */}
                    {md_matches ? <div style={{ flexGrow: 1 }} /> : <SearchBarComponent />}

                    {/* Actions: Account & Try Bag */}
                    <div style={{
                        marginLeft: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 20,
                    }}>
                        <div
                            onClick={handleLoginPage}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                cursor: 'pointer',
                                padding: '4px 8px',
                                borderRadius: '8px',
                                transition: 'background-color 0.15s ease',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <PersonOutlineIcon style={{ fontSize: 24, color: '#ffffff' }} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#cbd5e1' }}>
                                {userData?.fname || 'Sign In'}
                            </span>
                        </div>

                        <div
                            onClick={handleGotoCartPage}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                cursor: 'pointer',
                                padding: '4px 8px',
                                borderRadius: '8px',
                                transition: 'background-color 0.15s ease',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <Badge
                                badgeContent={keys.length}
                                sx={{
                                    '& .MuiBadge-badge': {
                                        backgroundColor: '#3b82f6',
                                        color: '#ffffff',
                                        fontWeight: 800,
                                        fontSize: 11,
                                    }
                                }}
                            >
                                <ShoppingBagOutlinedIcon style={{ fontSize: 24, color: '#ffffff' }} />
                            </Badge>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#cbd5e1' }}>
                                Try Bag
                            </span>
                        </div>
                    </div>
                </Toolbar>
            </AppBar>

            {/* Sub-header / Subcategory Strip */}
            {!md_matches && (
                <div style={{
                    backgroundColor: '#1e293b',
                    height: 44,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 24px',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.08)',
                }}>
                    <div style={{ display: 'flex', overflowX: 'auto', alignItems: 'center', scrollbarWidth: 'none' }}>
                        {showAllSubCategory()}
                    </div>
                </div>
            )}

            <DrawerComponent open={open} setOpen={setOpen} />
            {statusSubMenu ? showSubMenu() : null}
        </Box>
    );
}