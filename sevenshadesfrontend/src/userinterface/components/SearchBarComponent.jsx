import imageUrl from '../../services/imageUrl';
import { trackSearch } from '../../services/analytics';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CircularProgress from '@mui/material/CircularProgress';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getData } from '../../services/FetchDjangoApiServices';
import { useDebounce } from '../../services/useDebounce';

export default function SearchBarComponent(props) {
    const [productname, setProductName] = useState('');
    const debouncedQuery = useDebounce(productname, 350);

    const [allProducts, setAllProducts] = useState([]);
    const [filteredList, setFilteredList] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        let isMounted = true;
        const fetchSearchableItems = async () => {
            try {
                const [subCategoryRes, mainCategoryRes, productRes, brandRes] = await Promise.all([
                    getData('user_subcategory_list'),
                    getData('user_maincategory_list'),
                    getData('user_product_list'),
                    getData('user_brand_list'),
                ]);

                let combinedList = [];

                if (subCategoryRes && subCategoryRes.status && Array.isArray(subCategoryRes.data)) {
                    combinedList = combinedList.concat(subCategoryRes.data.map(item => ({ ...item, type: 'subcategory' })));
                }
                if (mainCategoryRes && mainCategoryRes.status && Array.isArray(mainCategoryRes.data)) {
                    combinedList = combinedList.concat(mainCategoryRes.data.map(item => ({ ...item, type: 'maincategory' })));
                }
                if (productRes && productRes.status && Array.isArray(productRes.data)) {
                    combinedList = combinedList.concat(productRes.data.map(item => ({ ...item, type: 'product' })));
                }
                if (brandRes && brandRes.status && Array.isArray(brandRes.data)) {
                    combinedList = combinedList.concat(brandRes.data.map(item => ({ ...item, type: 'brand' })));
                }

                if (isMounted) {
                    setAllProducts(combinedList);
                }
            } catch {
                // Ignore prefetch error
            }
        };
        fetchSearchableItems();
        return () => {
            isMounted = false;
        };
    }, []);

    // Debounced search filtering
    useEffect(() => {
        const query = debouncedQuery.trim().toLowerCase();
        if (query.length > 0) {
            setIsLoading(true);
            const matches = allProducts.filter((item) => {
                const name = (item.productname || item.subcategoryname || item.maincategoryname || item.brandname || '').toLowerCase();
                const brand = (item.brandname || item.brandid?.brandname || '').toLowerCase();
                const desc = (item.description || '').toLowerCase();
                return name.includes(query) || brand.includes(query) || desc.includes(query);
            });
            setFilteredList(matches);
            setShowDropdown(true);
            setIsLoading(false);
        } else {
            setFilteredList([]);
            setShowDropdown(false);
            setIsLoading(false);
        }
    }, [debouncedQuery, allProducts]);

    const handleSelectProduct = (item) => {
        setShowDropdown(false);
        setProductName('');
        trackSearch(item.productname || item.subcategoryname || item.brandname || 'product', 1);
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

    const handleSearchClick = () => {
        const query = productname.trim();
        if (!query) return;

        trackSearch(query, filteredList.length);
        setShowDropdown(false);

        const lower = query.toLowerCase();
        const menCategory = allProducts.find(item => item.type === 'maincategory' && (item.maincategoryname || '').toLowerCase() === 'men');
        const womenCategory = allProducts.find(item => item.type === 'maincategory' && (item.maincategoryname || '').toLowerCase() === 'women');

        if (lower === 'men' && menCategory) {
            navigate('/productpage', { state: { pageView: 'MainCategoryComponent', products: { id: menCategory.id } } });
        } else if (lower === 'women' && womenCategory) {
            navigate('/productpage', { state: { pageView: 'MainCategoryComponent', products: { id: womenCategory.id } } });
        } else if (filteredList.length === 1) {
            handleSelectProduct(filteredList[0]);
        } else {
            navigate(`/productpage?search=${encodeURIComponent(query)}`, {
                state: { pageView: 'SearchComponent', searchQuery: query }
            });
        }
    };

    return (
        <div style={{
            backgroundColor: "#ffffff",
            borderRadius: '10px',
            width: '100%',
            maxWidth: '460px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            margin: '0 20px',
            position: 'relative',
            boxShadow: isFocused ? '0 0 0 2px #10b981, 0 4px 14px rgba(6, 78, 59, 0.2)' : '0 2px 6px rgba(0,0,0,0.1)',
            transition: 'box-shadow 0.2s ease',
        }}>
            <SearchOutlinedIcon
                onClick={handleSearchClick}
                style={{ color: '#059669', cursor: 'pointer', marginRight: '8px', fontSize: '20px' }}
                aria-label="Submit search"
            />
            <input
                type="text"
                value={productname}
                placeholder="Search styles, categories, brands..."
                onChange={(e) => setProductName(e.target.value)}
                onFocus={() => {
                    setIsFocused(true);
                    if (filteredList.length > 0) setShowDropdown(true);
                }}
                onBlur={() => setTimeout(() => {
                    setIsFocused(false);
                    setShowDropdown(false);
                }, 250)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearchClick(); }}
                style={{
                    background: "transparent",
                    border: "none",
                    outline: 'none',
                    width: '100%',
                    height: '100%',
                    color: "#0f172a",
                    fontSize: "14px",
                    fontWeight: 500,
                }}
                aria-label="Search DoorDrape products"
            />

            {isLoading ? (
                <CircularProgress size={16} style={{ color: '#059669', marginLeft: '6px' }} />
            ) : productname.length > 0 ? (
                <CloseRoundedIcon
                    onClick={() => { setProductName(''); setFilteredList([]); setShowDropdown(false); }}
                    style={{ color: '#94a3b8', cursor: 'pointer', fontSize: '18px', marginLeft: '6px' }}
                    aria-label="Clear search"
                />
            ) : null}

            {/* LIVE AUTO-COMPLETE DROPDOWN */}
            {showDropdown && filteredList.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '46px',
                    left: 0,
                    right: 0,
                    backgroundColor: '#ffffff',
                    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.15)',
                    borderRadius: '10px',
                    zIndex: 9999,
                    maxHeight: '340px',
                    overflowY: 'auto',
                    border: '1px solid #e2e8f0',
                }}>
                    {filteredList.slice(0, 8).map((item) => (
                        <div
                            key={`${item.type}-${item.id}`}
                            onMouseDown={() => handleSelectProduct(item)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '10px 14px',
                                borderBottom: '1px solid #f1f5f9',
                                cursor: 'pointer',
                                transition: 'background-color 0.15s ease',
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                        >
                            <img
                                src={imageUrl(item.icon)}
                                alt=""
                                style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, marginRight: 12, backgroundColor: '#f1f5f9' }}
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
                                    {item.productname || item.subcategoryname || item.maincategoryname || item.brandname}
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                    {item.type === 'product'
                                        ? (item.brandid?.brandname ? `Product • ${item.brandid.brandname}` : 'Product Match')
                                        : item.type === 'brand'
                                        ? 'Brand Match'
                                        : 'Category Match'}
                                </div>
                            </div>
                            {item.min_offerprice || item.min_price ? (
                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#047857', marginLeft: 8 }}>
                                    ₹{item.min_offerprice || item.min_price}
                                </div>
                            ) : null}
                        </div>
                    ))}

                    {/* Footer Row: View all results */}
                    <div
                        onMouseDown={handleSearchClick}
                        style={{
                            padding: '10px 14px',
                            backgroundColor: '#ecfdf5',
                            color: '#047857',
                            fontSize: '13px',
                            fontWeight: 700,
                            textAlign: 'center',
                            cursor: 'pointer',
                            borderTop: '1px solid #d1fae5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                        }}
                    >
                        <SearchOutlinedIcon style={{ fontSize: 16 }} />
                        <span>View all {filteredList.length} results for &quot;{productname}&quot;</span>
                    </div>
                </div>
            )}
        </div>
    );
}
