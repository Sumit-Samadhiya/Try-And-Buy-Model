import { serverURL } from "../../services/FetchDjangoApiServices"
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import {useTheme} from '@mui/material/styles';
import UseMediaQuery from '@mui/material/useMediaQuery';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { createRef } from 'react';


export default function BrandsComponent(props){

    const theme=useTheme()
   
    const sm_matches=UseMediaQuery(theme.breakpoints.down('sm'));
    const md_matches=UseMediaQuery(theme.breakpoints.down('md')) 
    var sldr=createRef(null);


    var settings = {
        dots: true,
        infinite: true,
        speed: 500,
                           
        autoPlaySpeed:3000,
       
        slidesToShow: sm_matches?3:md_matches?4:5, 
       
        slidesToScroll: 1,
        arrows:false
      };

      const handlePrevious=()=>{
        sldr.current.slickPrev()
    }
    const handleNext=()=>{
        sldr.current.slickNext()
    }


    var data=props.data
const showAllItems=()=>{
    return data.map((item)=>{
            return <div key={item.id} onClick={()=>props?.onItemClick && props.onItemClick(item)} style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
            <div>
                <img src={`${serverURL}/${item.icon}`} alt="" loading="lazy" style={{width:sm_matches?'50px':'100px',height:sm_matches?'50px':"100px",cursor:'pointer'}} /> 
            </div>
          

        </div>

    })
}

    return( <div style={{width:'90%',position:'relative'}}>
    {sm_matches?null:
    <div style={{cursor:'pointer',position:'absolute',left:'-11%',top:'6%',zIndex:2}} ><ArrowBackIosNewIcon style={{color:'grey',fontSize:'6vw'}} onClick={handlePrevious}/></div>}
    
<Slider ref={sldr} {...settings}>
     {showAllItems()}
     </Slider>
   
    {sm_matches?null:
    <div style={{cursor:'pointer',position:'absolute',right:'-7.5%',top:'6%',zIndex:2}} ><ArrowForwardIosIcon style={{color:'grey',fontSize:'6vw'}} onClick={handleNext}/></div>}

    </div>)
}