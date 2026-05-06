// src/firebase/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

// Vite 환경에서는 process.env 대신 import.meta.env를 사용합니다.
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const appId = import.meta.env.VITE_FIREBASE_APP_ID;

export const isFirebaseConfigured = Boolean(
  apiKey &&
  authDomain &&
  projectId &&
  appId &&
  !apiKey.includes('Dummy')
);

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId
};

let auth: Auth | null = null;

if (isFirebaseConfigured) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
} else {
  console.warn('Firebase config is missing. Running in local dev-login mode.');
}

// 다른 컴포넌트(Login.tsx 등)에서 쓸 수 있도록 auth 객체를 내보냅니다.
export { auth };