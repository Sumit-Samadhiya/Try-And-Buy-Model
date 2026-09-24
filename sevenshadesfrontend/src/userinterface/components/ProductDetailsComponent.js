import imageUrl from '../../services/imageUrl';
import React, { useState, createRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Header from './Header';
import Footer from './Footer';
import { postData } from '../../services/FetchDjangoApiServices';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
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

export default function ProductDetailsComponent(props) {
    const dispatch = useDispatch();
    const [index, setIndex] = useState(0);
    const theme = useTheme();
    const sm_matches = useMediaQuery(theme.breakpoints.down('sm'));
    const bagItems = useSelector((state) => state.product);
    const totalTryItems = Object.values(bagItems).reduce((total, item) => total + (item.qty > 0 ? 1 : 0), 0);
    const sldr = createRef(null);

    const [reviewsList, setReviewsList] = useState([]);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [userRating, setUserRating] = useState(5);
    const [userComment, setUserComment] = useState('');
    const userState = useSelector((state) => state.user);
    const currentUser = Object.values(userState)[0] || {};

    let product, items;
    try {
        product = props.productList?.[index];
        items = product?.icon?.split(",") || [];
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

    const settings = {
        dots: false,
        infinite: true,
        speed: 500,
        autoPlaySpeed: 3000,
        slidesToShow: 1,
        slidesToScroll: 1,
        arrows: false,
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
        sldr.current.slickPrev();
    };

    const handleNext = () => {
        sldr.current.slickNext();
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
        setIndex(Number(event.target.value));
    };

    const show = () => {
        return items.map((item) => (
            <div key={item} style={styles.thumbnail}>
                <img src={imageUrl(item)} alt="" style={styles.thumbnailImage} />
            </div>
        ));
    };

    const productde = () => {
        return items.map((item) => (
            <div key={item}>
                <div>
                    <img src={imageUrl(item)} alt="" style={styles.productImage} />
                </div>
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
            alert('Unable to post review right now.');
        }
    };

    const productdetails = () => {
        if (product && product.productid) {
            return (
                <div style={styles.details}>
                    <div style={styles.productName}>{product.productid.productname}</div>
                    <div style={styles.brandName}>{product.brandid.brandname}</div>
                    
                    {/* RATING DISPLAY */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                        {(product.total_reviews > 0 || reviewsList.length > 0) ? (
                            <>
                                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b' }}>
                                    ⭐ {(product.avg_rating || 0).toFixed(1)}
                                </span>
                                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                                    ({product.total_reviews || reviewsList.length} Verified Customer Reviews)
                                </span>
                            </>
                        ) : (
                            <span style={{ fontSize: '14px', color: '#9ca3af', fontStyle: 'italic' }}>
                                No reviews yet
                            </span>
                        )}
                    </div>

                    <div style={styles.color}>Color: {product.color}</div>
                    <div style={styles.price}>
                        Reference Value: ₹{product.offerprice > 0 && product.offerprice <= product.price ? product.offerprice : product.price}
                    </div>
                    <div style={styles.size}>
                        <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }}>
                            <InputLabel id="demo-simple-select-standard-label">Size</InputLabel>
                            <Select
                                labelId="demo-simple-select-standard-label"
                                id="demo-simple-select-standard"
                                value={index}
                                onChange={handleSizeChange}
                                label="Size"
                            >
                                {(props.productList || []).map((variant, variantIndex) => (
                                    <MenuItem key={variant.id} value={variantIndex} disabled={variant.qty < 1 || !variant.size}>
                                        {variant.size} / {variant.color}{variant.qty < 1 ? ' — Out of stock' : ''}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </div>
                    <div style={styles.plusMinus}>
                        <PlusMinusComponent
                            value={bagItems[product.id]?.qty || 0}
                            onChange={(v) => handleChange(v, product)}
                            addLabel="Add to Try Bag"
                            disableIncrement={totalTryItems >= 4 || product.qty < 1 || !product.size || bagItems[product.id]?.qty >= 1}
                            helperText={product.qty < 1 ? 'This variant is out of stock.' : !product.size ? 'Size unavailable.' : 'Choose up to 4 variants, one piece of each.'}
                        />
                    </div>
                    <div style={styles.delivery}>
                        <p><LocalShippingOutlinedIcon /> Home trial available with call-based timing confirmation.</p>
                        <p>First try is free. Repeat try fee gets credited to wallet when you buy any item.</p>
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
                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ fontWeight: 'bold', marginRight: '10px' }}>Rating: </label>
                                    <select
                                        value={userRating}
                                        onChange={(e) => setUserRating(Number(e.target.value))}
                                        style={{ padding: '6px', borderRadius: '4px' }}
                                    >
                                        <option value={5}>5 Stars - Excellent</option>
                                        <option value={4}>4 Stars - Good</option>
                                        <option value={3}>3 Stars - Average</option>
                                        <option value={2}>2 Stars - Poor</option>
                                        <option value={1}>1 Star - Terrible</option>
                                    </select>
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
                                            <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{'⭐'.repeat(rev.rating)}</span>
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
        <div>
            <Header />
            <div style={styles.mainContainer}>
                <div style={styles.thumbnailContainer}>
                    {show()}
                </div>
                <div style={styles.sliderContainer}>
                    {!sm_matches && (
                        <div style={styles.arrowLeft} onClick={handlePrevious}>
                            <ArrowBackIosNewIcon style={styles.arrowIcon} />
                        </div>
                    )}
                    <Slider ref={sldr} {...settings}>
                        {productde()}
                    </Slider>
                    {!sm_matches && (
                        <div style={styles.arrowRight} onClick={handleNext}>
                            <ArrowForwardIosIcon style={styles.arrowIcon} />
                        </div>
                    )}
                </div>
                <div style={styles.detailsContainer}>
                    {productdetails()}
                </div>
            </div>
            <Footer />
        </div>
    );
}

