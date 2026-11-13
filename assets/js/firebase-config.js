// Firebase web app configuration — public client values.
export const firebaseConfig = {
  apiKey: "AIzaSyDTHO2avgqouMWTCZUGhV4wz3esnSs8F2Y",
  authDomain: "catalogo-ln-sistemas.firebaseapp.com",
  projectId: "catalogo-ln-sistemas",
  storageBucket: "catalogo-ln-sistemas.firebasestorage.app",
  messagingSenderId: "976555017736",
  appId: "1:976555017736:web:a32845dc0fef7f224033bd"
};

// Admin UID: enforced by Firestore/Storage rules as well as admin UI.
export const ADMIN_UID = "u4gmt1pDA3T7AyIKEdiLAztM6xH2";

export function isConfigured() {
  return !Object.values(firebaseConfig).some((v) => /SUA_|SEU_/.test(String(v)));
}
