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
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSearchableItems = async () => {
            const [subCategoryRes, mainCategoryRes, productRes] = await Promise.all([
                getData('user_subcategory_list'),
                getData('user_maincategory_list'),
                getData('user_product_list') // Assuming this endpoint exists for all products
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
                const name = (item.subcategoryname || item.maincategoryname || item.productname || '').toLowerCase();
                const brand = (item.brandname || '').toLowerCase();
                return name.includes(query) || brand.includes(query);
            });
            setFilteredList(matches);
            setShowDropdown(true);
        } else {
            setShowDropdown(false);
        }
    };

    const handleSelectProduct = (item) => {
        setShowDropdown(false);
        setProductName('');
        if (item.type === 'product') {
            navigate('/productdetailspage', { state: { product: item, pageView: 'ProductDetailsComponent' } });
        } else if (item.type === 'subcategory') {
            navigate('/productpage', { state: { products: item, pageView: 'SubCategoryComponent' } });
        } else if (item.type === 'maincategory') {
            navigate('/productpage', { state: { products: item, pageView: 'MainCategoryComponent' } });
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
        } else {
            // Handle no results found or a generic search page
            console.log('No results found for:', productname);
        }
    };

    return (
        <div style={{
            background: "#fff",
            borderRadius: 10,
            width: '40%',
            height: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: '7%',
            position: 'relative'
        }}>
            <input
                type="text"
                value={productname}
                placeholder='Search products, categories & brands...'
                onChange={handleInputChange}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearchClick(); }}
                style={{
                    background: "#fff",
                    border: "0",
                    borderRadius: 10,
                    outline: 'none',
                    width: '90%',
                    height: 28,
                    color: "#000",
                    fontSize: "0.95rem",
                    paddingLeft: '10px'
                }}
            />
            <SearchOutlinedIcon onClick={handleSearchClick} style={{ color: 'black', cursor: 'pointer', marginRight: '8px' }} />

            {/* LIVE AUTO-COMPLETE DROPDOWN */}
            {showDropdown && filteredList.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '40px',
                    left: 0,
                    right: 0,
                    backgroundColor: '#ffffff',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    borderRadius: '8px',
                    zIndex: 9999,
                    maxHeight: '280px',
                    overflowY: 'auto',
                    border: '1px solid #e5e7eb'
                }}>
                    {filteredList.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => handleSelectProduct(item)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '10px 12px',
                                borderBottom: '1px solid #f1f5f9',
                                cursor: 'pointer',
                                transition: 'background-color 0.15s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                        >
                            <img
                                src={imageUrl(item.icon)}
                                alt=""
                                style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, marginRight: 12 }}
                            />
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827' }}>
                                    {item.subcategoryname}
                                </div>
                                <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                    Category Search Match
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
