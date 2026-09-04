// ──────────────────────────────────────────────────────────────
// firebaseConfig.ts — Firebase 초기화
//
// Expo Go 호환: Firebase JS SDK 사용 (네이티브 모듈 불필요)
// 환경변수: 프로젝트 루트 .env 파일에 EXPO_PUBLIC_FIREBASE_* 설정 필요
//
// getApps() 체크: 핫리로드(Expo Go) 시 중복 초기화 방지
// ──────────────────────────────────────────────────────────────

import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
}

// Expo Go 핫리로드 시 "Firebase App already exists" 오류 방지
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
