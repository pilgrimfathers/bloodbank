import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDELjS60NoeXW7Uop1fpanQQ3nvPiTD6zA",
    authDomain: "blood-bank-3e585.firebaseapp.com",
    projectId: "blood-bank-3e585",
    storageBucket: "blood-bank-3e585.firebasestorage.app",
    messagingSenderId: "1093840618926",
    appId: "1:1093840618926:web:d400147f9efe0a8ba0343f",
    measurementId: "G-8N025SQY7K"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

export { auth, firestore }; 