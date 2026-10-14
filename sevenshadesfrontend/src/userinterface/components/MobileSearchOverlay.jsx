import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Dialog from '@mui/material/Dialog';
import Slide from '@mui/material/Slide';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import imageUrl from '../../services/imageUrl';
import { trackSearch } from '../../services/analytics';
import { getData } from '../../services/FetchDjangoApiServices';
import { useDebounce } from '../../services/useDebounce';

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="down" ref={ref} {...props} />;
});

const POPULAR_SEARCHES = [
    'Kurtis',
    'Shirts',
    'Jeans',
    'T-Shirts',
    'Dresses',
    'Sarees',
    'Men',
    'Women',
];

const RECENT_KEY = 'doordrape_recent_searches';

export default function MobileSearchOverlay({ open, onClose }) {
    const navigate = useNavigate();
    const inputRef = useRef(null);

    const [query, setQuery] = useState('');
    const debouncedQuery = useDebounce(query, 350);

    const [allCatalogItems, setAllCatalogItems] = useState([]);
    const [filteredList, setFilteredList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [recentSearches, setRecentSearches] = useState([]);

    // Load recent searches from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(RECENT_KEY);
            if (saved) {
                setRecentSearches(JSON.parse(saved).slice(0, 6));
            }
        } catch {
            setRecentSearches([]);
        }
    }, [open]);

    // Focus input when dialog opens
    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                }
            }, 120);
            return () => clearTimeout(timer);
        } else {
            setQuery('');
            setFilteredList([]);
        }
    }, [open]);

    // Fetch catalog searchable items (cached or live)
    useEffect(() => {
        let isMounted = true;
        const fetchItems = async () => {
            try {
                const [subRes, mainRes, prodRes, brandRes] = await Promise.all([
                    getData('user_subcategory_list'),
                    getData('user_maincategory_list'),
                    getData('user_product_list'),
                    getData('user_brand_list'),
                ]);

                let combined = [];
                if (subRes?.status && Array.isArray(subRes.data)) {
                    combined = combined.concat(subRes.data.map(i => ({ ...i, type: 'subcategory' })));
                }
                if (mainRes?.status && Array.isArray(mainRes.data)) {
                    combined = combined.concat(mainRes.data.map(i => ({ ...i, type: 'maincategory' })));
                }
                if (prodRes?.status && Array.isArray(prodRes.data)) {
                    combined = combined.concat(prodRes.data.map(i => ({ ...i, type: 'product' })));
                }
                if (brandRes?.status && Array.isArray(brandRes.data)) {
                    combined = combined.concat(brandRes.data.map(i => ({ ...i, type: 'brand' })));
                }

                if (isMounted) {
                    setAllCatalogItems(combined);
                }
            } catch {
                // Ignore background prefetch errors
            }
        };

        if (open && allCatalogItems.length === 0) {
            fetchItems();
        }

        return () => {
            isMounted = false;
        };
    }, [open, allCatalogItems.length]);

    // Debounced filtering
    useEffect(() => {
        const trimmed = debouncedQuery.trim().toLowerCase();
        if (!trimmed) {
            setFilteredList([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        // Filter local catalog items
        const matches = allCatalogItems.filter(item => {
            const name = (item.productname || item.subcategoryname || item.maincategoryname || item.brandname || '').toLowerCase();
            const brand = (item.brandname || item.brandid?.brandname || '').toLowerCase();
            const desc = (item.description || '').toLowerCase();
            return name.includes(trimmed) || brand.includes(trimmed) || desc.includes(trimmed);
        });

        setFilteredList(matches);
        setIsLoading(false);
    }, [debouncedQuery, allCatalogItems]);

    const saveRecentSearch = (term) => {
        const clean = term.trim();
        if (!clean) return;
        try {
            const updated = [clean, ...recentSearches.filter(s => s.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
            setRecentSearches(updated);
            localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
        } catch {
            // Storage quota or privacy mode error
        }
    };

    const removeRecentSearch = (e, termToRemove) => {
        e.stopPropagation();
        const updated = recentSearches.filter(s => s !== termToRemove);
        setRecentSearches(updated);
        try {
            localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
        } catch { }
    };

    const clearAllRecent = () => {
        setRecentSearches([]);
        try {
            localStorage.removeItem(RECENT_KEY);
        } catch { }
    };

    const handleSelectProduct = (item) => {
        const term = item.productname || item.subcategoryname || item.brandname || item.maincategoryname || query;
        saveRecentSearch(term);
        trackSearch(term, 1);
        onClose();

        if (item.type === 'product') {
            navigate('/productdetailspage', { state: { productid: item.id, product: item, pageView: 'ProductDetailsComponent' } });
        } else if (item.type === 'subcategory') {
            navigate('/productpage', { state: { products: item, pageView: 'SubCategoryComponent' } });
        } else if (item.type === 'maincategory') {
            navigate('/productpage', { state: { products: item, pageView: 'MainCategoryComponent' } });
        } else if (item.type === 'brand') {
            navigate('/productpage', { state: { products: item, pageView: 'BrandComponent' } });
        }
    };

    const handleSearchSubmit = () => {
        const trimmed = query.trim();
        if (!trimmed) return;

        saveRecentSearch(trimmed);
        trackSearch(trimmed, filteredList.length);
        onClose();

        const lower = trimmed.toLowerCase();
        const menCategory = allCatalogItems.find(item => item.type === 'maincategory' && (item.maincategoryname || '').toLowerCase() === 'men');
        const womenCategory = allCatalogItems.find(item => item.type === 'maincategory' && (item.maincategoryname || '').toLowerCase() === 'women');

        if (lower === 'men' && menCategory) {
            navigate('/productpage', { state: { pageView: 'MainCategoryComponent', products: { id: menCategory.id } } });
        } else if (lower === 'women' && womenCategory) {
            navigate('/productpage', { state: { pageView: 'MainCategoryComponent', products: { id: womenCategory.id } } });
        } else if (filteredList.length === 1) {
            handleSelectProduct(filteredList[0]);
        } else {
            // Navigate to collection product page with search term
            navigate(`/productpage?search=${encodeURIComponent(trimmed)}`, {
                state: { pageView: 'SearchComponent', searchQuery: trimmed }
            });
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearchSubmit();
        }
    };

    const handleTagClick = (tag) => {
        setQuery(tag);
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    return (
        <Dialog
            fullScreen
            open={Boolean(open)}
            onClose={onClose}
            TransitionComponent={Transition}
            PaperProps={{
                sx: {
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }
            }}
        >
            {/* Top Search App Bar */}
            <header style={{
                backgroundColor: '#022c22',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.25)',
                position: 'sticky',
                top: 0,
                zIndex: 10,
            }}>
                <IconButton
                    onClick={onClose}
                    aria-label="Close search"
                    data-testid="mobile-search-close"
                    style={{
                        color: '#ffffff',
                        padding: 8,
                        minWidth: 44,
                        minHeight: 44,
                    }}
                >
                    <ArrowBackIcon style={{ fontSize: 24 }} />
                </IconButton>

                {/* Input Container */}
                <div style={{
                    flexGrow: 1,
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                    padding: '0 10px',
                    height: '44px',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
                }}>
                    <SearchOutlinedIcon style={{ color: '#059669', fontSize: 22, marginRight: 6 }} />
                    <input
                        ref={inputRef}
                        type="search"
                        enterKeyHint="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search styles, brands, categories..."
                        aria-label="Search DoorDrape fashion"
                        data-testid="mobile-search-input"
                        style={{
                            border: 'none',
                            outline: 'none',
                            width: '100%',
                            fontSize: '15px',
                            fontWeight: 500,
                            color: '#0f172a',
                            backgroundColor: 'transparent',
                        }}
                    />

                    {/* Clear Button or Spinner */}
                    {isLoading ? (
                        <CircularProgress size={18} style={{ color: '#059669', marginLeft: 6 }} />
                    ) : query.length > 0 ? (
                        <IconButton
                            onClick={() => { setQuery(''); if (inputRef.current) inputRef.current.focus(); }}
                            aria-label="Clear query"
                            size="small"
                            style={{ padding: 4, color: '#64748b' }}
                        >
                            <CloseRoundedIcon style={{ fontSize: 18 }} />
                        </IconButton>
                    ) : null}
                </div>

                {/* Action Search Button */}
                <button
                    onClick={handleSearchSubmit}
                    disabled={!query.trim()}
                    data-testid="mobile-search-submit"
                    style={{
                        backgroundColor: query.trim() ? '#10b981' : 'rgba(255,255,255,0.15)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: query.trim() ? 'pointer' : 'default',
                        transition: 'background-color 0.15s ease',
                        minHeight: 44,
                    }}
                >
                    Search
                </button>
            </header>

            {/* Content Area */}
            <main style={{
                flexGrow: 1,
                overflowY: 'auto',
                padding: '16px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
            }}>
                {/* 1. When no input: Show Recent Searches & Trending */}
                {!query.trim() && (
                    <>
                        {/* Recent Searches */}
                        {recentSearches.length > 0 && (
                            <section>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 10,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#475569' }}>
                                        <HistoryRoundedIcon style={{ fontSize: 18, color: '#059669' }} />
                                        <span>Recent Searches</span>
                                    </div>
                                    <button
                                        onClick={clearAllRecent}
                                        style={{
                                            border: 'none',
                                            background: 'none',
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            padding: '4px',
                                        }}
                                    >
                                        Clear all
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {recentSearches.map((term, idx) => (
                                        <Chip
                                            key={idx}
                                            label={term}
                                            onClick={() => handleTagClick(term)}
                                            onDelete={(e) => removeRecentSearch(e, term)}
                                            sx={{
                                                backgroundColor: '#ffffff',
                                                border: '1px solid #e2e8f0',
                                                fontWeight: 600,
                                                fontSize: '13px',
                                                color: '#1e293b',
                                                '&:hover': { backgroundColor: '#f1f5f9' },
                                                height: '34px',
                                            }}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Trending Searches */}
                        <section style={{ marginTop: recentSearches.length > 0 ? 8 : 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 10 }}>
                                <TrendingUpRoundedIcon style={{ fontSize: 18, color: '#059669' }} />
                                <span>Popular on DoorDrape</span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {POPULAR_SEARCHES.map((tag) => (
                                    <Chip
                                        key={tag}
                                        label={tag}
                                        onClick={() => handleTagClick(tag)}
                                        sx={{
                                            backgroundColor: '#ecfdf5',
                                            border: '1px solid rgba(16, 185, 129, 0.3)',
                                            color: '#065f46',
                                            fontWeight: 700,
                                            fontSize: '13px',
                                            height: '34px',
                                            cursor: 'pointer',
                                            '&:hover': { backgroundColor: '#d1fae5' },
                                        }}
                                    />
                                ))}
                            </div>
                        </section>
                    </>
                )}

                {/* 2. When query has content: Live Debounced Results */}
                {query.trim().length > 0 && (
                    <section>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {isLoading ? 'Searching...' : `${filteredList.length} match${filteredList.length === 1 ? '' : 'es'} found`}
                        </div>

                        {filteredList.length === 0 && !isLoading && (
                            <div style={{
                                backgroundColor: '#ffffff',
                                borderRadius: '12px',
                                padding: '32px 16px',
                                textAlign: 'center',
                                border: '1px solid #e2e8f0',
                            }}>
                                <SearchOutlinedIcon style={{ fontSize: 44, color: '#cbd5e1', marginBottom: 8 }} />
                                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '0 0 6px 0' }}>
                                    No matches found for &quot;{query}&quot;
                                </h3>
                                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
                                    Try searching for casual shirts, kurtis, jeans, or explore trending collections.
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    {['Shirts', 'Kurtis', 'Jeans'].map(s => (
                                        <Chip
                                            key={s}
                                            label={s}
                                            onClick={() => handleTagClick(s)}
                                            size="small"
                                            sx={{ backgroundColor: '#ecfdf5', color: '#065f46', fontWeight: 600 }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {filteredList.length > 0 && (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                                paddingBottom: 60,
                            }}>
                                {filteredList.map((item) => {
                                    const title = item.productname || item.subcategoryname || item.maincategoryname || item.brandname;
                                    const typeLabel = item.type === 'product'
                                        ? (item.brandid?.brandname ? `${item.brandid.brandname}` : 'Product')
                                        : item.type === 'brand'
                                        ? 'Brand'
                                        : item.type === 'subcategory'
                                        ? 'Subcategory'
                                        : 'Category';

                                    const price = item.min_offerprice || item.min_price || item.offerprice || item.price;

                                    return (
                                        <div
                                            key={`${item.type}-${item.id}`}
                                            onClick={() => handleSelectProduct(item)}
                                            data-testid={`search-item-${item.id}`}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '10px 12px',
                                                backgroundColor: '#ffffff',
                                                borderRadius: '10px',
                                                border: '1px solid #e2e8f0',
                                                cursor: 'pointer',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                                transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                                            }}
                                        >
                                            <img
                                                src={imageUrl(item.icon)}
                                                alt=""
                                                style={{
                                                    width: 44,
                                                    height: 44,
                                                    objectFit: 'cover',
                                                    borderRadius: 8,
                                                    marginRight: 12,
                                                    backgroundColor: '#f1f5f9',
                                                    flexShrink: 0,
                                                }}
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            />
                                            <div style={{ flexGrow: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontSize: '14px',
                                                    fontWeight: 700,
                                                    color: '#0f172a',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}>
                                                    {title}
                                                </div>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    marginTop: 2,
                                                }}>
                                                    <span style={{
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        color: '#047857',
                                                        backgroundColor: '#ecfdf5',
                                                        padding: '1px 6px',
                                                        borderRadius: 4,
                                                    }}>
                                                        {typeLabel}
                                                    </span>
                                                    {price && Number(price) > 0 && (
                                                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                                                            ₹{price}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <SearchOutlinedIcon style={{ fontSize: 20, color: '#94a3b8', marginLeft: 8 }} />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                )}
            </main>

            {/* Bottom Sticky "See all results" Bar when results exist */}
            {query.trim().length > 0 && filteredList.length > 0 && (
                <div style={{
                    position: 'sticky',
                    bottom: 0,
                    backgroundColor: '#ffffff',
                    borderTop: '1px solid #e2e8f0',
                    padding: '12px 16px',
                    boxShadow: '0 -4px 12px rgba(0,0,0,0.06)',
                }}>
                    <button
                        onClick={handleSearchSubmit}
                        style={{
                            width: '100%',
                            backgroundColor: '#064e3b',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '12px',
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                        }}
                    >
                        <SearchOutlinedIcon style={{ fontSize: 18 }} />
                        <span>View all {filteredList.length} results for &quot;{query}&quot;</span>
                    </button>
                </div>
            )}
        </Dialog>
    );
}
