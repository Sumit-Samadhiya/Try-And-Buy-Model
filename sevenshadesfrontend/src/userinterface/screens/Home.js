import Header from "../components/Header";
import SubcategoryComponent from "../components/SubcategoryComponent";
import SliderComponent from "../components/SliderComponent";
import CategoryShowcaseCard from "../components/CategoryShowcaseCard";
import BudgetBazaarComponent from "../components/BudgetBazaarComponent";
import Footer from "../components/Footer";
import { getData, postData } from "../../services/FetchDjangoApiServices";
import MainCategoryComponent from "../components/MainCategoryComponent";
import AdvertiseComponent from "../components/AdvertiseComponent";
import { useNavigate } from "react-router-dom";
import { useCallback, useState, useEffect } from "react";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

const uniqueProducts = (items = []) => {
    const byProduct = new Map();
    items.forEach((item) => {
        if (item?.id && !byProduct.has(item.id)) byProduct.set(item.id, item);
    });
    return Array.from(byProduct.values());
};

export default function Home(props) {
    const navigate = useNavigate();
    const theme = useTheme();
    const sm_matches = useMediaQuery(theme.breakpoints.down('sm'));
    const [listBanner, setListBanner] = useState([]);
    const [listSubCategory, setSubCategoryList] = useState([]);
    const [listMainCategory, setMainCategoryList] = useState([]);
    const [menProducts, setMenProducts] = useState([]);
    const [womenProducts, setWomenProducts] = useState([]);
    const [menCategory, setMenCategory] = useState(null);
    const [womenCategory, setWomenCategory] = useState(null);

    const fetchAllBanners = useCallback(async () => {
        const result = await getData('user_banner_list');
        if (result && result.status && Array.isArray(result.data)) {
            let allImages = [];
            result.data.forEach(banner => {
                if (banner.icon) {
                    const splitIcons = banner.icon.split(',').filter(img => img.trim());
                    splitIcons.forEach(iconImg => {
                        allImages.push({
                            id: banner.id,
                            bannerdescription: banner.bannerdescription || '',
                            image: iconImg.trim()
                        });
                    });
                }
            });
            setListBanner(allImages);
        } else {
            setListBanner([]);
        }
    }, []);

    const fetchAllSubCategoryList = useCallback(async () => {
        const result = await getData('user_subcategory_list');
        if (result && result.status) {
            setSubCategoryList(result.data || []);
        } else {
            setSubCategoryList([]);
        }
    }, []);

    const fetchCategoryProducts = useCallback(async (categories) => {
        const menCat = categories.find(c => (c.maincategoryname || '').toLowerCase() === 'men') || { id: 5, maincategoryname: 'Men' };
        const womenCat = categories.find(c => (c.maincategoryname || '').toLowerCase() === 'women') || { id: 4, maincategoryname: 'Women' };

        setMenCategory(menCat);
        setWomenCategory(womenCat);

        // Keep the merchandising order stable so the storefront does not jump
        // to a different set of products on every refresh.
        if (menCat?.id) {
            const menRes = await postData('user_products_maincategory', { maincategoryid: menCat.id });
            if (menRes && menRes.status && Array.isArray(menRes.data)) {
                setMenProducts(uniqueProducts(menRes.data));
            }
        }

        // Fetch Women's products and shuffle randomly
        if (womenCat?.id) {
            const womenRes = await postData('user_products_maincategory', { maincategoryid: womenCat.id });
            if (womenRes && womenRes.status && Array.isArray(womenRes.data)) {
                setWomenProducts(uniqueProducts(womenRes.data));
            }
        }
    }, []);

    const fetchAllMainCategoryList = useCallback(async () => {
        const result = await getData('user_maincategory_list');
        if (result && result.status) {
            const categories = result.data || [];
            setMainCategoryList(categories);
            await fetchCategoryProducts(categories);
        } else {
            setMainCategoryList([]);
            await fetchCategoryProducts([{ id: 5, maincategoryname: 'Men' }, { id: 4, maincategoryname: 'Women' }]);
        }
    }, [fetchCategoryProducts]);

    const handleSubCategoryClick = (item) => {
        navigate('/productpage', { state: { products: item, pageView: 'SubCategoryComponent' } });
    };

    const handleBudgetDealClick = (deal) => {
        if (deal && (deal.title || deal.price_tag)) {
            navigate('/productpage', {
                state: {
                    pageView: 'BudgetBazaarComponent',
                    products: {
                        id: deal.subcategoryid,
                        maincategoryid: deal.maincategoryid,
                        subcategoryname: deal.title
                    },
                    dealTitle: `${deal.title} (${deal.price_tag})`,
                    maxPrice: deal.max_price
                }
            });
            return;
        }
        handleSubCategoryClick(deal);
    };

    const handleProductClick = (item) => {
        const queryParams = new URLSearchParams();
        if (item.id) queryParams.set('productid', item.id);
        if (item.color) queryParams.set('color', item.color);
        navigate(`/productdetailspage?${queryParams.toString()}`, {
            state: { productid: item.id, color: item.color, size: item.available_sizes?.[0] || '' }
        });
    };

    const handleBannerClick = (item, index) => {
        if (!listMainCategory.length) return;
        const desc = (typeof item === 'object' ? item.bannerdescription : '')?.toLowerCase() || '';
        if (desc) {
            const matchedCategory = listMainCategory.find(cat =>
                cat.maincategoryname && desc.includes(cat.maincategoryname.toLowerCase())
            );
            if (matchedCategory) {
                navigate('/productpage', { state: { products: matchedCategory, pageView: 'MainCategoryComponent' } });
                return;
            }
            const matchedSub = listSubCategory.find(sub =>
                sub.subcategoryname && desc.includes(sub.subcategoryname.toLowerCase())
            );
            if (matchedSub) {
                navigate('/productpage', { state: { products: matchedSub, pageView: 'SubCategoryComponent' } });
                return;
            }
        }
        const targetCategory = listMainCategory[(index || 0) % listMainCategory.length] || listMainCategory[0];
        navigate('/productpage', { state: { products: targetCategory, pageView: 'MainCategoryComponent' } });
    };

    useEffect(() => {
        fetchAllBanners();
        fetchAllSubCategoryList();
        fetchAllMainCategoryList();
    }, [fetchAllBanners, fetchAllSubCategoryList, fetchAllMainCategoryList]);

    return (
        <div style={{ position: 'relative', width: '100%', backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header />

            <main style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', flexGrow: 1 }}>
                {/* Hero Banner Carousel */}
                <section style={{ width: '100%', padding: sm_matches ? '8px 10px 0' : '16px 16px 0', boxSizing: 'border-box' }}>
                    <SliderComponent data={listBanner} onBannerClick={handleBannerClick} />
                </section>

                {/* Subcategories Strip */}
                {listSubCategory.length > 0 && (
                    <section style={{ width: '100%', maxWidth: 1360, marginTop: 40, padding: '0 16px', boxSizing: 'border-box' }}>
                        <div style={{ marginBottom: 16, textAlign: 'left' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b' }}>
                                Trending Categories
                            </div>
                            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '4px 0 0 0' }}>
                                Explore by Category
                            </h2>
                        </div>
                        <SubcategoryComponent data={listSubCategory} onItemClick={handleSubCategoryClick} />
                    </section>
                )}

                {/* Featured Collections: Women & Men (Displayed Horizontally Side-by-Side) */}
                {listMainCategory.length > 0 && (
                    <section style={{ width: '100%', maxWidth: 1360, marginTop: sm_matches ? 28 : 48, padding: '0 16px', boxSizing: 'border-box' }}>
                        <MainCategoryComponent data={listMainCategory} />
                    </section>
                )}

                {/* Budget Bazaar: 3-Tier Value Grid (Under ₹299, ₹399, ₹499) */}
                <section style={{ width: '100%', maxWidth: 1360, marginTop: sm_matches ? 24 : 48, padding: '0 16px', boxSizing: 'border-box' }}>
                    <BudgetBazaarComponent
                        subcategories={listSubCategory}
                        products={[...menProducts, ...womenProducts]}
                        onItemClick={handleBudgetDealClick}
                    />
                </section>

                {/* Promotional Try & Buy Value Banner (Desktop only - removed from mobile view) */}
                {!sm_matches && (
                    <section style={{ width: '100%', marginTop: 56 }}>
                        <AdvertiseComponent />
                    </section>
                )}

                {/* Section 1: Shop for Men (Showcase Card Matching Demo Layout) */}
                {menProducts.length > 0 && (
                    <section style={{ width: '100%', maxWidth: 1360, marginTop: sm_matches ? 24 : 48, padding: '0 16px', boxSizing: 'border-box' }}>
                        <CategoryShowcaseCard
                            title="Shop for Men"
                            items={menProducts}
                            onViewAll={() => menCategory && navigate('/productpage', { state: { products: menCategory, pageView: 'MainCategoryComponent' } })}
                            onItemClick={handleProductClick}
                            maxItems={4}
                        />
                    </section>
                )}

                {/* Section 2: Shop for Women (Showcase Card Matching Demo Layout) */}
                {womenProducts.length > 0 && (
                    <section style={{ width: '100%', maxWidth: 1360, marginTop: sm_matches ? 20 : 32, marginBottom: sm_matches ? 36 : 56, padding: '0 16px', boxSizing: 'border-box' }}>
                        <CategoryShowcaseCard
                            title="Shop for Women"
                            items={womenProducts}
                            onViewAll={() => womenCategory && navigate('/productpage', { state: { products: womenCategory, pageView: 'MainCategoryComponent' } })}
                            onItemClick={handleProductClick}
                            maxItems={4}
                        />
                    </section>
                )}
            </main>

            <Footer />
        </div>
    );
}
