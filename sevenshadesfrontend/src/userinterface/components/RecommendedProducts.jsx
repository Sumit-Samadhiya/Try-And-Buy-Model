import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { catalogData, postData, getData } from '../../services/FetchDjangoApiServices';
import { responsiveImage } from '../../services/imageUrl';
import './RecommendedProducts.css';

/**
 * Helper to shuffle an array in-place copy
 */
function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

/**
 * RecommendedProducts
 * 
 * Logic:
 * 1. Takes current product's main category (e.g., Men, Women).
 * 2. Fetches products for that main category.
 * 3. Filters out the currently viewed product.
 * 4. Groups candidate products across all their subcategories.
 * 5. Randomly selects products across different subcategories in a round-robin manner.
 * 6. Supports on-demand reshuffling via "Shuffle Picks" button.
 */
export default function RecommendedProducts({
    currentProductId,
    mainCategoryId,
    mainCategoryName = '',
    currentSubcategoryId,
    onProductClick,
}) {
    const navigate = useNavigate();
    const [candidatePool, setCandidatePool] = useState([]);
    const [recommendedList, setRecommendedList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [resolvedCategoryName, setResolvedCategoryName] = useState(mainCategoryName);

    // Pick random products distributed across subcategories
    const pickRandomProductsAcrossSubcategories = useCallback((candidates, excludeId) => {
        if (!candidates || candidates.length === 0) return [];

        // 1. Filter out the currently viewed product
        const filtered = candidates.filter((item) => {
            const itemId = item.id || item.productid?.id || item.productid;
            return Number(itemId) !== Number(excludeId);
        });

        if (filtered.length === 0) return [];

        // 2. Deduplicate products by ID
        const uniqueItems = [];
        const seenIds = new Set();
        for (const item of filtered) {
            const key = item.id || item.listing_id;
            if (key && !seenIds.has(key)) {
                seenIds.add(key);
                uniqueItems.push(item);
            }
        }

        // 3. Group by subcategory
        const subcategoryMap = new Map();
        uniqueItems.forEach((item) => {
            const subId =
                item.subcategoryid?.id ||
                item.subcategoryid ||
                item.subcategoryid?.subcategoryname ||
                item.subcategoryname ||
                'default';
            if (!subcategoryMap.has(subId)) {
                subcategoryMap.set(subId, []);
            }
            subcategoryMap.get(subId).push(item);
        });

        // 4. Randomly shuffle the subcategory keys
        const shuffledSubKeys = shuffleArray(Array.from(subcategoryMap.keys()));

        // 5. Shuffle items inside each subcategory
        const preparedMap = new Map();
        shuffledSubKeys.forEach((key) => {
            preparedMap.set(key, shuffleArray(subcategoryMap.get(key)));
        });

        // 6. Round-robin pick across random subcategories to ensure diverse representation
        const targetCount = 8;
        const picked = [];
        let round = 0;
        let moreAvailable = true;

        while (picked.length < targetCount && moreAvailable) {
            moreAvailable = false;
            for (const key of shuffledSubKeys) {
                const itemsInSub = preparedMap.get(key);
                if (round < itemsInSub.length) {
                    picked.push(itemsInSub[round]);
                    moreAvailable = true;
                    if (picked.length >= targetCount) break;
                }
            }
            round++;
        }

        // 7. If we still haven't reached target count, fill from remaining pool
        if (picked.length < targetCount && uniqueItems.length > picked.length) {
            const pickedIds = new Set(picked.map((p) => p.id || p.listing_id));
            const remaining = shuffleArray(uniqueItems.filter((p) => !pickedIds.has(p.id || p.listing_id)));
            for (const item of remaining) {
                picked.push(item);
                if (picked.length >= targetCount) break;
            }
        }

        // 8. Final shuffle so items from diverse subcategories are nicely mingled
        return shuffleArray(picked);
    }, []);

    // Fetch catalog products for the current category
    const fetchCategoryCatalog = useCallback(async () => {
        setLoading(true);
        let products = [];
        let catName = mainCategoryName;

        try {
            if (mainCategoryId) {
                // Try cached catalog endpoint first
                let res = await catalogData('user_products_maincategory', { maincategoryid: Number(mainCategoryId) });
                if (!res || !res.status || !Array.isArray(res.data) || res.data.length === 0) {
                    res = await postData('user_products_maincategory', { maincategoryid: Number(mainCategoryId) });
                }
                if (res && res.status && Array.isArray(res.data)) {
                    products = res.data;
                    if (!catName && products[0]?.categoryname) {
                        catName = products[0].categoryname;
                    }
                }
            }

            // Fallback: If no products found by category ID, or mainCategoryId wasn't provided,
            // query global product list and filter by category if known
            if (products.length === 0) {
                const globalRes = await getData('user_product_list');
                if (globalRes && globalRes.status && Array.isArray(globalRes.data)) {
                    if (catName) {
                        const targetLower = catName.toLowerCase();
                        products = globalRes.data.filter((p) => {
                            const cName = (p.categoryname || p.maincategoryid?.maincategoryname || '').toLowerCase();
                            return cName.includes(targetLower);
                        });
                        if (products.length === 0) products = globalRes.data;
                    } else {
                        products = globalRes.data;
                    }
                }
            }
        } catch (err) {
            if (process.env.NODE_ENV !== 'test') {
                console.warn('Error fetching recommendations:', err);
            }
            products = [];
        }

        setResolvedCategoryName(catName || 'Fashion');
        setCandidatePool(products);
        const randomized = pickRandomProductsAcrossSubcategories(products, currentProductId);
        setRecommendedList(randomized);
        setLoading(false);
    }, [mainCategoryId, mainCategoryName, currentProductId, pickRandomProductsAcrossSubcategories]);

    useEffect(() => {
        fetchCategoryCatalog();
    }, [fetchCategoryCatalog]);

    // Reshuffle on-demand
    const handleReshuffle = () => {
        const reshuffled = pickRandomProductsAcrossSubcategories(candidatePool, currentProductId);
        setRecommendedList(reshuffled);
    };

    // Product card click handler
    const handleCardClick = (item) => {
        if (onProductClick) {
            onProductClick(item);
            return;
        }

        const queryParams = new URLSearchParams();
        const itemId = item.id || item.productid?.id || item.productid;
        if (itemId) queryParams.set('productid', itemId);
        if (item.color) queryParams.set('color', item.color);

        navigate(`/productdetailspage?${queryParams.toString()}`, {
            state: {
                productid: itemId,
                color: item.color,
                size: item.available_sizes?.[0] || '',
            },
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (loading && recommendedList.length === 0) {
        return (
            <section className="rec-section" aria-label="Recommended products loading">
                <div className="rec-loading-container">
                    <div className="rec-shimmer-title" />
                    <div className="rec-grid">
                        {[1, 2, 3, 4].map((n) => (
                            <div key={n} className="rec-card-shimmer" />
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    if (!recommendedList || recommendedList.length === 0) {
        return null;
    }

    const titleCategory = resolvedCategoryName
        ? `${resolvedCategoryName.charAt(0).toUpperCase() + resolvedCategoryName.slice(1)}'s`
        : '';

    return (
        <section className="rec-section" aria-label="Recommended for You">
            {/* Header with Title and Reshuffle Button */}
            <div className="rec-header">
                <div className="rec-header-text">
                    <span className="rec-eyebrow">
                        CURATED PICKS {titleCategory ? `• ${titleCategory.toUpperCase()} COLLECTION` : ''}
                    </span>
                    <h2 className="rec-title">
                        Recommended For You <span className="rec-sparkle" aria-hidden="true">✨</span>
                    </h2>
                    <p className="rec-subtitle">
                        Randomly curated from diverse {titleCategory || ''} subcategories with Try & Buy at your doorstep.
                    </p>
                </div>
                <button
                    type="button"
                    className="rec-shuffle-btn"
                    onClick={handleReshuffle}
                    title="Shuffle random styles from other subcategories"
                    aria-label="Shuffle recommended styles"
                >
                    <span className="rec-dice-icon" aria-hidden="true">🎲</span>
                    <span>Shuffle Picks</span>
                </button>
            </div>

            {/* Responsive Grid of Curated Recommendations */}
            <div className="rec-grid">
                {recommendedList.map((item, idx) => {
                    const price = item.min_price || item.price || 0;
                    const offerPrice = item.min_offerprice || item.offerprice || 0;
                    const effectivePrice = offerPrice > 0 && offerPrice <= price ? offerPrice : price;
                    const hasDiscount = price > effectivePrice;
                    const discountPercent = hasDiscount
                        ? Math.round(((price - effectivePrice) / price) * 100)
                        : 0;
                    const subcatLabel =
                        item.subcategoryid?.subcategoryname ||
                        item.subcategoryname ||
                        (typeof item.subcategoryid === 'string' ? item.subcategoryid : '');
                    const brandLabel = item.brandname || (item.categoryname ? `${item.categoryname}` : 'Doordrape');

                    return (
                        <div
                            key={item.listing_id || item.id || idx}
                            className="rec-card"
                            onClick={() => handleCardClick(item)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleCardClick(item);
                                }
                            }}
                            aria-label={`View ${item.display_title || item.productname || 'product'}`}
                        >
                            {/* Image Wrapper */}
                            <div className="rec-image-wrapper">
                                <img
                                    {...responsiveImage(item.icon)}
                                    alt={item.productname ? `${item.productname} - Doordrape Try & Buy` : 'Fashion item'}
                                    className="rec-img"
                                    loading="lazy"
                                    decoding="async"
                                />

                                {/* Badges */}
                                <span className="rec-badge-try">
                                    ⚡ Try & Buy
                                </span>

                                {hasDiscount && (
                                    <span className="rec-badge-discount">
                                        {discountPercent}% OFF
                                    </span>
                                )}

                                {subcatLabel && (
                                    <span className="rec-badge-subcat" title={`Subcategory: ${subcatLabel}`}>
                                        {subcatLabel}
                                    </span>
                                )}
                            </div>

                            {/* Card Content */}
                            <div className="rec-body">
                                <div className="rec-brand" title={brandLabel}>
                                    {brandLabel}
                                </div>

                                <h3 className="rec-product-title" title={item.display_title || item.productname}>
                                    {item.display_title || item.productname}
                                </h3>

                                <div className="rec-price-row">
                                    <span className="rec-price-effective">₹{effectivePrice}</span>
                                    {hasDiscount && (
                                        <span className="rec-price-original">₹{price}</span>
                                    )}
                                </div>

                                {item.avg_rating > 0 && (
                                    <div className="rec-rating-row">
                                        <span className="rec-rating-badge">★ {item.avg_rating.toFixed(1)}</span>
                                        {item.total_reviews > 0 && (
                                            <span className="rec-rating-count">({item.total_reviews})</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
