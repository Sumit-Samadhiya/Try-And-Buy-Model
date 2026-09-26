import imageUrl from '../../services/imageUrl';
import { useTheme } from '@mui/material/styles';
import UseMediaQuery from '@mui/material/useMediaQuery';
import { useNavigate } from 'react-router-dom';

export default function MainCategoryComponent(props) {
    const navigate = useNavigate();
    const theme = useTheme();
    const sm_matches = UseMediaQuery(theme.breakpoints.down('sm'));
    const data = props.data || [];

    const handleClick = (item) => {
        navigate('/productpage', { state: { products: item, pageView: 'MainCategoryComponent' } });
    };

    if (!data.length) return null;

    const showAllItems = () => {
        return data.map((item) => {
            return (
                <div
                    key={item.id}
                    onClick={() => handleClick(item)}
                    style={{
                        flex: '1 1 0',
                        minWidth: 0,
                        maxWidth: sm_matches ? 'none' : 520,
                        width: sm_matches ? '50%' : '100%',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: sm_matches ? '14px' : '16px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                        transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease, border-color 0.22s ease',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 14px 28px -4px rgba(15, 23, 42, 0.1)';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.04)';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                >
                    <div style={{ width: '100%', aspectRatio: sm_matches ? '1 / 1.15' : '4 / 5', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
                        <img
                            src={imageUrl(item.icon)}
                            alt={item.maincategoryname || ''}
                            loading="lazy"
                            style={{
                                display: 'block',
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                objectPosition: 'top center',
                                transition: 'transform 0.35s ease',
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.035)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        />
                    </div>

                    <div style={{
                        padding: sm_matches ? '10px 10px 12px' : '20px 24px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        flexGrow: 1,
                        textAlign: 'left',
                        boxSizing: 'border-box'
                    }}>
                        <div style={{
                            fontSize: sm_matches ? '10px' : '12px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.8px',
                            color: '#64748b',
                            marginBottom: sm_matches ? '2px' : '4px'
                        }}>
                            Collection
                        </div>
                        <h3 style={{
                            fontSize: sm_matches ? '14px' : '20px',
                            fontWeight: 800,
                            color: '#0f172a',
                            margin: sm_matches ? '0 0 8px 0' : '0 0 6px 0',
                            lineHeight: 1.25,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {sm_matches ? item.maincategoryname : `Trending for ${item.maincategoryname}`}
                        </h3>
                        {!sm_matches && (
                            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
                                Order multiple styles to try at home. Pay only for what fits you.
                            </p>
                        )}

                        <button
                            type="button"
                            className="btn-cta-primary"
                            style={{
                                width: '100%',
                                marginTop: 'auto',
                                padding: sm_matches ? '8px 6px' : '12px 20px',
                                fontSize: sm_matches ? '12px' : '14px',
                                fontWeight: 700,
                                borderRadius: sm_matches ? '8px' : '10px',
                                whiteSpace: 'nowrap'
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleClick(item);
                            }}
                        >
                            Shop {item.maincategoryname} &rarr;
                        </button>
                    </div>
                </div>
            );
        });
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'stretch',
            width: '100%',
            maxWidth: 1360,
            gap: sm_matches ? 12 : 24,
            flexDirection: 'row',
            boxSizing: 'border-box',
        }}>
            {showAllItems()}
        </div>
    );
}