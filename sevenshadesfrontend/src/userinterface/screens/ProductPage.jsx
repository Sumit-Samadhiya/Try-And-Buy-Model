import { collectionUrl, collectionFromSearch } from '../../services/collectionUrl';
import { catalogData } from "../../services/FetchDjangoApiServices";
import Header from "../components/Header";
import DoordrapeLoader from "../components/DoordrapeLoader";
import ProductByCategory from "../components/ProductByCategory";
import Footer from "../components/Footer";
import React, { useCallback, useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function ProductPage(props) {
    const location = useLocation();
    const navigate = useNavigate();
    const [productList, setProductList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [nextPage, setNextPage] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const requestVersion = useRef(0);
    useEffect(() => {
        if (!location.search && location.state?.pageView) navigate(collectionUrl(location.state), { replace: true });
    }, [location.search, location.state, navigate]);

    const selection = React.useMemo(() => collectionFromSearch(location.search) || location.state || {}, [location.search, location.state]);
    const products = selection.products;
    const pageView = selection.pageView;
    const maxPrice = selection.maxPrice;
    const dealTitle = selection.dealTitle;

    const getTitle = () => {
        if (dealTitle) return dealTitle;
        if (!products) return "Collections";
        return (
            products.subcategoryname ||
            products.maincategoryname ||
            products.brandname ||
            "Curated Collection"
        );
    };

    const setPageView = useCallback(async (page = 1) => {
        const version = ++requestVersion.current;
        const append = typeof page === 'number' && page > 1;
        if (!append) page = 1;


        if (append) setLoadingMore(true); else { setLoading(true); setNextPage(null); }
        setError('');
        try {
        const checked = result => { if (!result?.status) throw new Error(result?.message || 'Unable to load products.'); return result; };
        const postData = async (...args) => checked(await catalogData(...args));
        const getData = async (...args) => checked(await catalogData(...args));

        if (!selection.searchQuery && (!pageView || ['MainCategoryComponent', 'SubCategoryComponent', 'BrandComponent'].includes(pageView))) {
            const params = new URLSearchParams({ page: String(page), page_size: '12' });
            const field = { MainCategoryComponent: 'maincategoryid', SubCategoryComponent: 'subcategoryid', BrandComponent: 'brandid' }[pageView];
            if (field && products?.id) params.set(field, products.id);
            const result = await getData(`user_product_list?${params}`);
            if (version !== requestVersion.current) return;
            setProductList(old => append ? [...old, ...(result.data || [])] : result.data || []);
            setNextPage(result.next_page || null);
        } else if (!pageView || !products) {
            const result = await getData('user_product_list');
            setProductList(result.data || []);
        } else if (pageView === "MainCategoryComponent") {
            const result = await postData('user_products_maincategory', { maincategoryid: products.id });
            setProductList(result?.data || []);
        } else if (pageView === "SubCategoryComponent") {
            const resultSub = await postData('user_products_maincategory', { maincategoryid: products.maincategoryid });
            const subFiltered = (resultSub?.data || []).filter((item) => item?.subcategoryid?.id === products.id);
            setProductList(subFiltered);
        } else if (pageView === "BrandComponent") {
            const result = await getData('user_product_list');
            const allProducts = result.data || [];
            const brandFiltered = allProducts.filter((item) => item?.brandid?.id === products.id);
            setProductList(brandFiltered);
        } else if (pageView === "BudgetBazaarComponent") {
            let items = [];
            if (products.maincategoryid) {
                const res = await postData('user_products_maincategory', { maincategoryid: products.maincategoryid });
                items = res?.data || [];
            } else {
                const result = await getData('user_product_list');
                items = result.data || [];
            }
            if (products.id) {
                items = items.filter((item) => Number(item?.subcategoryid?.id) === Number(products.id));
            }
            if (maxPrice && Number(maxPrice) > 0) {
                items = items.filter((item) => {
                    const price = Number(item.min_offerprice > 0 ? item.min_offerprice : item.min_price || item.offerprice || item.price);
                    return !price || price <= Number(maxPrice);
                });
            }
            setProductList(items);
        } else if (pageView === "SearchComponent" || selection.searchQuery) {
            const q = selection.searchQuery || '';
            const res = await postData('user_search_products', { q });
            const items = (res?.data || []).filter((item) => item.type === 'product');
            setProductList(items);
        } else {
            throw new Error('This collection link is invalid. Please choose a collection from the shop.');
        }

        } catch (failure) { if (version === requestVersion.current) { setError(failure.message); if (!append) setProductList([]); } }
        finally { if (version === requestVersion.current) { setLoading(false); setLoadingMore(false); } }
    }, [pageView, products, maxPrice, selection.searchQuery]);

    useEffect(() => {
        setPageView();
        return () => { requestVersion.current += 1; };
    }, [setPageView]);

    return (
        <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header />

            {/* Collection Header Bar */}
            <div style={{
                backgroundColor: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
                padding: '24px 16px',
            }}>
                <div style={{
                    maxWidth: 1360,
                    margin: '0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
                        <span style={{ cursor: 'pointer' }} onClick={() => navigate('/home')}>Home</span>
                        <span>/</span>
                        <span style={{ color: '#0f172a', fontWeight: 600 }}>{getTitle()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
                        <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                            {getTitle()}
                        </h1>
                        <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
                            {loading ? 'Loading items...' : `${productList.length} item${productList.length === 1 ? '' : 's'} available for Try & Buy`}
                        </span>
                    </div>
                </div>
            </div>

            {/* Product Grid Content */}
            <main style={{ flexGrow: 1, paddingBottom: 48 }}>
                {error ? (<div role="alert" style={{ padding: 32 }}>{error} <button onClick={() => setPageView(nextPage || 1)}>Retry</button></div>) : loading ? (
                    <DoordrapeLoader text="Loading curated products..." role="status" />
                ) : (
                    <ProductByCategory data={productList} />
                )}
                {!loading && nextPage && !error && <div style={{textAlign:'center', padding:24}}><button disabled={loadingMore} onClick={() => setPageView(nextPage)} style={{minHeight:44,padding:'10px 24px',borderRadius:10,cursor:'pointer'}}>{loadingMore ? 'Loading more...' : 'Load more products'}</button></div>}
            </main>

            <Footer />
        </div>
    );
}
