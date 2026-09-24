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