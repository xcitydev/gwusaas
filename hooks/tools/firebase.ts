// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBuoHYsbRh6ZrZ00bYUr_f4v2bLxuWVZyI",    
  authDomain: "gwusaas.firebaseapp.com",
  projectId: "gwusaas",
  storageBucket: "gwusaas.firebasestorage.app",
  messagingSenderId: "683465962354",
  appId: "1:683465962354:web:15ced88254dd03430e63eb",
  measurementId: "G-4ZFV5JLCW6",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export {app, db}
