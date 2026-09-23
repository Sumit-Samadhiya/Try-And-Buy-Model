


import React from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { serverURL } from "../../services/FetchDjangoApiServices";
import {useTheme} from '@mui/material/styles';
import UseMediaQuery from '@mui/material/useMediaQuery';

export default function SliderComponent(props) {

   
  const theme=useTheme()
   
  const sm_matches=UseMediaQuery(theme.breakpoints.down('sm'));
  const md_matches=UseMediaQuery(theme.breakpoints.down('md')) 

  var settings = {
    dots: true,
    infinite: true,
    speed: 500,
                       
    autoPlaySpeed:3000,
    slidesToShow: 1,
    slidesToScroll: 1
  };
  var data=props.data
  const showSlider=()=>{
    return data.map((item,index)=>{
      return <div key={`${item}-${index}`} onClick={()=>props?.onBannerClick && props.onBannerClick(item)} style={{cursor:props?.onBannerClick?'pointer':'default'}}>
        <img src={`${serverURL}/static/${item}`} alt="" style={{width:sm_matches?'100%':'98%',height:'46%'}}/>
        </div>
    })
  }
  return (
    <div style={{width:'100%'}}>
    <Slider {...settings}>
      {showSlider()}
    </Slider>
    </div>
  );
}