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
        const queryParams = new URLSearchParams();
        if (item.id) queryParams.set('productid', item.id);
        if (item.color) queryParams.set('color', item.color);
        navigate(`/productdetailspage?${queryParams.toString()}`, {
            state: { productid: item.id, color: item.color, size: item.available_sizes?.[0] || '' }
        });
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
                    key={item.listing_id || index}
                    onClick={() => handleNextPage(item)}
                    className="product-item"
                    style={{ position: 'relative', opacity: isUnavailable ? 0.78 : 1 }}
                >
                    {isUnavailable ? (
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
                    ) : (
                        <span
                            style={{
                                position: 'absolute',
                                top: 10,
                                left: 10,
                                background: '#111827',
                                color: '#ffffff',
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: '4px',
                                letterSpacing: '0.4px',
                                zIndex: 2,
                            }}
                        >
                            ⚡ Try & Buy
                        </span>
                    )}
                    <img src={imageUrl(item.icon)} alt={item.productname || ''} className="product-image" />
                    <div className="product-details">
                        <div style={{ fontWeight: 600 }}>{item.display_title || item.productname}</div>
                        {item.color && (
                            <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color.toLowerCase(), display: 'inline-block', border: '1px solid rgba(0,0,0,0.2)' }} />
                                Color: <span style={{ fontWeight: 600, color: '#111827' }}>{item.color}</span>
                            </div>
                        )}
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>{item.description}</div>
                        
                        {item.available_sizes && item.available_sizes.length > 0 && (
                            <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>Sizes:</span>
                                {item.available_sizes.map((sz) => (
                                    <span
                                        key={sz}
                                        style={{
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            padding: '1px 5px',
                                            borderRadius: '4px',
                                            backgroundColor: '#f3f4f6',
                                            color: '#1f2937',
                                            border: '1px solid #e5e7eb',
                                        }}
                                    >
                                        {sz}
                                    </span>
                                ))}
                            </div>
                        )}
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