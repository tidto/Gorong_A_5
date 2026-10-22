// ──────────────────────────────────────────────────────────────
// firebaseConfig.ts — Firebase 초기화
//
// Expo Go 호환: Firebase JS SDK 사용 (네이티브 모듈 불필요)
// 환경변수: 프로젝트 루트 .env 파일에 EXPO_PUBLIC_FIREBASE_* 설정 필요
//
// getApps() 체크: 핫리로드(Expo Go) 시 중복 초기화 방지
// ──────────────────────────────────────────────────────────────

import { initializeApp, getApps } from 'firebase/app'
import { getAuth, initializeAuth } from 'firebase/auth'
// Metro는 React Native 조건의 firebase/auth 진입점을 사용한다. TS 번들러 선언에는 이 RN 전용 export가 빠져 있다.
// @ts-expect-error getReactNativePersistence는 Firebase Auth의 React Native 런타임 export다.
import { getReactNativePersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage'

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

// React Native 로그인 상태가 앱 재시작 후에도 유지되도록 AsyncStorage persistence 사용.
const createAuth = () => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    })
  } catch (error: any) {
    // Fast Refresh로 이미 Auth가 초기화된 경우 기존 인스턴스를 재사용한다.
    if (error?.code === 'auth/already-initialized') return getAuth(app)
    throw error
  }
}

export const auth = createAuth()
export const db = getFirestore(app)
export default app
