import { useTheme } from '@mui/material/styles';
import UseMediaQuery from '@mui/material/useMediaQuery';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

export default function AdvertiseComponent() {
    const theme = useTheme();
    const sm_matches = UseMediaQuery(theme.breakpoints.down('sm'));

    // Remove in mobile view as requested
    if (sm_matches) {
        return null;
    }

    return (
        <div style={{ width: '100%', maxWidth: 1360, margin: '0 auto', padding: '0 16px' }}>
            {/* Try & Buy Promotional Banner */}
            <div style={{
                background: 'linear-gradient(135deg, #064e3b 0%, #065f46 55%, #022c22 100%)',
                color: '#ffffff',
                borderRadius: '20px',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: sm_matches ? '32px 20px' : '48px 40px',
                boxShadow: '0 12px 32px rgba(6, 78, 59, 0.25)',
                display: 'flex',
                flexDirection: sm_matches ? 'column' : 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 28,
                position: 'relative',
                overflow: 'hidden',
            }}>
                <div style={{ maxWidth: 640, textAlign: sm_matches ? 'center' : 'left' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: 'rgba(16, 185, 129, 0.22)',
                        border: '1px solid rgba(52, 211, 153, 0.35)',
                        backdropFilter: 'blur(8px)',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 800,
                        letterSpacing: '0.6px',
                        marginBottom: '16px',
                        color: '#a7f3d0',
                    }}>
                        <span>⚡</span>
                        <span>TRY BEFORE YOU BUY</span>
                    </div>

                    <h2 style={{
                        fontSize: sm_matches ? '24px' : '36px',
                        fontWeight: 800,
                        lineHeight: 1.2,
                        margin: '0 0 12px 0',
                        color: '#ffffff',
                        letterSpacing: '-0.02em',
                    }}>
                        Find Your Perfect Fit at Your Doorstep
                    </h2>

                    <p style={{
                        fontSize: sm_matches ? '14px' : '16px',
                        color: '#d1fae5',
                        margin: '0 0 20px 0',
                        lineHeight: 1.6,
                    }}>
                        Order up to 4 sizes or colors with zero upfront commitment. Try them in the comfort of your home, and pay with Cash or UPI only for what you love.
                    </p>

                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 16,
                        justifyContent: sm_matches ? 'center' : 'flex-start',
                        fontSize: '13px',
                        color: '#e2e8f0',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <CheckCircleOutlineIcon style={{ fontSize: 18, color: '#34d399' }} />
                            <span>Same-Day Scheduled Trials</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <CheckCircleOutlineIcon style={{ fontSize: 18, color: '#34d399' }} />
                            <span>100% Cash / UPI on Delivery</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <LocalShippingOutlinedIcon style={{ fontSize: 18, color: '#34d399' }} />
                            <span>Instant Doorstep Returns</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <button
                        type="button"
                        className="btn-cta-white"
                        style={{
                            backgroundColor: '#ffffff',
                            color: '#064e3b',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '12px 28px',
                            fontSize: '14px',
                            fontWeight: 800,
                            letterSpacing: '0.01em',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#f0fdf4';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.25)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.2)';
                        }}
                        onClick={() => {
                            window.scrollTo({ top: 300, behavior: 'smooth' });
                        }}
                    >
                        Browse Curated Styles &rarr;
                    </button>
                    <span style={{ fontSize: '11px', color: '#a7f3d0', fontWeight: 600 }}>Available in select residential hubs</span>
                </div>
            </div>
        </div>
    );
}