import React from 'react';
import imageUrl from '../../services/imageUrl';
import './BudgetBazaarComponent.css';

/**
 * BudgetBazaarComponent
 * Renders value-led categories using prices from the live catalog.
 */
export default function BudgetBazaarComponent({ subcategories = [], products = [], onItemClick }) {
    // Helper to find a subcategory by partial name match
    const findSubcategory = (nameKey) => {
        if (!Array.isArray(subcategories) || subcategories.length === 0) return null;
        return subcategories.find((item) =>
            item.subcategoryname && item.subcategoryname.toLowerCase().includes(nameKey.toLowerCase())
        );
    };

    const budgetItems = [
        // Row 1
        {
            key: 'oversized',
            label: 'Oversized T-Shirts',
            tierColor: 'blue',
            defaultIcon: 'static/oversized.png',
        },
        {
            key: 'jeans',
            label: 'Jeans & Denim',
            tierColor: 'purple',
            defaultIcon: 'static/baggy_q1QqnWE.png',
        },
        {
            key: 'kurti',
            label: 'Cotton Kurta Sets',
            tierColor: 'orange',
            defaultIcon: 'static/Kurti.png',
        },
        // Row 2
        {
            key: 'top',
            label: 'Casual Tops',
            tierColor: 'blue',
            defaultIcon: 'static/top.png',
        },
        {
            key: 'dress',
            label: 'Co-ords & Dresses',
            tierColor: 'purple',
            defaultIcon: 'static/western_dress.png',
        },
        {
            key: 'shoes',
            label: 'Sneakers & Shoes',
            tierColor: 'orange',
            defaultIcon: 'static/shoes.png',
        },
        // Row 3
        {
            key: 'shorts',
            label: 'Shorts & Loungewear',
            tierColor: 'blue',
            defaultIcon: 'static/shorts.png',
        },
        {
            key: 'shirt',
            label: 'Casual Shirts',
            tierColor: 'purple',
            defaultIcon: 'static/103.webp',
        },
        {
            key: 'boot',
            label: 'Boots & Formal',
            tierColor: 'orange',
            defaultIcon: 'static/Boots.png',
        },
    ];

    const getStartingPrice = (subcategory) => {
        if (!subcategory) return null;
        const prices = products
            .filter(item => Number(item?.subcategoryid?.id) === Number(subcategory.id))
            .map(item => Number(item.min_offerprice > 0 ? item.min_offerprice : item.min_price))
            .filter(price => Number.isFinite(price) && price > 0);
        return prices.length ? Math.min(...prices) : null;
    };

    const handleCardClick = (config) => {
        const matched = findSubcategory(config.key);
        if (matched) {
            onItemClick && onItemClick(matched);
        } else if (subcategories.length > 0) {
            onItemClick && onItemClick(subcategories[0]);
        }
    };

    return (
        <div className="bbz-container">
            {/* Header */}
            <div className="bbz-header">
                <div className="bbz-header-left">
                    <span className="bbz-tag">⚡ Value Deals</span>
                    <h2 className="bbz-title">Budget Bazaar</h2>
                    <p className="bbz-subtitle">Curated value picks with doorstep trials and honest catalog pricing</p>
                </div>
            </div>

            {/* 3-Column Tier Grid */}
            <div className="bbz-grid">
                {budgetItems.map((item, idx) => {
                    const matchedSub = findSubcategory(item.key);
                    const iconPath = matchedSub?.icon || item.defaultIcon;
                    const displayLabel = matchedSub?.subcategoryname || item.label;
                    const startingPrice = getStartingPrice(matchedSub);

                    return (
                        <div
                            key={idx}
                            className="bbz-card"
                            onClick={() => handleCardClick(item)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    handleCardClick(item);
                                }
                            }}
                        >
                            <div className="bbz-img-wrapper">
                                <img
                                    src={imageUrl(iconPath)}
                                    alt={displayLabel}
                                    className="bbz-img"
                                    loading="lazy"
                                />
                            </div>

                            <div className={`bbz-pill bbz-pill-${item.tierColor}`}>
                                {startingPrice ? `From ₹${startingPrice}` : 'Explore styles'}
                            </div>

                            <span className="bbz-label" title={displayLabel}>
                                {displayLabel}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
