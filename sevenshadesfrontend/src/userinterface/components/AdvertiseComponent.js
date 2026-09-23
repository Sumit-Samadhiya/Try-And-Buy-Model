import { Button } from "@mui/material"
import {useTheme} from '@mui/material/styles';
import UseMediaQuery from '@mui/material/useMediaQuery';

export default function AdvertiseComponent(){
    const theme=useTheme()
   
    const sm_matches=UseMediaQuery(theme.breakpoints.down('sm'));
    const md_matches=UseMediaQuery(theme.breakpoints.down('md')) 
    const fun1=()=>{
        return(<div style={{width:'100%',height:'auto',backgroundColor:'#f5cb42',marginTop:'100px',display:'flex',justifyContent:'center',alignItems:'center',flexDirection:'column',paddingTop:"10px",paddingBottom:"10px"}}>
         <div >
             <Button style={{width:sm_matches?'200px':'300px',height:'60px',borderRadius:'20px',border:sm_matches?'2px solid black':'4px solid black',color:'black',fontSize:sm_matches?'15px':'20px',display:'flex',justifyContent:'center',alignItems:'center'}}>
                The SevenShades App
             </Button>
             </div>
             <div style={{color:'black',fontSize:sm_matches?'20px':'27px',display:'flex',justifyContent:'center',alignItems:'center',fontWeight:sm_matches?'bold':'bolder',marginTop:sm_matches?'5px':'20px',letterSpacing:'1px'}}>
                   Fave Piece Sold Out?
             </div>
                   <div style={{color:'black',fontSize:sm_matches?'20px':'27px',fontWeight:sm_matches?'bold':'bolder',marginTop:sm_matches?'5px':'20px',letterSpacing:'1px',padding:sm_matches?'10px':null}} >
                   Get back in stock alerts on the app
                   </div>
    
                   <div >
             <Button variant='contained' style={{width:'300px',height:'60px',borderRadius:'20px',color:'white',fontSize:'20px',display:'flex',justifyContent:'center',alignItems:'center',backgroundColor:'black',marginTop:sm_matches?'5px':'20px'}}>
                Download Now
             </Button>
             </div>  
             
        
        </div>)
    }
    const fun2=()=>{
       return(<div style={{display:'flex',justifyContent:'center',alignItems:'center',flexDirection:'column',width:'100%',height:'auto'}}>
        <div style={{color:'black',fontSize:sm_matches?'20px':'32px',fontWeight:'bolder',marginTop:'20px',letterSpacing:sm_matches?'1px':'2px'}}>
            Trending Brands
        </div>
        <div>
            
        </div>
         
       </div>)
    }

    return(<div style={{width:"95%"}}>
           <div>
            {fun1()}
         </div>
         <div>
            {fun2()}
         </div>
    </div>)
}