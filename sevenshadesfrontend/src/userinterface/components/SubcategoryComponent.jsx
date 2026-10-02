import { useRef, useEffect } from 'react';
import Slider from 'react-slick';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { responsiveImage } from '../../services/imageUrl';
import './StorefrontCarousels.css';

export default function SubcategoryComponent({ data = [], onItemClick }) {
  const theme = useTheme();
  const small = useMediaQuery(theme.breakpoints.down('sm'));
  const medium = useMediaQuery(theme.breakpoints.down('md'));
  const slider = useRef(null);
  const container = useRef(null);
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const sync = () => root.querySelectorAll('.slick-slide').forEach(slide => {
      const hidden = slide.getAttribute('aria-hidden') === 'true';
      slide.inert = hidden;
      slide.querySelectorAll('[role="button"]').forEach(button => button.tabIndex = hidden ? -1 : 0);
    });
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-hidden'] });
    return () => observer.disconnect();
  }, [data, small, medium]);
  const count = Math.min(data.length, small ? 1 : medium ? 2 : 4);

  if (!data.length) return null;

  return (
    <div ref={container} className="home-subcategories">
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
        dots={small ? data.length > 1 : Math.ceil(data.length / count) > 1}
        infinite={data.length > count}
        speed={500}
        slidesToShow={count}
        slidesToScroll={small ? 1 : count}
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
                <img {...responsiveImage(item.icon, "(max-width: 600px) 100vw, (max-width: 900px) 50vw, 25vw")} width="480" height="640" alt={item.subcategoryname} loading="lazy" decoding="async" />
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
