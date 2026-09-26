import imageUrl from '../../services/imageUrl';
import './CategoryShowcaseCard.css';

export default function CategoryShowcaseCard({
    title = 'Shop Collection',
    items = [],
    onViewAll,
    onItemClick,
    maxItems = 4,
}) {
    if (!items || items.length === 0) return null;

    const displayItems = items.slice(0, maxItems);

    const getItemBadges = (item, index) => {
        const hasDiscount = item.min_offerprice > 0 && item.min_price > item.min_offerprice;
        const discountPercent = hasDiscount
            ? Math.round(((item.min_price - item.min_offerprice) / item.min_price) * 100)
            : 0;

        if (index === 0) {
            return {
                subtext: item.color ? `${item.color} color` : (item.brandname || 'Trending Style'),
                maintext: 'Best Selling Products',
            };
        } else if (index === 1) {
            const price = item.min_offerprice > 0 ? item.min_offerprice : item.min_price;
            const threshold = price <= 499 ? 499 : Math.ceil(price / 100) * 100;
            return {
                subtext: 'Affordable Options',
                maintext: `Under ₹${threshold}`,
            };
        } else if (index === 2) {
            return {
                subtext: 'Best Discounts',
                maintext: discountPercent > 0 ? `Min. ${discountPercent}% Off` : 'Special Offer',
            };
        } else {
            return {
                subtext: 'Best Brands',
                maintext: item.brandname || (item.display_title || item.productname || 'Best Brands'),
            };
        }
    };

    return (
        <div className="csc-container">
            {/* Header: Title on Left, Circular Arrow Button on Right */}
            <div className="csc-header">
                <h2 className="csc-title">{title}</h2>
                <button
                    type="button"
                    className="csc-arrow-btn"
                    onClick={onViewAll}
                    aria-label={`View all in ${title}`}
                    title={`View all in ${title}`}
                >
                    &rarr;
                </button>
            </div>

            {/* Grid of Products (4 in row on desktop, 2x2 on mobile) */}
            <div className="csc-grid">
                {displayItems.map((item, index) => {
                    const { subtext, maintext } = getItemBadges(item, index);
                    return (
                        <div
                            key={item.listing_id || item.id || index}
                            className="csc-item"
                            onClick={() => onItemClick && onItemClick(item)}
                            role="button"
                            tabIndex={0}
                        >
                            <div className="csc-img-wrapper">
                                <img
                                    src={imageUrl(item.icon)}
                                    alt={item.productname || ''}
                                    className="csc-img"
                                    loading="lazy"
                                />
                            </div>
                            <div className="csc-item-info">
                                <div className="csc-subtext" title={subtext}>{subtext}</div>
                                <div className="csc-maintext" title={maintext}>{maintext}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
