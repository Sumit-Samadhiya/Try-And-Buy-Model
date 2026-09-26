import { collectionUrl, collectionFromSearch } from '../../services/collectionUrl';
import { catalogData } from "../../services/FetchDjangoApiServices";
import Header from "../components/Header";
import ProductByCategory from "../components/ProductByCategory";
import Footer from "../components/Footer";
import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function ProductPage(props) {
    const location = useLocation();
    const navigate = useNavigate();
    const [productList, setProductList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
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

    const setPageView = useCallback(async () => {


        setLoading(true);
        setError('');
        try {
        const checked = result => { if (!result?.status) throw new Error(result?.message || 'Unable to load products.'); return result; };
        const postData = async (...args) => checked(await catalogData(...args));
        const getData = async (...args) => checked(await catalogData(...args));

        if (!pageView || !products) {
            const categories = await getData('user_maincategory_list');
            const results = await Promise.all((categories.data || []).map(category => postData('user_products_maincategory', { maincategoryid: category.id })));
            setProductList(results.flatMap(result => result.data || []));
        } else if (pageView === "MainCategoryComponent") {
            const result = await postData('user_products_maincategory', { maincategoryid: products.id });
            setProductList(result?.data || []);
        } else if (pageView === "SubCategoryComponent") {
            const resultSub = await postData('user_products_maincategory', { maincategoryid: products.maincategoryid });
            const subFiltered = (resultSub?.data || []).filter((item) => item?.subcategoryid?.id === products.id);
            setProductList(subFiltered);
        } else if (pageView === "BrandComponent") {
            const categoryResult = await getData('user_maincategory_list');
            const categoryIds = (categoryResult?.data || []).map((cat) => cat.id);
            const productPromises = categoryIds.map((id) => postData('user_products_maincategory', { maincategoryid: id }));
            const allProductResults = await Promise.all(productPromises);
            const allProducts = allProductResults.flatMap((res) => res?.data || []);
            const brandFiltered = allProducts.filter((item) => item?.brandid?.id === products.id);
            setProductList(brandFiltered);
        } else if (pageView === "BudgetBazaarComponent") {
            let items = [];
            if (products.maincategoryid) {
                const res = await postData('user_products_maincategory', { maincategoryid: products.maincategoryid });
                items = res?.data || [];
            } else {
                const categoryResult = await getData('user_maincategory_list');
                const categoryIds = (categoryResult?.data || []).map((cat) => cat.id);
                const productPromises = categoryIds.map((id) => postData('user_products_maincategory', { maincategoryid: id }));
                const allProductResults = await Promise.all(productPromises);
                items = allProductResults.flatMap((res) => res?.data || []);
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
        }

        } catch (failure) { setError(failure.message); setProductList([]); }
        finally { setLoading(false); }
    }, [pageView, products, maxPrice]);

    useEffect(() => {
        setPageView();
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
                {error ? (<div role="alert" style={{ padding: 32 }}>{error} <button onClick={setPageView}>Retry</button></div>) : loading ? (
                    <div style={{ textAlign: 'center', padding: '64px 16px', color: '#64748b' }}>
                        <p style={{ fontSize: 16, fontWeight: 600 }}>Loading curated products...</p>
                    </div>
                ) : (
                    <ProductByCategory data={productList} />
                )}
            </main>

            <Footer />
        </div>
    );
}
