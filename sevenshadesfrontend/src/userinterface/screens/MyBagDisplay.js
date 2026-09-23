import Header from "../components/Header";
import MyBag from "../components/MyBag";
import Footer from "../components/Footer";
import { useSelector } from "react-redux";
import { useState } from "react";

export default function MyBagDisplay() {
    const product = useSelector((state) => state.product);
    const [pageRefresh, setPageRefresh] = useState(false);
    const products = Object.values(product);

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <Header />
            <div>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 70, marginTop: 30 }}>
                    <h2 style={{ margin: 0 }}>TRY BAG</h2>
                </div>
                <MyBag data={products} pageRefresh={pageRefresh} setPageRefresh={setPageRefresh} />
            </div>
            <Footer />
        </div>
    );
}