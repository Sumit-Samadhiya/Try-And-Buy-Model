import { useLocation } from 'react-router-dom';
import DrapeyMascot from './DrapeyMascot';

const messages = {
  '/': 'Namaste! 🙏 Main Drapey hoon — aapka personal Try & Buy stylist! Ghar baithe try karo, pasand aaye tabhi khareedo! 😉✨',
  '/home': 'Namaste! 🙏 Main Drapey hoon — aapka personal Try & Buy stylist! Ghar baithe try karo, pasand aaye tabhi khareedo! 😉✨',
  '/signindisplay': 'Welcome back, dost! Apne mobile number se sign in karo — koi help chahiye toh tap karo! 🔑',
  '/signupdisplay': 'Naye mehmaan! Ek minute me account banao aur instant doorstep trial ka maza lo! ✨',
  '/forgotpassword': 'Password bhool gaye? Koi tension nahi, WhatsApp verification se turant naya password banate hain! 🪄',
  '/productpage': 'Wah, kya collection hai! Check out the trendy styles — tap karke details dekho! 👗✨',
  '/productdetailspage': 'Take a closer look! Size aur colour choose karo, main bag me daal deta hoon! 🛍️',
  '/mybagdisplay': 'Ye hui na baat! Bag check kar lo, up to 4 items ek saath trial ke liye book kar sakte ho! 🪞',
  '/displaycheckout': 'Bas ek step aur! Delivery address select karo aur 45-min SOS trial slot book karo! 🛵💨',
  '/maincart': 'Review time! Delivery details verify kar lo aur free doorstep trial confirm karo! ✨',
  '/profile': 'Aapka personal space! Yahan se live delivery track karo aur past orders dekho. 👤',
  '/ordersuccess': 'BOOM! 🎊 Order confirm ho gaya! Ab mirror ke aage pose maarne ki taiyari karo! 🪞💃',
  '/privacy-policy': 'Hum aapki privacy ki utni hi care karte hain jitni aapke favourite outfits ki! 🛡️',
  '/terms-and-conditions': 'Super simple terms — try first at home, pay only for what fits! 📜',
};

export default function DrapeyGuide() {
  const { pathname } = useLocation();
  const home = pathname === '/' || pathname === '/home';
  const message = home
    ? undefined
    : messages[pathname] ||
      (pathname.startsWith('/delivery')
        ? 'Delivery partner workspace! Har task ko aaram se complete karo. 🛵'
        : pathname.startsWith('/admin')
        ? 'Admin workspace ready hai! Store analytics and products manage karo. 📊'
        : 'Main Drapey hoon! Aapki shopping ko easy banane ke liye yahin hoon. 😊');

  return <DrapeyMascot routeKey={pathname} greetingMessage={message} />;
}
