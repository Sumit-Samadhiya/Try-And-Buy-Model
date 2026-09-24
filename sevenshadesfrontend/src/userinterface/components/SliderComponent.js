import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import imageUrl from '../../services/imageUrl';
import './StorefrontCarousels.css';

export default function SliderComponent({ data = [], onBannerClick }) {
  const images = data.map(value => value.trim()).filter(Boolean);
  if (!images.length) return null;
  return <div className="home-banner">
    <Slider dots={images.length > 1} arrows={images.length > 1} infinite={images.length > 1} speed={500} slidesToShow={1} slidesToScroll={1}>
      {images.map((item, index) => <div key={item + index}>
        <button type="button" className="home-banner-slide" onClick={() => onBannerClick?.(item)} aria-label={'Shop banner ' + (index + 1)}>
          <img src={imageUrl(item)} alt={'Featured collection ' + (index + 1)} />
        </button>
      </div>)}
    </Slider>
  </div>;
}
