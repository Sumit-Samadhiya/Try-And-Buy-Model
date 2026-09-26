import CustomerOrderNotifications from './services/CustomerOrderNotifications';
import RequireSession from './services/RequireSession';
import { getData, clearCachedAccounts } from './services/FetchDjangoApiServices';
import { useEffect, lazy, Suspense } from 'react';
import { useDispatch } from 'react-redux';
import {BrowserRouter,Routes,Route, Navigate} from 'react-router-dom'
const ForgotPassword = lazy(() => import('./userinterface/screens/ForgotPassword'));

const AdminLogin = lazy(() => import('./administrator/screens/AdminLogin'));


const AdminDashboard = lazy(() => import('./administrator/screens/AdminDashboard'));
const Home = lazy(() => import('./userinterface/screens/Home'));
const ProductPage = lazy(() => import('./userinterface/screens/ProductPage'));
const ProductDetailsPage = lazy(() => import('./userinterface/screens/ProductDetailsPage'));
const MyBagDisplay = lazy(() => import('./userinterface/screens/MyBagDisplay'));
const SignInDisplay = lazy(() => import('./userinterface/screens/SignInDisplay'));
const SignUpDisplay = lazy(() => import('./userinterface/screens/SignUpDisplay'));
const DisplayCheckOut = lazy(() => import('./userinterface/screens/DisplayCheckOut'));
const OrderSuccess = lazy(() => import('./userinterface/screens/OrderSuccess'));
const ProfilePage = lazy(() => import('./userinterface/screens/ProfilePage'));

const MainCartDisplay = lazy(() => import('./userinterface/screens/MainCartDisplay'));
const DeliveryLogin = lazy(() => import('./diliveryinterface/screens/DeliveryLogin'));
const DeliveryHome = lazy(() => import('./diliveryinterface/screens/DeliveryHome'));
const DeliveryOrderDetails = lazy(() => import('./diliveryinterface/screens/DeliveryOrderDetails'));
const DeliveryHelpCenter = lazy(() => import('./diliveryinterface/screens/DeliveryHelpCenter'));
const NotFound = lazy(() => import('./userinterface/screens/NotFound'));

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
      <Suspense fallback={<div role="status" style={{ padding: 32 }}>Loading page…</div>}><Routes>
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
        <Route path="*" element={<NotFound />} />
      </Routes></Suspense>
      </BrowserRouter>
     
      {/* <Category/> */}
      {/* <DisplayAllCategory/> */}
      {/* <MySubCategory/> */}
      {/* <DisplayAllSubCategory/> */}

    </div>
  );
}

export default App;

