import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import imageUrl from '../../services/imageUrl';
import { getData } from '../../services/FetchDjangoApiServices';
import './BudgetBazaarComponent.css';

/**
 * BudgetBazaarComponent
 * Renders value-led deals curated by admin with doorstep trials and honest catalog pricing.
 */
export default function BudgetBazaarComponent({ subcategories = [], products = [], onItemClick }) {
    const navigate = useNavigate();
    const [adminDeals, setAdminDeals] = useState([]);

    useEffect(() => {
        let isMounted = true;
        const fetchDeals = async () => {
            const res = await getData('user_budget_bazaar_list');
            if (res && res.status && Array.isArray(res.data) && res.data.length > 0 && isMounted) {
                setAdminDeals(res.data);
            }
        };
        fetchDeals();
        return () => { isMounted = false; };
    }, []);

    // Fallback static items if backend hasn't returned deals yet
    const fallbackItems = [
        { key: 'oversized', label: 'Oversized T-Shirts', tierColor: 'blue', priceTag: 'Under ₹499', defaultIcon: 'static/oversized.png', maxPrice: 499 },
        { key: 'jeans', label: 'Jeans & Denim', tierColor: 'purple', priceTag: 'Under ₹999', defaultIcon: 'static/baggy_q1QqnWE.png', maxPrice: 999 },
        { key: 'kurti', label: 'Cotton Kurta Sets', tierColor: 'orange', priceTag: 'Under ₹599', defaultIcon: 'static/Kurti.png', maxPrice: 599 },
        { key: 'top', label: 'Casual Tops', tierColor: 'blue', priceTag: 'Under ₹399', defaultIcon: 'static/top.png', maxPrice: 399 },
        { key: 'dress', label: 'Co-ords & Dresses', tierColor: 'purple', priceTag: 'Under ₹799', defaultIcon: 'static/western_dress.png', maxPrice: 799 },
        { key: 'shoes', label: 'Sneakers & Shoes', tierColor: 'orange', priceTag: 'Under ₹899', defaultIcon: 'static/shoes.png', maxPrice: 899 },
        { key: 'shorts', label: 'Shorts & Loungewear', tierColor: 'blue', priceTag: 'Under ₹349', defaultIcon: 'static/shorts.png', maxPrice: 349 },
        { key: 'shirt', label: 'Casual Shirts', tierColor: 'purple', priceTag: 'Under ₹699', defaultIcon: 'static/103.webp', maxPrice: 699 },
        { key: 'boot', label: 'Boots & Formal', tierColor: 'orange', priceTag: 'Under ₹1199', defaultIcon: 'static/Boots.png', maxPrice: 1199 },
    ];

    const findSubcategory = (nameKey) => {
        if (!Array.isArray(subcategories) || subcategories.length === 0) return null;
        return subcategories.find((item) =>
            item.subcategoryname && item.subcategoryname.toLowerCase().includes(nameKey.toLowerCase())
        );
    };

    const handleDealClick = (deal) => {
        if (onItemClick) {
            onItemClick(deal);
            return;
        }

        // Direct navigation fallback
        navigate('/productpage', {
            state: {
                pageView: 'BudgetBazaarComponent',
                products: {
                    id: deal.subcategoryid,
                    maincategoryid: deal.maincategoryid,
                    subcategoryname: deal.title
                },
                dealTitle: deal.title,
                maxPrice: deal.max_price
            }
        });
    };

    const displayItems = adminDeals.length > 0 ? adminDeals : fallbackItems;

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
                {displayItems.map((item, idx) => {
                    const isDynamic = Boolean(adminDeals.length > 0);
                    let iconPath = '';
                    let displayLabel = '';
                    let priceTag = '';
                    let tierColor = 'blue';

                    if (isDynamic) {
                        iconPath = item.icon || 'static/oversized.png';
                        displayLabel = item.title;
                        priceTag = item.price_tag;
                        tierColor = item.tier_color || 'blue';
                    } else {
                        const matchedSub = findSubcategory(item.key);
                        iconPath = matchedSub?.icon || item.defaultIcon;
                        displayLabel = matchedSub?.subcategoryname || item.label;
                        priceTag = item.priceTag;
                        tierColor = item.tierColor || 'blue';
                    }

                    return (
                        <div
                            key={item.id || idx}
                            className="bbz-card"
                            onClick={() => handleDealClick(item)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    handleDealClick(item);
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

                            <div className={`bbz-pill bbz-pill-${tierColor}`}>
                                {priceTag || 'Value Deal'}
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
