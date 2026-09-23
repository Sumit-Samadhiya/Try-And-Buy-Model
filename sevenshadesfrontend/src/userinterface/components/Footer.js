import { Avatar, Grid,} from "@mui/material";

import { serverURL } from "../../services/FetchDjangoApiServices";
import Icons from "./Icons";
import {useTheme} from '@mui/material/styles';
import UseMediaQuery from '@mui/material/useMediaQuery';



export default function Footer() {
    const theme=useTheme()
   
    const sm_matches=UseMediaQuery(theme.breakpoints.down('sm'));
    const md_matches=UseMediaQuery(theme.breakpoints.down('md'))
    
    const foo = () => {
        return (
            <div style={{width:"100%", height: "260px", backgroundColor: "#CECECE", margin: '0 auto', }}>
                <Grid container spacing={2} style={{display:'flex',justifyContent:'center',alignItems:'center',paddingLeft:'50px',paddingRight:'50px'}}>
                    <Grid item xs={3}>
                        
                        <p style={{fontSize:'15px',letterSpacing:"2px",paddingLeft:"10px",fontWeight:'bold'}}>HELP & INFORMATION</p>
                        <p style={{fontSize:"14px",letterSpacing:"1px",paddingLeft:"10px"}}>Help</p>
                        <p style={{fontSize:"14px",letterSpacing:"1px",paddingLeft:"10px"}}>Track</p>
                        <p style={{fontSize:"14px",letterSpacing:"1px",paddingLeft:"10px"}}>Delivery & Returns</p>
                        <p style={{fontSize:"14px",letterSpacing:"1px",paddingLeft:"10px"}}>Sitemap</p>
                        
                    </Grid>

                    <Grid item xs={3}>
                        
                        <p style={{fontSize:'15px',letterSpacing:"2px",paddingLeft:"10px",fontWeight:'bold'}}>ABOUT SEVENSHADES</p>
                        <p style={{fontSize:"14px",letterSpacing:"1px",paddingLeft:"10px"}}>About us</p>
                        <p style={{fontSize:"14px",letterSpacing:"1px",paddingLeft:"10px"}}>Careers at SevenShades</p>
                        <p style={{fontSize:"14px",letterSpacing:"1px",paddingLeft:"10px"}}>Corporate Responsibilities</p>
                        <p style={{fontSize:"14px",letterSpacing:"1px",paddingLeft:"10px"}}>Inverster's Site</p>
                        
                    </Grid>

                    <Grid item xs={3}>
                        
                        <p style={{fontSize:'15px',letterSpacing:"2px",paddingLeft:"10px",fontWeight:'bold'}}>MORE FROM SEVENSHADES</p>
                        <p style={{fontSize:"14px",letterSpacing:"1px",paddingLeft:"10px"}}>Mobile and Sevendhades app</p>
                        <p style={{fontSize:"14px",letterSpacing:"1px",paddingLeft:"10px"}}>SevenShades Marketplace</p>
                        <p style={{fontSize:"14px",letterSpacing:"1px",paddingLeft:"10px"}}>Gift Vouchers</p>
                        
                        
                    </Grid>

                    <Grid item xs={3}>
                        
                        <p style={{fontSize:'15px',letterSpacing:"2px",paddingLeft:"10px",fontWeight:'bold'}}>SHOPPING FROM:</p>
                        <p style={{fontSize:"14px",letterSpacing:"1px",paddingLeft:"10px"}}>Your are in <img src={`${serverURL}/static/india.png` } style={{width:'20px',height:'20px'}} alt=""/></p>
                       
                        
                        
                    </Grid>
                </Grid>

               
               
            </div>
        )
    }

    const foo1 =()=>{
        return(
            <div style={{width:'100%',height:'60px',backgroundColor:"#CECECE",paddingLeft:"5px",paddingRight:'5px'}}>
            <div>
                @ 2024  Company, Inc. All rights reserved.
            </div>
            <div>
                Privacy and Cookies
            </div>

        </div>
        )
    }

    return (

            <div style={{width:"100%"}} >
                <div style={{width:"100%",display:'flex',justifyContent:'center',alignItems:'center',marginBottom:'50px'}}>
                    <Icons/>
                </div>
                {sm_matches?
                <div>
                    {foo1()}
                </div>
                :
                <div>
                {foo()}
                </div>
                }
               
            </div>
            
       
    );
}
