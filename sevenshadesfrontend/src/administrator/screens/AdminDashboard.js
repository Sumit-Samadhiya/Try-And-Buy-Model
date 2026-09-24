import PaymentRecovery from './PaymentRecovery';
import { useState } from 'react';
import { Box, Button, Chip, Drawer, IconButton, List, ListItemButton, ListItemText, ThemeProvider, Toolbar, Typography, createTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { logout } from '../../services/FetchDjangoApiServices';
import useOrderEvents from '../../services/useOrderEvents';
import InventoryReturns from './InventoryReturns';
import { SalesReport, SupportTickets } from './AdminReports';
import Category from './Category';
import DisplayAllCategory from "./DisplayAllCategory"
import MySubCategory from './MySubCategory'
import DisplayAllSubCategory from './DisplayAllSubCategory'
import Brand from './Brand'
import DisplayAllBrand from './DisplayAllBrand'
import Product from './Product'
import DisplayAllProduct from './DisplayAllProduct'
import ProductDetails from './ProductDetails';
import DisplayProductDetails from './DisplayProductDetails';
import Banner from './Banner';
import DeliveryOps from './DeliveryOps';
import DisplayAllOrders from './DisplayAllOrders';
import Dashboard from './Dashboard';




const theme=createTheme({palette:{primary:{main:'#315c4d'},background:{default:'#f4f6f5'}},typography:{fontFamily:'Arial, sans-serif'},shape:{borderRadius:12},components:{MuiTableCell:{styleOverrides:{head:{background:'#f3f5f4',fontWeight:700,whiteSpace:'nowrap'},body:{borderColor:'#eef0ee'}}},MuiButton:{styleOverrides:{root:{textTransform:'none',fontWeight:600}}}}});
const sections=[['OVERVIEW',[['Quick Dashboard','dashboard'],['Sales Report','sales'],['Support Tickets','tickets']]],['OPERATIONS',[['Orders','orders'],['Payment recovery','payment-recovery'],['Delivery Ops','deliveryops'],['Returns & Stock','returns']]],['CATALOG',[['Categories','category'],['Subcategories','subcategory'],['Brands','brand'],['Products','product'],['Product Variants','productdetails'],['Banners','banner']]]];
export default function AdminDashboard(){
 const navigate=useNavigate(),location=useLocation();const [open,setOpen]=useState(false),[notice,setNotice]=useState('');
 useOrderEvents(event=>{if(['order_created','trial_payment_captured'].includes(event.reason))setNotice(event.order_id);});
 const current=location.pathname.split('/')[2]||'dashboard';
 const sidebar=<Box sx={{height:'100%',bgcolor:'#22372f',color:'#fff',p:2}}><Typography variant="h5" fontWeight={800} sx={{px:1,pt:2}}>SevenShades</Typography><Typography variant="overline" sx={{px:1,color:'#b9cabe'}}>ADMIN WORKSPACE</Typography>{sections.map(([heading,items])=><Box key={heading} sx={{mt:3}}><Typography variant="caption" sx={{px:1,color:'#9cb4a5',letterSpacing:1.5}}>{heading}</Typography><List dense>{items.map(([label,to])=><ListItemButton key={to} selected={current===to} onClick={()=>{navigate('/admindashboard/'+to);setOpen(false);}} sx={{borderRadius:2,mb:.5,'&.Mui-selected':{bgcolor:'#ffffff20',color:'#fff'},'&:hover':{bgcolor:'#ffffff12'}}}><ListItemText primary={label}/></ListItemButton>)}</List></Box>)}</Box>;
 return <ThemeProvider theme={theme}><Box sx={{display:'flex',minHeight:'100vh',bgcolor:'#f4f6f5'}}><Box component="nav" sx={{width:{md:240},flexShrink:0}}><Drawer variant="permanent" sx={{display:{xs:'none',md:'block'},'& .MuiDrawer-paper':{width:240,border:0}}}>{sidebar}</Drawer><Drawer open={open} onClose={()=>setOpen(false)} sx={{'& .MuiDrawer-paper':{width:240}}}>{sidebar}</Drawer></Box><Box sx={{flex:1,minWidth:0}}><Toolbar sx={{bgcolor:'white',borderBottom:'1px solid #e3e8e4',gap:2,position:'sticky',top:0,zIndex:100}}><IconButton sx={{display:{md:'none'}}} aria-label="Open admin menu" onClick={()=>setOpen(true)}><MenuIcon/></IconButton><Typography sx={{flex:1,fontWeight:700}}>Store administration</Typography><Chip size="small" label="Admin"/><Button onClick={async()=>{const result=await logout();if(result.status)navigate('/adminlogin');else setNotice(result.message);}}>Sign out</Button></Toolbar>{notice&&<Button fullWidth onClick={()=>{navigate('/admindashboard/orders');setNotice('');}}>New activity: {notice} · Review orders</Button>}<Box component="main" sx={{p:{xs:2,md:4},maxWidth:1800,mx:'auto'}}><Routes><Route path="payment-recovery" element={<PaymentRecovery/>}/><Route index element={<Navigate to="dashboard" replace/>}/><Route path="sales" element={<SalesReport/>}/><Route path="tickets" element={<SupportTickets/>}/><Route element={<InventoryReturns />} path="/returns" />
                        <Route element={<Category />} path='/category'></Route>
                        <Route element={<DisplayAllCategory />} path='/displayallcategory'></Route>
                        <Route element={<MySubCategory />} path="/subcategory" />
                        <Route element={<DisplayAllSubCategory />} path="/displayallsubcategory" />
                        <Route element={<Brand />} path='/brand' />
                        <Route element={<DisplayAllBrand />} path='/displayallbrand' />
                        <Route element={<Product />} path='/product' />
                        <Route element={<DisplayAllProduct />} path='/displayallproduct' />
                        <Route element={<ProductDetails />} path="/productdetails" />
                        <Route element={<DisplayProductDetails />} path="/displayproductdetails" />
                        <Route element={<Banner />} path="/banner" />
                        <Route element={<DeliveryOps />} path="/deliveryops" />
                        <Route element={<DisplayAllOrders />} path="/orders" />
                        <Route element={<Dashboard />} path="/dashboard" />
                    <Route path="*" element={<Navigate to="/admindashboard/dashboard" replace/>}/></Routes></Box></Box></Box></ThemeProvider>;
}
