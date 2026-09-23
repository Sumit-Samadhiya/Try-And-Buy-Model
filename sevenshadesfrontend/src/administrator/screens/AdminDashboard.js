import * as  React from 'react';
import { Grid, Button, TextField, Box, AppBar, Toolbar, Typography } from "@mui/material"
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';

import ListItem from '@mui/material/ListItem';
import CategoryIcon from '@mui/icons-material/Category';
import DashboardIcon from '@mui/icons-material/Dashboard'
// import DashboardIcon from '@mui/icons-material/DashboardIcon';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

import { serverURL } from '../../services/FetchDjangoApiServices';

import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';

import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
// import { useStyles } from './CategoryCss';
import { useStyles } from './AdminDashboardCss'
import YardIcon from '@mui/icons-material/Yard';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import ViewCarouselIcon from '@mui/icons-material/ViewCarousel';
import SummarizeIcon from '@mui/icons-material/Summarize'
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import DeliveryDiningIcon from '@mui/icons-material/DeliveryDining';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
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



export default function AdminDashboard(props) {
    const classes = useStyles();
    const navigate = useNavigate();
    const admin = JSON.parse(localStorage?.getItem("ADMIN"))


    return (
        <Box sx={{ flexGrow: 1 }}>

            <AppBar Position="sticky">
                <Toolbar variant="dense">
                    <Typography variant="h6" color="inherit" component="div">
                        sevenshades
                    </Typography>
                </Toolbar>
            </AppBar>

            <Grid container spaces={3} style={{ paddingInlineStart: 5, marginTop: 40 }}>

                <Grid item xs={2.8}>
                    <Paper>
                        <div className={classes.leftBarStyle}>
                            <img src={`${serverURL}/static/${admin?.picture}`} style={{ width: 40, height: 40, borderRadius: 50 }} alt=''></img>


                            <div className={classes.nameStyle}>{admin?.adminname}</div>
                            <div className={classes.emailStyle}>{admin?.emailid}</div>
                            <div className={classes.phoneStyle}>+91{admin?.mobileno}</div>
                        </div>
                        <div className={classes.menuStyle}>
                            <List>
                                <Divider />
                                <ListItem disablePadding>
                                    <ListItemButton onClick={() => navigate('/admindashboard/dashboard')}>
                                        <ListItemIcon>
                                            <DashboardIcon />

                                        </ListItemIcon>
                                        <ListItemText primary={<span className={classes.makeStyles}>Dashboard</span>}></ListItemText>
                                    </ListItemButton>
                                </ListItem>

                                <ListItem disablePadding>
                                    <ListItemButton onClick={() => navigate('/admindashboard/category')}>
                                        <ListItemIcon>
                                            <CategoryIcon />

                                        </ListItemIcon>
                                        <ListItemText primary={<span className={classes.menuItemStyle}>Category List</span>}></ListItemText>
                                    </ListItemButton>
                                </ListItem>

                                <ListItem disablePadding>
                                    <ListItemButton onClick={() => navigate('/admindashboard/subcategory')}>
                                        <ListItemIcon>
                                            <YardIcon />

                                        </ListItemIcon>
                                        <ListItemText primary={<span className={classes.menuItemStyle}>Sub Categories</span>}></ListItemText>
                                    </ListItemButton>
                                </ListItem>


                                <ListItem disablePadding>
                                    <ListItemButton onClick={() => navigate('/admindashboard/brand')}>
                                        <ListItemIcon>
                                            <YardIcon />

                                        </ListItemIcon>
                                        <ListItemText primary={<span className={classes.menuItemStyle}>Brands List</span>}></ListItemText>
                                    </ListItemButton>
                                </ListItem>


                                <ListItem disablePadding>
                                    <ListItemButton onClick={() => navigate('/admindashboard/product')}>
                                        <ListItemIcon>
                                            <ShoppingCartIcon />

                                        </ListItemIcon>
                                        <ListItemText primary={<span className={classes.menuItemStyle}>Product List</span>}></ListItemText>
                                    </ListItemButton>
                                </ListItem>

                                <ListItem disablePadding>
                                    <ListItemButton onClick={() => navigate('/admindashboard/productdetails')}>
                                        <ListItemIcon>
                                            <AddShoppingCartIcon />

                                        </ListItemIcon>
                                        <ListItemText primary={<span className={classes.menuItemStyle}>Product Details</span>}></ListItemText>
                                    </ListItemButton>
                                </ListItem>

                                <ListItem disablePadding>
                                    <ListItemButton onClick={() => navigate('/admindashboard/banner')}>
                                        <ListItemIcon>
                                            <ViewCarouselIcon />

                                        </ListItemIcon>
                                        <ListItemText primary={<span className={classes.menuItemStyle}>Banners</span>}></ListItemText>
                                    </ListItemButton>
                                </ListItem>

                                <ListItem disablePadding>
                                    <ListItemButton>
                                        <ListItemIcon>
                                            <SummarizeIcon />

                                        </ListItemIcon>
                                        <ListItemText primary={<span className={classes.menuItemStyle}>Sales Report</span>}></ListItemText>
                                    </ListItemButton>
                                </ListItem>

                                <ListItem disablePadding>
                                    <ListItemButton onClick={() => navigate('/admindashboard/deliveryops')}>
                                        <ListItemIcon>
                                            <DeliveryDiningIcon />

                                        </ListItemIcon>
                                        <ListItemText primary={<span className={classes.menuItemStyle}>Delivery Ops</span>}></ListItemText>
                                    </ListItemButton>
                                </ListItem>

                                <ListItem disablePadding>
                                    <ListItemButton onClick={() => navigate('/admindashboard/orders')}>
                                        <ListItemIcon>
                                            <ReceiptLongIcon />

                                        </ListItemIcon>
                                        <ListItemText primary={<span className={classes.menuItemStyle}>Orders</span>}></ListItemText>
                                    </ListItemButton>
                                </ListItem>


                                <ListItem disablePadding>
                                    <ListItemButton>
                                        <ListItemIcon>
                                            <ExitToAppIcon />

                                        </ListItemIcon>
                                        <ListItemText primary={<span className={classes.menuItemStyle}>Log Out</span>}></ListItemText>
                                    </ListItemButton>
                                </ListItem>
                            </List>
                        </div>
                    </Paper>
                </Grid>

                <Grid item xs={9.2} style={{ padding: 20 }}>
                    <Routes>
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
                    </Routes>

                </Grid>
            </Grid>
        </Box>
    )
}