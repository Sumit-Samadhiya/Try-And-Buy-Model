import imageUrl from '../../services/imageUrl';
import {Drawer} from '@mui/material'
import { useState,useEffect } from 'react'
import { serverURL,getData } from '../../services/FetchDjangoApiServices'
import { List,ListItemButton,ListItemIcon,ListItemText } from '@mui/material'
export default function DrawerComponent(props){
    const [categoryList,setCategoryList]=useState([])
    const fetchAllCategory=async()=>{
        var result=await getData('user_main_category_list')
        if(result.status)
        setCategoryList(result.data)
    }

    const toggleDrawer=(newOpen)=>()=>{
        props.setOpen(newOpen);
    };
 
    useEffect(function(){
         fetchAllCategory()
    },[])
    const showContent=()=>{
        return categoryList?.map((item)=>{
            return(<ListItemButton> 
                 <ListItemText primary={<div style={{fontSize:20,fontWeight:'bold',letterSpacing:1,textAlign:'start'}}>{item.maincategoryname}</div>} ></ListItemText>
            <ListItemIcon>
            <div><img src={imageUrl(item.icon)} style={{width:60,height:60,borderRadius:10}} alt='' /></div>
            </ListItemIcon>
           
            </ListItemButton>)
        })
    }

    

     return(<div>
         <Drawer open={props.open} onClose={toggleDrawer(false)} >
            <List style={{width:300,bgcolor:'background.paper'}} component="nav">
           {showContent()}
           <ListItemButton> 
                 <ListItemText primary={<div style={{fontSize:20,fontWeight:'bold',letterSpacing:1,textAlign:'start'}}>Your Opinion</div>} ></ListItemText>
            <ListItemIcon>
            <div><img src={`${serverURL}/static/orders.png`} style={{width:60,height:60,borderRadius:10}} alt='' /></div>
            </ListItemIcon>
           
            </ListItemButton>

            <ListItemButton> 
                 <ListItemText primary={<div style={{fontSize:20,fontWeight:'bold',letterSpacing:1,textAlign:'start'}}>Your Profile</div>} ></ListItemText>
            <ListItemIcon>
            <div><img src={`${serverURL}/static/profile.png`} style={{width:60,height:60,borderRadius:10}} alt='' /></div>
            </ListItemIcon>
           
            </ListItemButton>


            <ListItemButton> 
                 <ListItemText primary={<div style={{fontSize:20,fontWeight:'bold',letterSpacing:1,textAlign:'start'}}>LogOut</div>} ></ListItemText>
            <ListItemIcon>
            <div><img src={`${serverURL}/static/logout.png`} style={{width:60,height:60,borderRadius:10}} alt='' /></div>
            </ListItemIcon>
           
            </ListItemButton>
           </List>
         </Drawer>
        </div>)
}