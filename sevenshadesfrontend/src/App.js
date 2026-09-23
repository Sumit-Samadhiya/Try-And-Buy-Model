
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import AdminLogin from "./administrator/screens/AdminLogin";
import Banner from "./administrator/screens/Banner";

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
import TrialSelectionDisplay from "./userinterface/screens/TrialSelectionDisplay";
import MainCartDisplay from "./userinterface/screens/MainCartDisplay";
import DeliveryLogin from "./diliveryinterface/screens/DeliveryLogin";
import DeliveryHome from "./diliveryinterface/screens/DeliveryHome";
import DeliveryOrderDetails from "./diliveryinterface/screens/DeliveryOrderDetails";
import DeliveryHelpCenter from "./diliveryinterface/screens/DeliveryHelpCenter";

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    try {
      const savedUserStr = localStorage.getItem('sevenshades_user');
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        if (savedUser && savedUser.mobileno) {
          dispatch({ type: 'ADD_USER', payLoad: [savedUser.mobileno, savedUser] });
        }
      }
    } catch (e) {
      console.error('Session rehydration error:', e);
    }
  }, [dispatch]);

  return (
    <div>
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route element={<AdminLogin/>} path="/adminlogin"/>
        <Route element={<AdminDashboard/>} path="/admindashboard/*"/>
        <Route element={<Home/>} path="/home"></Route>
        <Route element={<ProductPage/>} path="/productpage"></Route>
        <Route element={<ProductDetailsPage/>} path="/productdetailspage"></Route>
        <Route element={<MyBagDisplay/>} path={"/mybagdisplay"}></Route>

        <Route element={<SignInDisplay/>} path={"/signindisplay"}/>
        <Route element={<SignUpDisplay/>} path={"/signupdisplay"}/>
        <Route element={<DisplayCheckOut/>} path={"/displaycheckout"}/>
        <Route element={<OrderSuccess/>} path={"/ordersuccess"}/>
        <Route element={<TrialSelectionDisplay/>} path={"/trial-selection"}/>
        <Route element={<MainCartDisplay/>} path={"/maincart"}/>
        <Route element={<ProfilePage/>} path={"/profile"}/>
        <Route element={<DeliveryLogin/>} path={"/delivery/login"}/>
        <Route element={<DeliveryHome/>} path={"/delivery/dashboard"}/>
        <Route element={<DeliveryOrderDetails/>} path={"/delivery/order/:taskId"}/>
        <Route element={<DeliveryHelpCenter/>} path={"/delivery/help-center"}/>
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

