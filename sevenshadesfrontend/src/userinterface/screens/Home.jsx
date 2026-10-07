import Header from "../components/Header";
import DoordrapeLoader from "../components/DoordrapeLoader";
import SubcategoryComponent from "../components/SubcategoryComponent";
import SliderComponent from "../components/SliderComponent";
import CategoryShowcaseCard from "../components/CategoryShowcaseCard";
import BudgetBazaarComponent from "../components/BudgetBazaarComponent";
import Footer from "../components/Footer";
import { catalogData } from "../../services/FetchDjangoApiServices";
import MainCategoryComponent from "../components/MainCategoryComponent";
import AdvertiseComponent from "../components/AdvertiseComponent";
import HomeFaqSection from "../components/HomeFaqSection";
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
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [reload, setReload] = useState(0);
    const [listSubCategory, setSubCategoryList] = useState([]);
    const [listMainCategory, setMainCategoryList] = useState([]);
    const [menProducts, setMenProducts] = useState([]);
    const [womenProducts, setWomenProducts] = useState([]);
    const [menCategory, setMenCategory] = useState(null);
    const [womenCategory, setWomenCategory] = useState(null);

    const fetchAllBanners = useCallback(async () => {
        const result = await catalogData('user_banner_list');
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
            setListBanner([]); setLoadError(true);
        }
    }, []);

    const fetchAllSubCategoryList = useCallback(async () => {
        const result = await catalogData('user_subcategory_list');
        if (result && result.status) {
            setSubCategoryList(result.data || []);
        } else {
            setSubCategoryList([]); setLoadError(true);
        }
    }, []);

    const fetchCategoryProducts = useCallback(async (categories) => {
        const menCat = categories.find(c => (c.maincategoryname || '').toLowerCase() === 'men');
        const womenCat = categories.find(c => (c.maincategoryname || '').toLowerCase() === 'women');

        setMenCategory(menCat);
        setWomenCategory(womenCat);

        await Promise.all([[menCat, setMenProducts], [womenCat, setWomenProducts]].map(async ([category, update]) => {
            if (!category?.id) { update([]); return; }
            const result = await catalogData('user_products_maincategory', { maincategoryid: category.id, limit: 6 });
            if (!result?.status) setLoadError(true);
            update(uniqueProducts(result?.data || []));
        }));
    }, []);

    const fetchAllMainCategoryList = useCallback(async () => {
        const result = await catalogData('user_maincategory_list');
        if (result && result.status) {
            const categories = result.data || [];
            setMainCategoryList(categories);
            await fetchCategoryProducts(categories);
        } else {
            setMainCategoryList([]);
            setLoadError(true);
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
        setLoading(true); setLoadError(false);
        Promise.all([fetchAllBanners(), fetchAllSubCategoryList(), fetchAllMainCategoryList()]).finally(() => setLoading(false));
    }, [fetchAllBanners, fetchAllSubCategoryList, fetchAllMainCategoryList, reload]);

    useEffect(() => {
        if (!loading) window.dispatchEvent(new Event('doordrape-home-ready'));
    }, [loading]);

    return (
        <div style={{ position: 'relative', width: '100%', backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header />
            {loading && <DoordrapeLoader text="Loading curated collections…" role="status" />}
            {!loading && loadError && <div role="alert" style={{ padding: 24 }}>Some collections could not load. <button onClick={() => setReload(value => value + 1)}>Retry collections</button></div>}
            {!loading && !loadError && !listMainCategory.length && <p style={{ padding: 24 }}>New collections are coming soon.</p>}

            <main style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', flexGrow: 1 }}>
                <h1 className="sr-only">Doordrape: Doorstep Try &amp; Buy Fashion — Try Clothes at Home Before You Buy</h1>
                {/* Hero Banner Carousel */}
                <section style={{ width: '100%', padding: sm_matches ? '8px 10px 0' : '16px 16px 0', boxSizing: 'border-box' }}>
                    <SliderComponent data={listBanner} onBannerClick={handleBannerClick} />
                </section>

                {/* Trust & Value Proposition Strip */}
                <section style={{ width: '100%', maxWidth: 1360, padding: sm_matches ? '12px 16px 0' : '20px 16px 0', boxSizing: 'border-box' }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: sm_matches ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                        gap: sm_matches ? 10 : 16,
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: sm_matches ? '12px' : '16px',
                        padding: sm_matches ? '14px 12px' : '16px 20px',
                        boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 20 }}>⚡</span>
                            <div>
                                <strong style={{ display: 'block', fontSize: sm_matches ? '12px' : '13px', color: '#0f172a' }}>30-45 Min Delivery</strong>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>Fast doorstep service</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 20 }}>👗</span>
                            <div>
                                <strong style={{ display: 'block', fontSize: sm_matches ? '12px' : '13px', color: '#0f172a' }}>15-Min Home Trial</strong>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>Try multiple sizes</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 20 }}>💵</span>
                            <div>
                                <strong style={{ display: 'block', fontSize: sm_matches ? '12px' : '13px', color: '#0f172a' }}>Pay After Trial</strong>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>Cash on Delivery / UPI</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 20 }}>🔄</span>
                            <div>
                                <strong style={{ display: 'block', fontSize: sm_matches ? '12px' : '13px', color: '#0f172a' }}>Instant Returns</strong>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>Hand back on the spot</span>
                            </div>
                        </div>
                    </div>
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
                    <section style={{ width: '100%', maxWidth: 1360, marginTop: sm_matches ? 20 : 32, padding: '0 16px', boxSizing: 'border-box' }}>
                        <CategoryShowcaseCard
                            title="Shop for Women"
                            items={womenProducts}
                            onViewAll={() => womenCategory && navigate('/productpage', { state: { products: womenCategory, pageView: 'MainCategoryComponent' } })}
                            onItemClick={handleProductClick}
                            maxItems={4}
                        />
                    </section>
                )}


                {/* FAQ Section matching JSON-LD Schema */}
                <HomeFaqSection />
            </main>

            <Footer />
        </div>
    );
}
