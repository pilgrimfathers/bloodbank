import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence, Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: "AIzaSyDELjS60NoeXW7Uop1fpanQQ3nvPiTD6zA",
    authDomain: "blood-bank-3e585.firebaseapp.com",
    projectId: "blood-bank-3e585",
    storageBucket: "blood-bank-3e585.firebasestorage.app",
    messagingSenderId: "1093840618926",
    appId: "1:1093840618926:web:d400147f9efe0a8ba0343f",
    measurementId: "G-8N025SQY7K"
};

// initialize Firebase App
const app = initializeApp(firebaseConfig);

// initialize Auth with platform-specific persistence
let auth: Auth;
if (Platform.OS === 'web') {
    auth = getAuth(app);
} else {
    try {
        auth = initializeAuth(app, {
            persistence: getReactNativePersistence(ReactNativeAsyncStorage)
        });
    } catch (error) {
        auth = getAuth(app);
    }
}

const firestore = getFirestore(app);

export { app, auth, firestore };