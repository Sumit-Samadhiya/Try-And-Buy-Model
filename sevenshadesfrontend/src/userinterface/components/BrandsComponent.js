import imageUrl from '../../services/imageUrl';
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useTheme } from '@mui/material/styles';
import UseMediaQuery from '@mui/material/useMediaQuery';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { useRef } from 'react';
import './StorefrontCarousels.css';

export default function BrandsComponent(props) {
    const theme = useTheme();
    const sm_matches = UseMediaQuery(theme.breakpoints.down('sm'));
    const md_matches = UseMediaQuery(theme.breakpoints.down('md'));
    const sldr = useRef(null);

    const settings = {
        dots: false,
        infinite: (props.data || []).length > 5,
        speed: 500,
        slidesToShow: sm_matches ? 2 : md_matches ? 3 : 5,
        slidesToScroll: 1,
        arrows: false,
        autoplay: true,
        autoplaySpeed: 3500,
    };

    const handlePrevious = () => {
        sldr.current?.slickPrev();
    };

    const handleNext = () => {
        sldr.current?.slickNext();
    };

    const data = props.data || [];
    if (!data.length) return null;

    const showAllItems = () => {
        return data.map((item) => {
            return (
                <div key={item.id} className="brand-card-item">
                    <div
                        className="brand-card"
                        onClick={() => props?.onItemClick && props.onItemClick(item)}
                        role="button"
                        tabIndex={0}
                        title={item.brandname || 'Brand'}
                    >
                        <img
                            src={imageUrl(item.icon)}
                            alt={item.brandname || ''}
                            loading="lazy"
                        />
                    </div>
                </div>
            );
        });
    };

    return (
        <div className="home-brands-wrapper">
            {!sm_matches && data.length > 4 && (
                <button
                    type="button"
                    className="category-arrow category-prev"
                    onClick={handlePrevious}
                    aria-label="Previous brands"
                    style={{ left: -16, top: '50%', transform: 'translateY(-50%)' }}
                >
                    <ArrowBackIosNewIcon fontSize="small" />
                </button>
            )}

            <Slider ref={sldr} {...settings}>
                {showAllItems()}
            </Slider>

            {!sm_matches && data.length > 4 && (
                <button
                    type="button"
                    className="category-arrow category-next"
                    onClick={handleNext}
                    aria-label="Next brands"
                    style={{ right: -16, top: '50%', transform: 'translateY(-50%)' }}
                >
                    <ArrowForwardIosIcon fontSize="small" />
                </button>
            )}
        </div>
    );
}