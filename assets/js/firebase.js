// Inicialização central do Firebase (SDK modular via CDN oficial gstatic).
// Para atualizar a versão do SDK, troque apenas a constante nas URLs abaixo.
import { firebaseConfig, isConfigured } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

export const isReady = isConfigured();
export const app = isReady ? initializeApp(firebaseConfig) : null;
export const auth = isReady ? getAuth(app) : null;
export const db = isReady ? getFirestore(app) : null;
export const storage = isReady ? getStorage(app) : null;

if (auth) auth.languageCode = "pt";

export {
  onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup,
  GoogleAuthProvider, signOut, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export {
  ref, uploadBytesResumable, getDownloadURL, deleteObject, getBlob
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
