import imageUrl from '../../services/imageUrl';
import './ProductByCategory.css';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import UseMediaQuery from '@mui/material/useMediaQuery';

export default function ProductByCategory(props) {
    const theme = useTheme();
    const sm_matches = UseMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();

    const handleNextPage = (item) => {
        navigate('/productdetailspage', { state: { productid: item.id } });
    };

    const items = props.data;

    if (!items || items.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: '#6b7280' }}>
                <p style={{ fontSize: '18px', fontWeight: 600 }}>No products found in this category.</p>
                <p style={{ fontSize: '14px' }}>Please check back later or explore other collections.</p>
            </div>
        );
    }

    const renderProducts = () => {
        return items.map((item, index) => {
            const isUnavailable = item.is_available === false || item.variants_count === 0;
            return (
                <div
                    key={index}
                    onClick={() => handleNextPage(item)}
                    className="product-item"
                    style={{ position: 'relative', opacity: isUnavailable ? 0.78 : 1 }}
                >
                    {isUnavailable && (
                        <span
                            style={{
                                position: 'absolute',
                                top: 10,
                                right: 10,
                                background: '#374151',
                                color: '#ffffff',
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: '4px',
                                letterSpacing: '0.5px',
                                zIndex: 2,
                            }}
                        >
                            Unavailable
                        </span>
                    )}
                    <img src={imageUrl(item.icon)} alt={item.productname || ''} className="product-image" />
                    <div className="product-details">
                        <div style={{ fontWeight: 600 }}>{item.productname}</div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>{item.description}</div>
                        {(item.min_offerprice > 0 || item.min_price > 0) && (
                            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: 800, fontSize: '15px', color: '#111827' }}>
                                    ₹{item.min_offerprice > 0 ? item.min_offerprice : item.min_price}
                                </span>
                                {item.min_offerprice > 0 && item.min_price > item.min_offerprice && (
                                    <>
                                        <span style={{ fontSize: '12px', color: '#9ca3af', textDecoration: 'line-through' }}>
                                            ₹{item.min_price}
                                        </span>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#15803d' }}>
                                            {Math.round(((item.min_price - item.min_offerprice) / item.min_price) * 100)}% OFF
                                        </span>
                                    </>
                                )}
                            </div>
                        )}
                        {item.total_reviews > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>
                                    ⭐ {Number(item.avg_rating || 0).toFixed(1)}
                                </span>
                                <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                                    ({item.total_reviews})
                                </span>
                            </div>
                        )}
                    </div>
                </div>

            );
        });
    };

    return (
        <div className={sm_matches ? "product-container-2" : "product-container"}>
            {renderProducts()}
        </div>
    );
}