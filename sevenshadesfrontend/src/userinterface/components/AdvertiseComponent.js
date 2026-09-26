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
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: '#ffffff',
                borderRadius: '20px',
                padding: sm_matches ? '32px 20px' : '48px 40px',
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.15)',
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
                        backgroundColor: 'rgba(255, 255, 255, 0.12)',
                        backdropFilter: 'blur(8px)',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                        marginBottom: '16px',
                        color: '#f8fafc',
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
                        color: '#cbd5e1',
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
                            <CheckCircleOutlineIcon style={{ fontSize: 18, color: '#4ade80' }} />
                            <span>Same-Day Scheduled Trials</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <CheckCircleOutlineIcon style={{ fontSize: 18, color: '#4ade80' }} />
                            <span>100% Cash / UPI on Delivery</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <LocalShippingOutlinedIcon style={{ fontSize: 18, color: '#4ade80' }} />
                            <span>Instant Doorstep Returns</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <button
                        type="button"
                        style={{
                            backgroundColor: '#ffffff',
                            color: '#0f172a',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '14px 32px',
                            fontSize: '15px',
                            fontWeight: 800,
                            letterSpacing: '0.02em',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#f1f5f9';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.3)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.25)';
                        }}
                        onClick={() => {
                            window.scrollTo({ top: 300, behavior: 'smooth' });
                        }}
                    >
                        Browse Curated Styles &rarr;
                    </button>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Available in select residential hubs</span>
                </div>
            </div>
        </div>
    );
}