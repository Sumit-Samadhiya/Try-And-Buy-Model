import imageUrl from '../../services/imageUrl';
import * as React from 'react';
import { useState,useEffect } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import {Button,Badge} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import { Divider,Grid } from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import SearchBarComponent from './SearchBarComponent';
import {useTheme} from '@mui/material/styles';
import UseMediaQuery from '@mui/material/useMediaQuery';
import DrawerComponent from './DrawerComponent';
import { postData } from '../../services/FetchDjangoApiServices';
import {useSelector} from 'react-redux';
import { useNavigate } from 'react-router-dom';
export default function Header() {
    const theme=useTheme()
    var products=useSelector(state=>state.product)
    var keys=Object.values(products)
    var user=useSelector(state=>state.user)
    var userData={}
    try{
    var userData=Object.values(user)[0]
    }
    catch(e){}
    var navigate=useNavigate()
    const md_matches=UseMediaQuery(theme.breakpoints.down('md'));
    const sm_matches=UseMediaQuery(theme.breakpoints.down('sm'));
    const [open,setOpen]=useState(false)
    const [subCategoryList,setSubCategoryList]=useState([])
    const [backgroundColor,setBgStatus]=useState([])
    const [brandList,setBrandList]=useState([])
    const [statusSubMenu,setStatusSubMenu]=useState(false)

    const fetchAllSubCategory=async(id)=>{
      var result=await postData('user_mysubcategory_list_by_maincategoryid',{maincategoryid:id})
     
      setSubCategoryList(result.data)
      setBgStatus(id)
    } 
    
    const fetchAllBrands=async(sid)=>{
      var result=await getBrandsByCategory(sid)
      setBrandList(result)
      
    }

    const getBrandsByCategory=async(sid)=>{
      var productsByCategory = await postData('user_products_maincategory',{maincategoryid:backgroundColor})
      var filteredProducts = (productsByCategory?.data || []).filter((item)=>item?.subcategoryid?.id===sid)
      const uniqueBrand = {}
      filteredProducts.forEach((item)=>{
        if(item?.brandid?.id){
          uniqueBrand[item.brandid.id] = item.brandid
        }
      })
      return Object.values(uniqueBrand)
    }
    const handleDrawerOpen=()=>{
        setOpen(true)
    }
    useEffect(function(){
         fetchAllSubCategory(5)
    },[])
    const showAllSubCategory=()=>{
      return subCategoryList.map((item)=>{
        return <div  onMouseOver={()=>handleSubMenu(item)} style={{marginRight:20}}>{item.subcategoryname}
         
        </div>
       
      })
     
    }

    const showAllBrands=()=>{
      return brandList.map((item)=>{
        return <div style={{padding:5,display:'flex',justifyContent:'space-between'}}><span><img src={imageUrl(item?.icon)} alt='' style={{width:30,height:30,}}/></span><span>{item?.brandname}</span>
         
        </div>
       
      })
     
    }
    const handleSubMenu=(item)=>{
      fetchAllBrands(item.id)
      setStatusSubMenu(true)
    

    }
    const handleGotoCartPage=()=>{
      navigate('/mybagdisplay')

    }
    const handleLoginPage=()=>{
      if(userData?.mobileno){
        navigate('/profile')
      } else {
        navigate('/signindisplay')
      }
    }
    const showSubMenu=()=>{
      return(<div onMouseLeave={()=>setStatusSubMenu(false)} style={{width:'60%',height:300,background:'white',position:'absolute',zIndex:2,left:100,top:115,padding:15}} >
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <div style={{fontWeight:'bold',color:'#95a5a6',letterSpacing:1}}>
              SHOP BY PRODUCT
              <Divider/>
            </div>
          </Grid>

          <Grid item xs={4}>
            <div style={{fontWeight:'bold',color:'#95a5a6',letterSpacing:1}} >
              SHOP BY BRAND
              <Divider/>
              <div style={{display:'flex',flexDirection:'column'}}>
                {showAllBrands()}
              </div>
            </div>
          </Grid>

          <Grid item xs={4}>
            <div style={{fontWeight:'bold',color:'#95a5a6',letterSpacing:1}}>
              SHOP BY CATEGORY
              <Divider/>
            </div>
          </Grid>
        </Grid>
      </div>)
    }
  return (
    <Box sx={{ flexGrow: 1,}}>
      <AppBar style={{background:'#2d2d2d'}} position="static">
        <Toolbar>
         {sm_matches? <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={handleDrawerOpen}
          >
            <MenuIcon />
          </IconButton>  : null}
          <Typography style={{fontFamily:'League Gothic',fontSize:32,letterSpacing:1,cursor:'pointer'}} variant="h6" component="div" sx={{ }}>
            SevenShades
          </Typography>
          {sm_matches?null:
          <div style={{display:'flex',alignItems:'center',  justifyContent:'space-evenly',width:250}}>
        
          <Button style={{fontFamily:'Oswald',fontSize:20,background:backgroundColor==5?"#485460":"#2d2d2d"}}onMouseOver={()=>fetchAllSubCategory(5)} color="inherit">Men</Button>
          <Button style={{fontFamily:'Oswald',fontSize:20,background:backgroundColor==4?"#485460":"#2d2d2d"}} color="inherit" onMouseOver={()=>fetchAllSubCategory(4)}>Women</Button>
          </div>}
         {md_matches?<div></div>:<SearchBarComponent/>}
          <div style={{marginLeft:'auto',width:150,display:'flex',alignItems:'center',justifyContent:'space-evenly',cursor:'pointer'}} >
           <div style={{display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center'}}>
            <PersonOutlineIcon onClick={handleLoginPage} style={{fontSize:30}}/>
          <div style={{fontSize:'0.7'}}>{userData?.fname}</div>
          </div> 
          <div style={{display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center'}}>
          <Badge badgeContent={keys.length} color="primary">
          <ShoppingBagOutlinedIcon onClick={handleGotoCartPage} style={{fontSize:26}}/> 
          </Badge>
          <div style={{fontSize:'0.7rem'}}>Try Bag</div>
          </div>
          
          </div>
        </Toolbar>
      </AppBar>
      {md_matches?null:
      <div style={{background:'#485460',height:55,color:'white',display:'flex',alignItems:'center'}} >
        <Toolbar>
          <div   style={{display:'flex'}}>
            {showAllSubCategory()}
          </div>
        </Toolbar>
        
        </div>}
      <DrawerComponent open={open} setOpen={setOpen}/>
      {statusSubMenu?showSubMenu():null}
    </Box>
  );
}