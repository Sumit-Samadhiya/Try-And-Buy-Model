import { useLocation } from 'react-router-dom';
import DrapeyMascot from './DrapeyMascot';
const messages = {
  '/signindisplay': 'Welcome back! Use your mobile number to sign in. I’m here if you need a hand.',
  '/signupdisplay': 'Let’s get you started! Fill in your details, then verify your WhatsApp code.',
  '/forgotpassword': 'Let’s help you get back in. Verify your number to reset your password.',
  '/productpage': 'Explore your favourites. Check the available sizes before adding to your trial bag.',
  '/productdetailspage': 'Take a closer look! Pick your size and colour before adding this style.',
  '/mybagdisplay': 'Your shortlist is here! Review quantities and sizes before continuing.',
  '/displaycheckout': 'Add your delivery address and choose an available trial slot.',
  '/maincart': 'Review your selection and delivery details before confirming.',
  '/profile': 'Your orders and account details are here. Select an order to see its progress.',
  '/ordersuccess': 'Check your order confirmation and delivery details here.',
  '/privacy-policy': 'Here’s how DoorDrape handles your information.',
  '/terms-and-conditions': 'You can review the shopping and trial terms here.',
};
export default function DrapeyGuide() {
  const { pathname } = useLocation();
  const home = pathname === '/' || pathname === '/home';
  const message = home ? undefined : messages[pathname] || (pathname.startsWith('/delivery') ? 'Your delivery workspace is here. Review each task before updating its status.' : pathname.startsWith('/admin') ? 'Your store workspace is ready. Review your details before saving changes.' : 'I’m here to help you explore DoorDrape.');
  return <DrapeyMascot routeKey={pathname} greetingMessage={message} />;
}
