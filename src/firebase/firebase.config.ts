// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCmkwTb1F8xkpnkP8B0ybSvUKOYqcEV6Fo",
  authDomain: "student-portal-6b871.firebaseapp.com",
  projectId: "student-portal-6b871",
  storageBucket: "student-portal-6b871.firebasestorage.app",
  messagingSenderId: "833150287787",
  appId: "1:833150287787:web:99a3600df0d20ed9cd5cee",
  measurementId: "G-K95LVLWX62"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);