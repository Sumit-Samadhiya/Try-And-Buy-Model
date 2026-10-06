import BrandLogo from './BrandLogo';
import React, { useState, useEffect } from 'react';
import { Drawer } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import LogoutIcon from '@mui/icons-material/Logout';
import LoginIcon from '@mui/icons-material/Login';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import imageUrl from '../../services/imageUrl';
import { getData, logout } from '../../services/FetchDjangoApiServices';
import './DrawerComponent.css';

export default function DrawerComponent({ open, setOpen }) {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [categories, setCategories] = useState([]);

    // Redux state: user profile & bag items
    const user = useSelector((state) => state.user || {});
    const userData = Object.values(user)[0] || null;
    const bagProducts = useSelector((state) => state.product || {});
    const bagCount = Object.keys(bagProducts).length;

    useEffect(() => {
        let isMounted = true;
        getData('user_main_category_list').then((result) => {
            if (isMounted && result && result.status && Array.isArray(result.data)) {
                setCategories(result.data);
            }
        });
        return () => {
            isMounted = false;
        };
    }, []);

    const handleClose = () => {
        if (typeof setOpen === 'function') {
            setOpen(false);
        }
    };

    const handleNavigate = (path, state) => {
        handleClose();
        if (state) {
            navigate(path, { state });
        } else {
            navigate(path);
        }
    };

    const handleCategoryClick = (category) => {
        handleClose();
        navigate('/productpage', {
            state: { products: category, pageView: 'MainCategoryComponent' }
        });
    };

    const handleLogout = async () => {
        handleClose();
        try {
            await logout();
        } catch (e) {
            // Ignore network errors on logout
        }
        dispatch({ type: 'CLEAR_USER' });
        navigate('/home');
    };

    const userInitial = userData?.customername
        ? userData.customername.trim()[0].toUpperCase()
        : 'U';

    return (
        <Drawer
            anchor="left"
            open={Boolean(open)}
            onClose={handleClose}
            PaperProps={{
                sx: { width: 'min(85vw, 320px)', border: 'none' }
            }}
        >
            <div className="drawer-wrapper">
                {/* Drawer Header */}
                <div className="drawer-header">
                    <div className="drawer-brand">
                        <span className="drawer-brand-title"><BrandLogo light size={28} /></span>
                        <span className="drawer-brand-tag">⚡ Try &amp; Buy Fashion</span>
                    </div>
                    <button
                        type="button"
                        className="drawer-close-btn"
                        onClick={handleClose}
                        aria-label="Close menu"
                    >
                        <CloseRoundedIcon fontSize="small" />
                    </button>
                </div>

                {/* User Profile / Guest Card */}
                <div className="drawer-user-card">
                    {userData ? (
                        <>
                            <div className="drawer-user-info">
                                <div className="drawer-user-avatar">{userInitial}</div>
                                <div className="drawer-user-text">
                                    <p className="drawer-user-name">
                                        {userData.customername || 'Valued Customer'}
                                    </p>
                                    <p className="drawer-user-sub">
                                        {userData.mobileno ? `+91 ${userData.mobileno}` : 'Verified Account'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="drawer-auth-btn"
                                onClick={() => handleNavigate('/profile')}
                            >
                                Manage Account &amp; Trials &rarr;
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="drawer-user-text">
                                <p className="drawer-user-name">Welcome to Doordrape</p>
                                <p className="drawer-user-sub">
                                    Try up to 4 styles at home. Pay only for what fits.
                                </p>
                            </div>
                            <button
                                type="button"
                                className="drawer-auth-btn"
                                onClick={() => handleNavigate('/signindisplay')}
                            >
                                <LoginIcon fontSize="small" />
                                <span>Sign In / Register</span>
                            </button>
                        </>
                    )}
                </div>

                {/* Scrollable Navigation Body */}
                <div className="drawer-scroll-body">
                    {/* Primary Shortcut Fields */}
                    <div className="drawer-section-title">Quick Shortcuts</div>

                    {/* Shortcut 1: Try Bag */}
                    <button
                        type="button"
                        className="drawer-item"
                        onClick={() => handleNavigate('/mybagdisplay')}
                    >
                        <div className="drawer-item-left">
                            <div className="drawer-item-icon-box">
                                <ShoppingBagOutlinedIcon fontSize="small" />
                            </div>
                            <div className="drawer-item-text">
                                <span className="drawer-item-title">Try Bag</span>
                                <span className="drawer-item-desc">Doorstep trial bag</span>
                            </div>
                        </div>
                        <div className="drawer-item-right">
                            {bagCount > 0 ? (
                                <span className="drawer-badge">{bagCount} {bagCount === 1 ? 'item' : 'items'}</span>
                            ) : (
                                <ChevronRightRoundedIcon fontSize="small" />
                            )}
                        </div>
                    </button>

                    {/* Shortcut 2: My Orders & Active Trials */}
                    <button
                        type="button"
                        className="drawer-item"
                        onClick={() => handleNavigate(userData ? '/profile' : '/signindisplay')}
                    >
                        <div className="drawer-item-left">
                            <div className="drawer-item-icon-box">
                                <ReceiptLongOutlinedIcon fontSize="small" />
                            </div>
                            <div className="drawer-item-text">
                                <span className="drawer-item-title">My Orders &amp; Trials</span>
                                <span className="drawer-item-desc">Track active doorstep orders</span>
                            </div>
                        </div>
                        <div className="drawer-item-right">
                            <ChevronRightRoundedIcon fontSize="small" />
                        </div>
                    </button>

                    {/* Shortcut 3: Budget Bazaar Deals */}
                    <button
                        type="button"
                        className="drawer-item"
                        onClick={() => handleNavigate('/home')}
                    >
                        <div className="drawer-item-left">
                            <div className="drawer-item-icon-box" style={{ color: '#d97706', backgroundColor: '#fef3c7' }}>
                                <ElectricBoltIcon fontSize="small" />
                            </div>
                            <div className="drawer-item-text">
                                <span className="drawer-item-title">Budget Bazaar Deals</span>
                                <span className="drawer-item-desc">Under ₹399, ₹499 &amp; ₹899 value picks</span>
                            </div>
                        </div>
                        <div className="drawer-item-right">
                            <ChevronRightRoundedIcon fontSize="small" />
                        </div>
                    </button>

                    <div className="drawer-divider" />

                    {/* Collections / Categories */}
                    <div className="drawer-section-title">Shop Collections</div>
                    {categories.length > 0 ? (
                        categories.map((category) => (
                            <button
                                key={category.id}
                                type="button"
                                className="drawer-item"
                                onClick={() => handleCategoryClick(category)}
                            >
                                <div className="drawer-item-left">
                                    <img
                                        src={imageUrl(category.icon)}
                                        alt={category.maincategoryname || ''}
                                        className="drawer-item-img"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                    <div className="drawer-item-text">
                                        <span className="drawer-item-title">
                                            {category.maincategoryname}
                                        </span>
                                        <span className="drawer-item-desc">
                                            {category.maincategoryname?.toLowerCase() === 'women'
                                                ? 'Dresses, Kurtis, Tops & Denim'
                                                : 'Shirts, Jeans, T-Shirts & Shoes'}
                                        </span>
                                    </div>
                                </div>
                                <div className="drawer-item-right">
                                    <ChevronRightRoundedIcon fontSize="small" />
                                </div>
                            </button>
                        ))
                    ) : (
                        <>
                            <button
                                type="button"
                                className="drawer-item"
                                onClick={() => handleNavigate('/home')}
                            >
                                <div className="drawer-item-left">
                                    <div className="drawer-item-icon-box">W</div>
                                    <span className="drawer-item-title">Women</span>
                                </div>
                                <div className="drawer-item-right">
                                    <ChevronRightRoundedIcon fontSize="small" />
                                </div>
                            </button>
                            <button
                                type="button"
                                className="drawer-item"
                                onClick={() => handleNavigate('/home')}
                            >
                                <div className="drawer-item-left">
                                    <div className="drawer-item-icon-box">M</div>
                                    <span className="drawer-item-title">Men</span>
                                </div>
                                <div className="drawer-item-right">
                                    <ChevronRightRoundedIcon fontSize="small" />
                                </div>
                            </button>
                        </>
                    )}

                    <div className="drawer-divider" />

                    {/* Services & Support */}
                    <div className="drawer-section-title">Services &amp; Help</div>

                    {/* Shortcut 4: Doorstep Trial & Returns Policy */}
                    <button
                        type="button"
                        className="drawer-item"
                        onClick={() => handleNavigate('/terms-and-conditions')}
                    >
                        <div className="drawer-item-left">
                            <div className="drawer-item-icon-box">
                                <LocalShippingOutlinedIcon fontSize="small" />
                            </div>
                            <div className="drawer-item-text">
                                <span className="drawer-item-title">Doorstep Trial Policy</span>
                                <span className="drawer-item-desc">How Try &amp; Buy works</span>
                            </div>
                        </div>
                        <div className="drawer-item-right">
                            <ChevronRightRoundedIcon fontSize="small" />
                        </div>
                    </button>

                    {/* Shortcut 5: Customer Support & Tickets */}
                    <button
                        type="button"
                        className="drawer-item"
                        onClick={() => handleNavigate(userData ? '/profile' : '/signindisplay')}
                    >
                        <div className="drawer-item-left">
                            <div className="drawer-item-icon-box">
                                <HelpOutlineOutlinedIcon fontSize="small" />
                            </div>
                            <div className="drawer-item-text">
                                <span className="drawer-item-title">Help &amp; Support</span>
                                <span className="drawer-item-desc">Raise ticket or live assist</span>
                            </div>
                        </div>
                        <div className="drawer-item-right">
                            <ChevronRightRoundedIcon fontSize="small" />
                        </div>
                    </button>

                    {/* Shortcut 6: Rider Partner Portal */}
                    <button
                        type="button"
                        className="drawer-item"
                        onClick={() => handleNavigate('/delivery/login')}
                    >
                        <div className="drawer-item-left">
                            <div className="drawer-item-icon-box">
                                <TwoWheelerIcon fontSize="small" />
                            </div>
                            <div className="drawer-item-text">
                                <span className="drawer-item-title">Rider Partner Portal</span>
                                <span className="drawer-item-desc">Delivery agent login</span>
                            </div>
                        </div>
                        <div className="drawer-item-right">
                            <ChevronRightRoundedIcon fontSize="small" />
                        </div>
                    </button>
                </div>

                {/* Footer Section */}
                <div className="drawer-footer">
                    {userData ? (
                        <button
                            type="button"
                            className="drawer-logout-btn"
                            onClick={handleLogout}
                        >
                            <LogoutIcon fontSize="small" />
                            <span>Log Out of Doordrape</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="drawer-auth-btn"
                            style={{ margin: 0 }}
                            onClick={() => handleNavigate('/signindisplay')}
                        >
                            <LoginIcon fontSize="small" />
                            <span>Sign In / Create Account</span>
                        </button>
                    )}
                    <p className="drawer-footer-note">
                        Doordrape · Fashion at Your Doorstep
                    </p>
                </div>
            </div>
        </Drawer>
    );
}
