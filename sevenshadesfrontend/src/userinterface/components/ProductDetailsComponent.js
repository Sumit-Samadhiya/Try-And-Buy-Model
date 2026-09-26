import imageUrl from '../../services/imageUrl';
import React, { useState, createRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Header from './Header';
import Footer from './Footer';
import { postData } from '../../services/FetchDjangoApiServices';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import './ProductDetailsComponent.css';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import PlusMinusComponent from './PlusMinuComponent'
import Select from '@mui/material/Select';
import Rating from '@mui/material/Rating';

export default function ProductDetailsComponent(props) {

    const dispatch = useDispatch();
    const initialIndex = React.useMemo(() => {
        if (!props.productList || props.productList.length === 0) return 0;
        if (props.initialColor || props.initialSize) {
            const exactMatch = props.productList.findIndex((v) =>
                (!props.initialColor || v.color?.toLowerCase() === props.initialColor.toLowerCase()) &&
                (!props.initialSize || v.size?.toLowerCase() === props.initialSize.toLowerCase())
            );
            if (exactMatch >= 0) return exactMatch;
            const colorMatch = props.productList.findIndex((v) =>
                (!props.initialColor || v.color?.toLowerCase() === props.initialColor.toLowerCase()) && v.qty > 0
            );
            if (colorMatch >= 0) return colorMatch;
        }
        const inStock = props.productList.findIndex((v) => v.qty > 0 && v.size);
        return inStock >= 0 ? inStock : 0;
    }, [props.productList, props.initialColor, props.initialSize]);

    const [index, setIndex] = useState(initialIndex);
    const [activeImgIndex, setActiveImgIndex] = useState(0);
    const theme = useTheme();
    const sm_matches = useMediaQuery(theme.breakpoints.down('sm'));
    const bagItems = useSelector((state) => state.product);
    const totalTryItems = Object.values(bagItems).reduce((total, item) => total + (item.qty > 0 ? 1 : 0), 0);
    const sldr = createRef(null);

    React.useEffect(() => {
        setIndex(initialIndex);
        setActiveImgIndex(0);
    }, [initialIndex]);

    const [reviewsList, setReviewsList] = useState([]);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [userRating, setUserRating] = useState(5);
    const [userComment, setUserComment] = useState('');
    const userState = useSelector((state) => state.user);
    const currentUser = Object.values(userState)[0] || {};

    let product, items;
    try {
        product = props.productList?.[index] || {};
        items = product?.icon?.split(",").filter(Boolean) || [];
        if (items.length === 0 && product?.icon) items = [product.icon];
    } catch (e) {
        items = [""];
        product = {};
    }

    const loadReviews = React.useCallback(async () => {
        if (product?.id) {
            const res = await postData('fetch_product_reviews', { product_details_id: product.id });
            if (res && res.status) {
                setReviewsList(res.data || []);
            }
        }
    }, [product?.id]);

    React.useEffect(() => {
        loadReviews();
    }, [loadReviews]);

    React.useEffect(() => {
        if (product && product.color && product.size) {
            try {
                if (typeof window !== 'undefined' && window.location) {
                    const currentUrl = new URL(window.location.href);
                    const pid = product.productid?.id || product.productid;
                    if (pid && (currentUrl.searchParams.get('color') !== product.color || currentUrl.searchParams.get('size') !== product.size)) {
                        currentUrl.searchParams.set('productid', pid);
                        currentUrl.searchParams.set('color', product.color);
                        currentUrl.searchParams.set('size', product.size);
                        window.history.replaceState({}, '', currentUrl.toString());
                    }
                }
            } catch (e) {
                // Ignore in non-browser testing
            }
        }
    }, [product]);

    const settings = {
        dots: false,
        infinite: items.length > 1,
        speed: 400,
        slidesToShow: 1,
        slidesToScroll: 1,
        arrows: false,
        afterChange: (current) => setActiveImgIndex(current),
    };

    if (!props.productList || props.productList.length === 0 || !props.productList[index]) {
        return (
            <div>
                <Header />
                <div style={{ textAlign: 'center', padding: '60px 20px', minHeight: '50vh' }}>
                    <h2 style={{ color: '#111827' }}>Product Unavailable</h2>
                    <p style={{ color: '#6b7280' }}>This product has no active variants or sizes available right now.</p>
                </div>
                <Footer />
            </div>
        );
    }

    const handlePrevious = () => {
        sldr.current?.slickPrev();
    };

    const handleNext = () => {
        sldr.current?.slickNext();
    };

    const handleThumbnailClick = (itemIndex) => {
        setActiveImgIndex(itemIndex);
        sldr.current?.slickGoTo(itemIndex);
    };

    const handleChange = (v, product) => {
        if (v > 1 || (v > 0 && (!product.size || product.qty < 1))) return;
        const existingQty = bagItems[product.id]?.qty || 0;
        const updatedTotal = totalTryItems - existingQty + v;

        if (updatedTotal > 4) {
            return;
        }

        const payload = { ...product, qty: v, selectedSize: product.size };
        if (v >= 1) {
            dispatch({ type: 'ADD_PRODUCT', payLoad: [product.id, payload] });
        } else {
            dispatch({ type: 'DELETE_PRODUCT', payLoad: [product.id] });
        }
        props.setPageRefresh(!props.pageRefresh);
    };

    const handleSizeChange = (event) => {
        const newIndex = Number(event.target.value);
        setIndex(newIndex);
        setActiveImgIndex(0);
        sldr.current?.slickGoTo(0);
    };

    const distinctColors = Array.from(new Set((props.productList || []).map((v) => v.color).filter(Boolean)));
    const sizesForCurrentColor = (props.productList || []).filter((v) => v.color === product?.color);

    const handleColorClick = (chosenColor) => {
        const matchingCurrentSizeInStock = props.productList.findIndex(
            (v) => v.color === chosenColor && v.size === product.size && v.qty > 0
        );
        if (matchingCurrentSizeInStock >= 0) {
            setIndex(matchingCurrentSizeInStock);
            setActiveImgIndex(0);
            sldr.current?.slickGoTo(0);
            return;
        }
        const firstInStockOfColor = props.productList.findIndex(
            (v) => v.color === chosenColor && v.qty > 0
        );
        if (firstInStockOfColor >= 0) {
            setIndex(firstInStockOfColor);
            setActiveImgIndex(0);
            sldr.current?.slickGoTo(0);
            return;
        }
        const anyOfColor = props.productList.findIndex((v) => v.color === chosenColor);
        if (anyOfColor >= 0) {
            setIndex(anyOfColor);
            setActiveImgIndex(0);
            sldr.current?.slickGoTo(0);
        }
    };

    const handleSizeSelect = (chosenVariantId) => {
        const target = props.productList.findIndex((v) => v.id === chosenVariantId);
        if (target >= 0) {
            setIndex(target);
        }
    };

    const show = () => {
        return items.map((item, itemIndex) => (
            <div
                key={item + '-' + itemIndex}
                onClick={() => handleThumbnailClick(itemIndex)}
                className={`pdp-thumbnail-item ${activeImgIndex === itemIndex ? 'active' : ''}`}
                title={`View image ${itemIndex + 1}`}
            >
                <img src={imageUrl(item)} alt="" className="pdp-thumbnail-img" />
            </div>
        ));
    };

    const productde = () => {
        return items.map((item, itemIndex) => (
            <div key={item + '-' + itemIndex} style={{ width: '100%', height: '100%', outline: 'none' }}>
                <img src={imageUrl(item)} alt={product.productid?.productname || 'Product'} className="pdp-main-image" />
            </div>
        ));
    };

    const handlePostReview = async () => {
        if (!userComment) {
            alert('Please write your review comment.');
            return;
        }

        const res = await postData('submit_product_review', {
            product_details_id: product.id,
            user_mobile: currentUser?.mobileno || 'Guest',
            user_name: currentUser?.fname ? `${currentUser.fname} ${currentUser.lname}` : 'Customer',
            rating: userRating,
            review_text: userComment,
        });

        if (res && res.status) {
            alert('Review posted successfully!');
            setUserComment('');
            setReviewModalOpen(false);
            loadReviews();
        } else {
            alert(res?.message || 'Unable to post review right now. (Only verified buyers who completed a trial purchase can review)');
        }
    };

    const effectivePrice = product.offerprice > 0 && product.offerprice <= product.price ? product.offerprice : product.price;
    const hasDiscount = product.price > effectivePrice;
    const discountPercent = hasDiscount ? Math.round(((product.price - effectivePrice) / product.price) * 100) : 0;
    const isOutOfStock = product.qty < 1 || !product.size;

    const productdetails = () => {
        if (product && product.productid) {
            return (
                <div style={styles.details}>
                    <div style={styles.brandName}>{product.brandid?.brandname}</div>
                    <div style={styles.productName}>{product.productid?.productname}</div>
                    {product.description && (
                        <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                            {product.description}
                        </div>
                    )}
                    
                    {/* RATING DISPLAY */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                        {(product.total_reviews > 0 || reviewsList.length > 0) ? (
                            <>
                                <Rating value={Number(product.avg_rating || 0)} precision={0.5} readOnly size="small" />
                                <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#f59e0b' }}>
                                    {(product.avg_rating || 0).toFixed(1)}
                                </span>
                                <span style={{ fontSize: '13px', color: '#6b7280' }}>
                                    ({product.total_reviews || reviewsList.length} Verified Customer Reviews)
                                </span>
                            </>
                        ) : (
                            <span style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>
                                No reviews yet
                            </span>
                        )}
                    </div>

                    {/* PRICING WITH REAL-WORLD MRP & DISCOUNT BADGE */}
                    <div style={{ marginTop: '16px', display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '28px', fontWeight: 800, color: '#111827' }}>
                            ₹{effectivePrice}
                        </span>
                        {hasDiscount && (
                            <>
                                <span style={{ fontSize: '18px', color: '#9ca3af', textDecoration: 'line-through' }}>
                                    ₹{product.price}
                                </span>
                                <span style={{
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    color: '#15803d',
                                    backgroundColor: '#dcfce7',
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                }}>
                                    {discountPercent}% OFF
                                </span>
                            </>
                        )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                        MRP inclusive of all taxes • Pay at doorstep only if you decide to buy
                    </div>

                    {/* REAL-WORLD COLOR SELECTOR */}
                    {distinctColors.length > 0 && (
                        <div style={{ marginTop: '20px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                                Color: <span style={{ fontWeight: 700, color: '#111827' }}>{product.color}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {distinctColors.map((colorName) => {
                                    const isSelected = product.color === colorName;
                                    const colorVariants = props.productList.filter((v) => v.color === colorName);
                                    const hasStock = colorVariants.some((v) => v.qty > 0);
                                    const previewImg = colorVariants[0]?.icon?.split(',')[0] || '';
                                    return (
                                        <button
                                            key={colorName}
                                            type="button"
                                            onClick={() => handleColorClick(colorName)}
                                            style={{
                                                padding: '4px 12px 4px 6px',
                                                borderRadius: '24px',
                                                border: isSelected ? '2px solid #111827' : '1px solid #d1d5db',
                                                backgroundColor: isSelected ? '#111827' : '#ffffff',
                                                color: isSelected ? '#ffffff' : '#374151',
                                                fontSize: '13px',
                                                fontWeight: isSelected ? 700 : 500,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                opacity: hasStock ? 1 : 0.6,
                                                transition: 'all 0.15s ease-in-out',
                                                boxShadow: isSelected ? '0 2px 5px rgba(0,0,0,0.12)' : 'none',
                                            }}
                                        >
                                            {previewImg ? (
                                                <img
                                                    src={imageUrl(previewImg)}
                                                    alt={colorName}
                                                    style={{
                                                        width: '24px',
                                                        height: '24px',
                                                        borderRadius: '50%',
                                                        objectFit: 'cover',
                                                        border: isSelected ? '1px solid #ffffff' : '1px solid #e5e7eb',
                                                    }}
                                                />
                                            ) : (
                                                <span
                                                    style={{
                                                        width: '12px',
                                                        height: '12px',
                                                        borderRadius: '50%',
                                                        backgroundColor: colorName.toLowerCase(),
                                                        border: '1px solid rgba(0,0,0,0.2)',
                                                        display: 'inline-block',
                                                    }}
                                                />
                                            )}
                                            {colorName}
                                            {!hasStock && ' (Out of stock)'}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* REAL-WORLD SIZE PILLS & INVENTORY STATUS */}
                    <div style={{ marginTop: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                                Select Size: <span style={{ fontWeight: 700, color: '#111827' }}>{product.size || 'None'}</span>
                            </span>
                            {product.qty > 0 && product.qty <= 3 && (
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#d97706' }}>
                                    🔥 Only {product.qty} left in stock!
                                </span>
                            )}
                            {product.qty < 1 && (
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626' }}>
                                    Out of Stock
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {sizesForCurrentColor.map((v) => {
                                const isSelected = v.id === product.id;
                                const isOut = v.qty < 1;
                                return (
                                    <button
                                        key={v.id}
                                        type="button"
                                        disabled={isOut}
                                        onClick={() => handleSizeSelect(v.id)}
                                        style={{
                                            minWidth: '50px',
                                            height: '42px',
                                            padding: '0 14px',
                                            borderRadius: '8px',
                                            border: isSelected ? '2px solid #111827' : '1px solid #d1d5db',
                                            backgroundColor: isSelected ? '#111827' : isOut ? '#f3f4f6' : '#ffffff',
                                            color: isSelected ? '#ffffff' : isOut ? '#9ca3af' : '#111827',
                                            fontWeight: 700,
                                            fontSize: '14px',
                                            cursor: isOut ? 'not-allowed' : 'pointer',
                                            textDecoration: isOut ? 'line-through' : 'none',
                                            transition: 'all 0.15s ease-in-out',
                                        }}
                                    >
                                        {v.size}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* QUICK SELECT DROPDOWN (Accessible & backwards compatible) */}
                    <div style={{ marginTop: '16px' }}>
                        <FormControl variant="standard" sx={{ minWidth: 200 }}>
                            <InputLabel id="demo-simple-select-standard-label">All Available Variants</InputLabel>
                            <Select
                                labelId="demo-simple-select-standard-label"
                                id="demo-simple-select-standard"
                                value={index}
                                onChange={handleSizeChange}
                                label="Variant"
                            >
                                {(props.productList || []).map((variant, variantIndex) => (
                                    <MenuItem key={variant.id} value={variantIndex} disabled={variant.qty < 1 || !variant.size}>
                                        {variant.size} / {variant.color}{variant.qty < 1 ? ' — Out of stock' : ''}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </div>

                    {/* TRY BAG STATUS BADGE */}
                    {bagItems[product.id]?.qty >= 1 && (
                        <div style={{
                            marginTop: '14px',
                            padding: '6px 12px',
                            backgroundColor: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            borderRadius: '6px',
                            color: '#065f46',
                            fontSize: '13px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}>
                            ✓ Added to Try Bag ({product.size} / {product.color})
                        </div>
                    )}

                    <div style={styles.plusMinus}>
                        <PlusMinusComponent
                            value={bagItems[product.id]?.qty || 0}
                            onChange={(v) => handleChange(v, product)}
                            addLabel="Add to Try Bag"
                            disableIncrement={totalTryItems >= 4 || isOutOfStock || bagItems[product.id]?.qty >= 1}
                            helperText={product.qty < 1 ? 'This variant is out of stock.' : !product.size ? 'Size unavailable.' : 'Choose up to 4 variants, one piece of each.'}
                        />
                    </div>
                    <div className="pdp-guarantee-card">
                        <div className="pdp-guarantee-item">
                            <LocalShippingOutlinedIcon style={{ fontSize: 20, color: '#0f172a', flexShrink: 0, marginTop: 2 }} />
                            <div>
                                <strong>Doorstep Try & Buy:</strong> Choose up to 4 items to try at home. Verified delivery partners confirm timing by call.
                            </div>
                        </div>
                        <div className="pdp-guarantee-item">
                            <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>💵</span>
                            <div>
                                <strong>Cash on Delivery:</strong> Retained items ka price pay karein. Zero-purchase orders par applicable trial fee lag sakti hai; unselected items rider ko turant return karein.
                            </div>
                        </div>
                    </div>

                    {/* CUSTOMER REVIEWS SECTION */}
                    <div style={{ marginTop: '30px', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Customer Reviews & Ratings</h3>
                            <button
                                onClick={() => setReviewModalOpen(!reviewModalOpen)}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#111827',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                }}
                            >
                                Write a Review
                            </button>
                        </div>

                        {reviewModalOpen && (
                            <div style={{ backgroundColor: '#f9fafb', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
                                <h4 style={{ margin: '0 0 10px 0' }}>Write Your Review</h4>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                    <label style={{ fontWeight: 'bold' }}>Rating: </label>
                                    <Rating
                                        name="user-review-rating"
                                        value={userRating}
                                        onChange={(e, val) => {
                                            if (val) setUserRating(val);
                                        }}
                                        size="medium"
                                    />
                                </div>
                                <textarea
                                    rows={3}
                                    placeholder="Tell us about fabric, fitting, and trial experience..."
                                    value={userComment}
                                    onChange={(e) => setUserComment(e.target.value)}
                                    style={{ width: '96%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginBottom: '10px' }}
                                />
                                <div>
                                    <button
                                        onClick={handlePostReview}
                                        style={{ padding: '8px 16px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginRight: '8px' }}
                                    >
                                        Post Review
                                    </button>
                                    <button
                                        onClick={() => setReviewModalOpen(false)}
                                        style={{ padding: '8px 16px', backgroundColor: '#9ca3af', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {reviewsList.length === 0 ? (
                                <p style={{ color: '#6b7280', fontSize: '14px' }}>No reviews posted yet. Be the first to review after trying!</p>
                            ) : (
                                reviewsList.map((rev) => (
                                    <div key={rev.id} style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 'bold', color: '#111827' }}>{rev.user_name}</span>
                                            <Rating value={Number(rev.rating || 5)} readOnly size="small" />
                                        </div>
                                        <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#374151' }}>{rev.review_text}</p>
                                    </div>
                                ))
                            )}
                        </div>

                    </div>
                </div>
            );
        } else {
            return <p>No variants are available for this product yet.</p>;
        }
    };
    const styles = {
        mainContainer: {
            display: 'flex',
            flexDirection: sm_matches ? 'column' : 'row',
            alignItems: sm_matches ? 'center' : 'flex-start',
            justifyContent: 'center',
            margin: '20px 0',
            padding: '0 20px',
        },
        thumbnailContainer: {
            display: 'flex',
            flexDirection: sm_matches ? 'row' : 'column',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginBottom: '20px',
            marginRight: sm_matches ? 0 : '20px',
        },
        sliderContainer: {
            width: '100%',
            maxWidth: '600px',
            position: 'relative',
            marginBottom: '20px',
            marginLeft: sm_matches ? '70px' : '165px'
        },
        detailsContainer: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: sm_matches ? 'center' : 'flex-start',
            width: '100%',
            maxWidth: '600px',
            marginLeft: sm_matches ? 0 : '20px',
        },
        thumbnail: {
            margin: '5px',
        },
        thumbnailImage: {
            width: '50px',
            height: '50px',
            objectFit: 'cover',
        },
        productImage: {
            width: '80%',
            height: 'auto',
        },
        arrowLeft: {
            cursor: 'pointer',
            position: 'absolute',
            left: '-3%',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 2,
        },
        arrowRight: {
            cursor: 'pointer',
            position: 'absolute',
            right: '17%',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 2,
        },
        arrowIcon: {
            color: 'grey',
            fontSize: '24px',
        },
        details: {
            textAlign: 'left',
            width: '100%',
        },
        productName: {
            fontSize: '24px',
            fontWeight: 'bold',
        },
        brandName: {
            fontSize: '18px',
            color: 'grey',
        },
        color: {
            fontSize: '16px',
        },
        price: {
            fontSize: '18px',
            marginTop: '10px',
        },
        size: {
            marginTop: '20px',
        },
        plusMinus: {
            marginTop: '20px',
        },
        delivery: {
            marginTop: '20px',
            fontSize: '14px',
        },
    };
    

    return (
        <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header />
            <div className="pdp-page-container">
                <div className="pdp-main-layout">
                    <div className="pdp-gallery-section">
                        <div className="pdp-thumbnails-list">
                            {show()}
                        </div>
                        <div className="pdp-slider-viewport">
                            {!sm_matches && items.length > 1 && (
                                <button
                                    type="button"
                                    className="pdp-arrow-btn pdp-arrow-prev"
                                    onClick={handlePrevious}
                                    aria-label="Previous product image"
                                >
                                    <ArrowBackIosNewIcon fontSize="small" />
                                </button>
                            )}
                            <Slider ref={sldr} {...settings}>
                                {productde()}
                            </Slider>
                            {!sm_matches && items.length > 1 && (
                                <button
                                    type="button"
                                    className="pdp-arrow-btn pdp-arrow-next"
                                    onClick={handleNext}
                                    aria-label="Next product image"
                                >
                                    <ArrowForwardIosIcon fontSize="small" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="pdp-details-panel">
                        {productdetails()}
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
