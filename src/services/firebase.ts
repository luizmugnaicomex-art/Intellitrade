// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBVcyMXVMys5xmZUiMfAAlyBwWVHNXNNpI",
  authDomain: "intellitrade-beta-blue.firebaseapp.com",
  projectId: "intellitrade-beta-blue",
  storageBucket: "intellitrade-beta-blue.firebasestorage.app",
  messagingSenderId: "630205581839",
  appId: "1:630205581839:web:28f09f8561a11d4f72317a",
  firestoreDatabaseId: "ai-studio-f167e920-22d3-4b4e-a34a-83636d06ffc7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// CRITICAL: The app needs the firestoreDatabaseId passed explicitly if partitioned, otherwise it's default
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();
