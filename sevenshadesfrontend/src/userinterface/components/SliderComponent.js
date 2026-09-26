import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import imageUrl from '../../services/imageUrl';
import './StorefrontCarousels.css';

export default function SliderComponent({ data = [], onBannerClick }) {
  const slides = data
    .map(value => typeof value === 'object' ? value : { image: value })
    .filter(value => value?.image?.trim());
  if (!slides.length) return null;
  return <div className="home-banner">
    <Slider
      dots={slides.length > 1}
      arrows={slides.length > 1}
      infinite={slides.length > 1}
      speed={500}
      slidesToShow={1}
      slidesToScroll={1}
      autoplay={slides.length > 1}
      autoplaySpeed={4000}
      pauseOnHover={true}
    >
      {slides.map((item, index) => {
        const [audience = 'Featured', headline = 'Try it at home', subline = 'Pay only for what you keep'] = String(item.bannerdescription || '').split('|');
        const women = audience.trim().toLowerCase() === 'women';
        return <div key={item.image + index}>
        <button type="button" className={`home-banner-slide ${women ? 'home-banner-slide-women' : 'home-banner-slide-men'}`} onClick={() => onBannerClick?.(item, index)} aria-label={`Shop ${audience.trim()} collection`}>
          <img src={imageUrl(item.image)} alt={`${audience.trim()} fashion collection`} />
          <span className="home-banner-copy">
            <span className="home-banner-eyebrow">SevenShades · Try & Buy</span>
            <strong>{headline.trim()}</strong>
            <span>{subline.trim()}</span>
            <span className="home-banner-cta">Shop {audience.trim()} →</span>
          </span>
        </button>
      </div>})}
    </Slider>
  </div>;
}
