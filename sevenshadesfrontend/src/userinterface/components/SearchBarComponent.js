import imageUrl from '../../services/imageUrl';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getData } from '../../services/FetchDjangoApiServices';

export default function SearchBarComponent(props) {
    const [productname, setProductName] = useState('');
    const [allProducts, setAllProducts] = useState([]);
    const [filteredList, setFilteredList] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSearchableItems = async () => {
            const [subCategoryRes, mainCategoryRes, productRes, brandRes] = await Promise.all([
                getData('user_subcategory_list'),
                getData('user_maincategory_list'),
                getData('user_product_list'),
                getData('user_brand_list'),
            ]);

            let combinedList = [];

            if (subCategoryRes && subCategoryRes.status) {
                combinedList = combinedList.concat(subCategoryRes.data.map(item => ({ ...item, type: 'subcategory' })));
            }
            if (mainCategoryRes && mainCategoryRes.status) {
                combinedList = combinedList.concat(mainCategoryRes.data.map(item => ({ ...item, type: 'maincategory' })));
            }
            if (productRes && productRes.status) {
                combinedList = combinedList.concat(productRes.data.map(item => ({ ...item, type: 'product' })));
            }
            if (brandRes && brandRes.status) {
                combinedList = combinedList.concat(brandRes.data.map(item => ({ ...item, type: 'brand' })));
            }
            setAllProducts(combinedList);
        };
        fetchSearchableItems();
    }, []);

    const handleInputChange = (e) => {
        const val = e.target.value;
        setProductName(val);
        if (val.trim().length > 0) {
            const query = val.toLowerCase();
            const matches = allProducts.filter((item) => {
                const name = (item.productname || item.subcategoryname || item.maincategoryname || item.brandname || '').toLowerCase();
                const brand = (item.brandname || item.brandid?.brandname || '').toLowerCase();
                return name.includes(query) || brand.includes(query);
            });
            setFilteredList(matches);
            setShowDropdown(true);
        } else {
            setFilteredList([]);
            setShowDropdown(false);
        }
    };

    const handleSelectProduct = (item) => {
        setShowDropdown(false);
        setProductName('');
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
        const query = productname.trim().toLowerCase();
        const menCategory = allProducts.find(item => item.type === 'maincategory' && item.maincategoryname.toLowerCase() === 'men');
        const womenCategory = allProducts.find(item => item.type === 'maincategory' && item.maincategoryname.toLowerCase() === 'women');

        if (query === 'men' && menCategory) {
            navigate('/productpage', { state: { pageView: 'MainCategoryComponent', products: { id: menCategory.id } } });
        } else if (query === 'women' && womenCategory) {
            navigate('/productpage', { state: { pageView: 'MainCategoryComponent', products: { id: womenCategory.id } } });
        } else if (filteredList.length > 0) {
            handleSelectProduct(filteredList[0]);
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
            boxShadow: isFocused ? '0 0 0 2px #3b82f6, 0 4px 12px rgba(0,0,0,0.1)' : '0 2px 6px rgba(0,0,0,0.08)',
            transition: 'box-shadow 0.2s ease',
        }}>
            <SearchOutlinedIcon
                onClick={handleSearchClick}
                style={{ color: '#64748b', cursor: 'pointer', marginRight: '8px', fontSize: '20px' }}
            />
            <input
                type="text"
                value={productname}
                placeholder="Search styles, categories, brands..."
                onChange={handleInputChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
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
            />

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
                    maxHeight: '320px',
                    overflowY: 'auto',
                    border: '1px solid #e2e8f0',
                }}>
                    {filteredList.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => handleSelectProduct(item)}
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
                            />
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
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
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
