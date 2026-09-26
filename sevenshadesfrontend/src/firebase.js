import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyAx4CnJeQT0YujFWFq76kP9jwLWe-V18RI",
  authDomain: "ry-and-buy-auth.firebaseapp.com",
  projectId: "ry-and-buy-auth",
  storageBucket: "ry-and-buy-auth.firebasestorage.app",
  messagingSenderId: "213603112745",
  appId: "1:213603112745:web:b1e681cf299a0eff25c938",
  measurementId: "G-GSDYWH6NFD"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export default app;
