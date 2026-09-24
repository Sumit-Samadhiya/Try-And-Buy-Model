import ForgotPassword from './userinterface/screens/ForgotPassword';
import CustomerOrderNotifications from './services/CustomerOrderNotifications';
import RequireSession from './services/RequireSession';
import { getData, clearCachedAccounts } from './services/FetchDjangoApiServices';

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import AdminLogin from "./administrator/screens/AdminLogin";


import AdminDashboard from "./administrator/screens/AdminDashboard";
import {BrowserRouter,Routes,Route, Navigate} from 'react-router-dom'
import Home from "./userinterface/screens/Home";
import ProductPage from "./userinterface/screens/ProductPage";
import ProductDetailsPage from "./userinterface/screens/ProductDetailsPage";
import MyBagDisplay from "./userinterface/screens/MyBagDisplay"
import SignInDisplay from "./userinterface/screens/SignInDisplay";
import SignUpDisplay from "./userinterface/screens/SignUpDisplay";
import DisplayCheckOut from "./userinterface/screens/DisplayCheckOut";
import OrderSuccess from "./userinterface/screens/OrderSuccess";
import ProfilePage from "./userinterface/screens/ProfilePage";

import MainCartDisplay from "./userinterface/screens/MainCartDisplay";
import DeliveryLogin from "./diliveryinterface/screens/DeliveryLogin";
import DeliveryHome from "./diliveryinterface/screens/DeliveryHome";
import DeliveryOrderDetails from "./diliveryinterface/screens/DeliveryOrderDetails";
import DeliveryHelpCenter from "./diliveryinterface/screens/DeliveryHelpCenter";

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    let active = true;
    clearCachedAccounts();
    const clear = () => dispatch({ type: 'CLEAR_USER' });
    window.addEventListener('session-cleared', clear);
    getData('auth_session').then(result => {
      if (!active) return;
      if (result.status && result.role === 'customer') dispatch({ type: 'ADD_USER', payLoad: [result.data.mobileno, result.data] });
      else clear();
    });
    return () => { active = false; window.removeEventListener('session-cleared', clear); };
  }, [dispatch]);

  return (
    <div>
      <BrowserRouter>
      <CustomerOrderNotifications />
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route element={<AdminLogin/>} path="/adminlogin"/>
        <Route element={<RequireSession role="admin"><AdminDashboard/></RequireSession>} path="/admindashboard/*"/>
        <Route element={<Home/>} path="/home"></Route>
        <Route element={<ProductPage/>} path="/productpage"></Route>
        <Route element={<ProductDetailsPage/>} path="/productdetailspage"></Route>
        <Route element={<MyBagDisplay/>} path={"/mybagdisplay"}></Route>

        <Route element={<SignInDisplay/>} path={"/signindisplay"}/>
        <Route element={<ForgotPassword/>} path="/forgotpassword"/>
        <Route element={<SignUpDisplay/>} path={"/signupdisplay"}/>
        <Route element={<RequireSession role="customer"><DisplayCheckOut/></RequireSession>} path={"/displaycheckout"}/>
        <Route element={<RequireSession role="customer"><OrderSuccess/></RequireSession>} path={"/ordersuccess"}/>
        <Route element={<Navigate to="/profile" replace/>} path={"/trial-selection"}/>
        <Route element={<RequireSession role="customer"><MainCartDisplay/></RequireSession>} path={"/maincart"}/>
        <Route element={<RequireSession role="customer"><ProfilePage/></RequireSession>} path={"/profile"}/>
        <Route element={<DeliveryLogin/>} path={"/delivery/login"}/>
        <Route element={<RequireSession role="rider"><DeliveryHome/></RequireSession>} path={"/delivery/dashboard"}/>
        <Route element={<RequireSession role="rider"><DeliveryOrderDetails/></RequireSession>} path={"/delivery/order/:taskId"}/>
        <Route element={<RequireSession role="rider"><DeliveryHelpCenter/></RequireSession>} path={"/delivery/help-center"}/>
        <Route element={<Navigate to="/delivery/login" replace />} path={"/deliverydashboard"}/>

      </Routes>
      </BrowserRouter>
     
      {/* <Category/> */}
      {/* <DisplayAllCategory/> */}
      {/* <MySubCategory/> */}
      {/* <DisplayAllSubCategory/> */}

    </div>
  );
}

export default App;

