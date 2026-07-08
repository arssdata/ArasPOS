import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCAKklnyAmf-GBrzU_NG4vUbGNM4Xi_yJo",
  authDomain: "knotted-access-n4jp1.firebaseapp.com",
  projectId: "knotted-access-n4jp1",
  storageBucket: "knotted-access-n4jp1.firebasestorage.app",
  messagingSenderId: "1065358624902",
  appId: "1:1065358624902:web:0a509d14f1032e5d8f2907"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom database ID
export const db = getFirestore(app, "ai-studio-wirapossistemkas-c5a98b75-d0cd-4863-bc55-bef81270eece");

// Validate connection
async function testConnection() {
  try {
    // Just a basic check
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase Firestore connected successfully!");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or network status.", error);
    } else {
      console.log("Firebase Firestore initialized.");
    }
  }
}

testConnection();
