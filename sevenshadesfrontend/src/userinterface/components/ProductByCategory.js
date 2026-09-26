import imageUrl from '../../services/imageUrl';
import './ProductByCategory.css';
import { useNavigate } from 'react-router-dom';

export default function ProductByCategory(props) {
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
            <div style={{ textAlign: 'center', padding: '64px 20px', color: '#64748b' }}>
                <p style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                    No products found in this collection.
                </p>
                <p style={{ fontSize: '14px', maxWidth: '420px', margin: '0 auto' }}>
                    Please check back soon or explore other curated categories on SevenShades.
                </p>
            </div>
        );
    }

    const renderProducts = () => {
        return items.map((item, index) => {
            const isUnavailable = item.is_available === false || item.variants_count === 0;
            const hasDiscount = item.min_offerprice > 0 && item.min_price > item.min_offerprice;
            const discountPercent = hasDiscount
                ? Math.round(((item.min_price - item.min_offerprice) / item.min_price) * 100)
                : 0;

            return (
                <div
                    key={item.listing_id || index}
                    onClick={() => handleNextPage(item)}
                    className="pbc-product-card"
                    style={{ opacity: isUnavailable ? 0.8 : 1 }}
                >
                    {/* Fixed Aspect-Ratio Image Container */}
                    <div className="pbc-image-wrapper">
                        {isUnavailable ? (
                            <span className="pbc-badge pbc-badge-unavailable">
                                Unavailable
                            </span>
                        ) : (
                            <span className="pbc-badge pbc-badge-try">
                                ⚡ Try & Buy
                            </span>
                        )}

                        {hasDiscount && (
                            <span className="pbc-badge-discount">
                                {discountPercent}% OFF
                            </span>
                        )}

                        <img
                            src={imageUrl(item.icon)}
                            alt={item.productname || 'SevenShades Product'}
                            className="pbc-product-image"
                            loading="lazy"
                        />
                    </div>

                    {/* Card Content with Clear Typography Hierarchy */}
                    <div className="pbc-card-body">
                        <div className="pbc-brand-label">
                            {item.brandname || (item.categoryname ? `${item.categoryname}` : 'SevenShades')}
                        </div>

                        <h3 className="pbc-card-title" title={item.display_title || item.productname}>
                            {item.display_title || item.productname}
                        </h3>

                        {item.description && (
                            <div className="pbc-card-desc" title={item.description}>
                                {item.description}
                            </div>
                        )}

                        {/* Color & Sizes Row */}
                        <div className="pbc-meta-row">
                            {item.color ? (
                                <div className="pbc-color-tag">
                                    <span
                                        className="pbc-color-dot"
                                        style={{ backgroundColor: item.color.toLowerCase() }}
                                    />
                                    <span>{item.color}</span>
                                </div>
                            ) : <span />}

                            {item.available_sizes && item.available_sizes.length > 0 && (
                                <div className="pbc-sizes-list">
                                    {item.available_sizes.slice(0, 4).map((sz) => (
                                        <span key={sz} className="pbc-size-chip">
                                            {sz}
                                        </span>
                                    ))}
                                    {item.available_sizes.length > 4 && (
                                        <span className="pbc-size-chip">+{item.available_sizes.length - 4}</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Pricing Row */}
                        {(item.min_offerprice > 0 || item.min_price > 0) && (
                            <div className="pbc-price-container">
                                <span className="pbc-price-current">
                                    ₹{item.min_offerprice > 0 ? item.min_offerprice : item.min_price}
                                </span>
                                {hasDiscount && (
                                    <span className="pbc-price-original">
                                        ₹{item.min_price}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Ratings */}
                        {item.total_reviews > 0 && (
                            <div className="pbc-rating-row">
                                <span className="pbc-rating-score">
                                    ★ {Number(item.avg_rating || 0).toFixed(1)}
                                </span>
                                <span className="pbc-rating-count">
                                    ({item.total_reviews})
                                </span>
                            </div>
                        )}

                        {/* Prominent Action Button with Hover State */}
                        <button
                            type="button"
                            className="pbc-card-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleNextPage(item);
                            }}
                        >
                            Select & Try at Home
                        </button>
                    </div>
                </div>
            );
        });
    };

    return (
        <div className="pbc-product-grid">
            {renderProducts()}
        </div>
    );
}