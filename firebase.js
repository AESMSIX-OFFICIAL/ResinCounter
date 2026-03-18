import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"; // Tambahkan ini

const firebaseConfig = {
  apiKey: "AIzaSyBLLZ5sbGZY18V_-en30AmLo1Ja7Q2IhIA",
  authDomain: "t1vcloudstorage.firebaseapp.com",
  projectId: "t1vcloudstorage",
  storageBucket: "t1vcloudstorage.firebasestorage.app",
  messagingSenderId: "573904852851",
  appId: "1:573904852851:web:a39c6ed89f6b953aecd706"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app); // Ekspor auth
export const resinRef = doc(db, "data", "resin");

// Fungsi untuk login otomatis secara anonim
signInAnonymously(auth)
  .then(() => {
    console.log("Logged in anonymously");
  })
  .catch((error) => {
    console.error("Login failed:", error.code, error.message);
  });