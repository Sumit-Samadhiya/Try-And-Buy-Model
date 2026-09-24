import imageUrl from '../../services/imageUrl';
import { postData } from "../../services/FetchDjangoApiServices";
import { Alert, Button } from "@mui/material";
import PlusMinusComponent from "./PlusMinuComponent";
import { useDispatch, useSelector } from 'react-redux';
import './MyBagcs.css';
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function MyBag(props) {
    const items = props?.data || [];
    const user = useSelector((state) => state.user);
    const userData = Object.values(user)[0] || {};
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [previousOrders, setPreviousOrders] = useState(0);

    useEffect(() => {
        const fetchUserOrderCount = async () => {
            if (!userData?.mobileno) {
                setPreviousOrders(0);
                return;
            }

            const result = await postData('user_order_lifecycle_list', { mobileno: userData.mobileno });
            if (result?.status) {
                setPreviousOrders(result.intro_offer_available === true ? 0 : (result.data || []).filter(row => !(row.try_order?.status === 'CANCELLED' && !row.try_order?.dispatched_at)).length);
            } else {
                setPreviousOrders(0);
            }
        };

        fetchUserOrderCount();
    }, [userData?.mobileno]);

    const totalTryItems = items.filter((item) => (item.qty || 0) > 0).length;
    const referenceValue = items.reduce((total, item) => total + ((item.offerprice > 0 && item.offerprice <= item.price ? item.offerprice : item.price) * ((item.qty || 0) > 0 ? 1 : 0)), 0);
    const isFirstOrder = previousOrders === 0;
    const payableAmount = isFirstOrder ? 0 : 49;
    const billingItems = items.map((item) => ({
        id: item.id,
        size: item.selectedSize || item.size,
        color: item.color,
        name: item?.productid?.productname || item.productname,
        brand: item?.brandid?.brandname || 'SevenShades',
        qty: (item.qty || 0) > 0 ? 1 : 0,
        price: (item.offerprice > 0 && item.offerprice <= item.price ? item.offerprice : item.price) * ((item.qty || 0) > 0 ? 1 : 0),
    })).filter((item) => item.qty > 0);

    const handleChange = (value, product) => {
        const normalizedValue = value > 0 ? 1 : 0;
        const totalWithoutCurrent = totalTryItems - ((product.qty || 0) > 0 ? 1 : 0);

        if (totalWithoutCurrent + normalizedValue > 4) {
            return;
        }

        product.qty = normalizedValue;

        if (normalizedValue >= 1) {
            dispatch({ type: "ADD_PRODUCT", payLoad: [product.id, product] });
        } else {
            dispatch({ type: "DELETE_PRODUCT", payLoad: [product.id] });
        }

        props.setPageRefresh(!props.pageRefresh);
    };

    const handleScheduleTry = () => {
        if (!billingItems.length || billingItems.some(item => !item.size)) {
            alert("Please select a size for each product before checkout.");
            return;
        }
        const trialDetails = {
            payableAmount,
            totalTryItems,
            referenceValue,
            isFirstOrder,
            billingItems,
        };

        if (userData?.mobileno) {
            navigate('/displaycheckout', { state: trialDetails });
        } else {
            navigate('/signindisplay', { state: { redirectTo: '/displaycheckout', checkoutState: trialDetails } });
        }
    };

    const renderProducts = () => {
        return items.map((item) => (
            <div key={item.id} className="product-card">
                <img
                    src={item?.productid?.icon ? imageUrl(item.productid.icon) : imageUrl(item.icon?.split(',')[0] || '')}
                    alt=""
                    className="product-image"
                />
                <div className="product-details">
                    <div className="product-name">{item?.productid?.productname || item.productname}</div>
                    <div>Size: {item.selectedSize || item.size || "Please reselect"} · {item.color}</div>
                    <div className="product-brand">{item?.brandid?.brandname || 'SevenShades'}</div>
                    <div className="product-color">Color: {item.color || 'Selected at trial'}</div>
                    <div className="product-price">
                        {item.offerprice > 0 ? (
                            <div>
                                <span className="original-price">₹{item.price}</span>
                                <span className="offer-price">₹{item.offerprice}</span>
                            </div>
                        ) : (
                            <div>₹{item.price}</div>
                        )}
                    </div>
                    <div className="total-price">
                        Reference Value: ₹{(item.offerprice > 0 && item.offerprice <= item.price ? item.offerprice : item.price) * ((item.qty || 0) > 0 ? 1 : 0)}
                    </div>
                    <div className="quantity-control">
                        <PlusMinusComponent
                            value={item.qty}
                            onChange={(value) => handleChange(value, item)}
                            addLabel="Add to Try Bag"
                            disableIncrement={totalTryItems >= 4}
                            helperText={totalTryItems >= 4 ? 'Maximum 4 items allowed in Try Cart.' : 'Each style can be selected once in Try Cart.'}
                        />
                    </div>
                </div>
            </div>
        ));
    };

    const summaryPanel = () => {
        return (
            <div className="payment-summary">
                <div>
                    <h2>Trial Summary</h2>
                    <p className="summary-subtitle">Try Cart captures trial intent, Main Cart captures final purchase</p>
                </div>
                <div className="summary-row">
                    <div><h3>Try Items:</h3></div>
                    <div><h3>{totalTryItems} / 4</h3></div>
                </div>
                <div className="summary-row">
                    <div><h3>Reference Value:</h3></div>
                    <div><h3>₹{referenceValue}</h3></div>
                </div>
                <div className="summary-row">
                    <div><h3>First Try:</h3></div>
                    <div><h3>Free</h3></div>
                </div>
                <div className="summary-row">
                    <div><h3>Repeat Try Fee:</h3></div>
                    <div><h3>₹49</h3></div>
                </div>
                <div className="summary-row">
                    <div><h3>Wallet Credit:</h3></div>
                    <div><h3>On purchase</h3></div>
                </div>
                <div className="summary-row">
                    <div><h3>Billing Amount:</h3></div>
                    <div><h3>₹{payableAmount}</h3></div>
                </div>
                <div className="billing-items-wrap">
                    <div className="trial-title">Items In This Billing</div>
                    {billingItems.map((item) => (
                        <div key={item.id} className="billing-item-row">
                            <div>
                                <div className="billing-item-name">{item.name}</div>
                                <div className="billing-item-meta">{item.brand} • Qty {item.qty}</div>
                            </div>
                            <div className="billing-item-price">₹{item.price}</div>
                        </div>
                    ))}
                </div>
                <hr className="divider" />
                <Alert severity="info" style={{ marginTop: 10 }}>
                    Delivery timing confirmation ke liye order place karne ke baad aapko call aayega.
                </Alert>
                {isFirstOrder ? (
                    <Alert severity="success" style={{ marginTop: 10 }}>
                        First order hai, isliye free trial billing hi show ho rahi hai.
                    </Alert>
                ) : (
                    <Alert severity="warning" style={{ marginTop: 10 }}>
                        This is not the first order. ₹49 trial billing address page par payment mode ke saath dikhegi.
                    </Alert>
                )}
                <div className="checkout-button">
                    <Button onClick={handleScheduleTry} variant="contained" fullWidth style={{ backgroundColor: '#111', marginTop: 16 }} disabled={items.length === 0}>
                        Proceed To Address
                    </Button>
                </div>
            </div>
        );
    };

    if (items.length === 0) {
        return (
            <div className="container">
                <div className="payment-summary" style={{ width: '100%' }}>
                    <h2>Your Try Bag is empty</h2>
                    <p>Select up to 4 items and schedule a home trial.</p>
                    <Button variant="contained" style={{ backgroundColor: '#111' }} onClick={() => navigate('/home')}>
                        Explore Products
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="products-container">{renderProducts()}</div>
            <div className="payment-container">{summaryPanel()}</div>
        </div>
    );
}
