import { useRef } from 'react';
import Slider from 'react-slick';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import imageUrl from '../../services/imageUrl';
import './StorefrontCarousels.css';

export default function SubcategoryComponent({ data = [], onItemClick }) {
  const theme = useTheme();
  const small = useMediaQuery(theme.breakpoints.down('sm'));
  const medium = useMediaQuery(theme.breakpoints.down('md'));
  const slider = useRef(null);
  const count = Math.min(data.length, small ? 1 : medium ? 2 : 4);

  if (!data.length) return null;

  return (
    <div className="home-subcategories">
      {!small && data.length > count && (
        <button
          type="button"
          aria-label="Previous categories"
          className="category-arrow category-prev"
          onClick={() => slider.current?.slickPrev()}
        >
          <ArrowBackIosNewIcon fontSize="small" />
        </button>
      )}
      <Slider
        ref={slider}
        dots={data.length > count}
        infinite={data.length > count}
        speed={500}
        slidesToShow={count}
        slidesToScroll={1}
        arrows={false}
      >
        {data.map((item) => (
          <div key={item.id} className="category-card-wrapper">
            <div
              className="category-card"
              role="button"
              tabIndex={0}
              onClick={() => onItemClick?.(item)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onItemClick?.(item);
                }
              }}
            >
              <div className="category-card-img-wrap">
                <img src={imageUrl(item.icon)} alt={item.subcategoryname} loading="lazy" />
              </div>
              <div className="category-title">{item.subcategoryname}</div>
            </div>
          </div>
        ))}
      </Slider>
      {!small && data.length > count && (
        <button
          type="button"
          aria-label="Next categories"
          className="category-arrow category-next"
          onClick={() => slider.current?.slickNext()}
        >
          <ArrowForwardIosIcon fontSize="small" />
        </button>
      )}
    </div>
  );
}
