// ─────────────────────────────────────────────────────────────────
// authStore.ts — 인증 전역 상태 관리 (Zustand)
//
// 상태 흐름:
//   1. 앱 시작 → loadFromStorage() → AsyncStorage에서 유저 복원
//   2. onAuthStateChanged (App.tsx) → checkBackendLogin() 호출
//   3. 백엔드 /users/login 응답:
//      - isRegistered: true  → user 저장 → 메인탭 진입
//      - isRegistered: false → needsSignup = true → 회원가입 화면
//   4. 회원가입 완료 → completeSignup() → 메인탭 진입
// ─────────────────────────────────────────────────────────────────

import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { signOut } from 'firebase/auth'
import { auth } from '../config/firebaseConfig'
import { User, SignUpPayload } from '../types'
import api from '../services/api'

// AsyncStorage 키 상수
const STORAGE_KEY_USER = 'gorong-user'

interface AuthStore {
  // ─── 상태 ─────────────────────────────────────
  user: User | null                // 로그인된 유저 정보
  isHydrated: boolean              // AsyncStorage 로드 완료 여부 (스플래시 제어)
  isCheckingAuth: boolean          // 백엔드 로그인 확인 중 (로딩 표시)
  needsSignup: boolean             // Firebase OK, 백엔드 미등록 → 회원가입 필요
  accessRestricted: boolean        // 밴/비활성 계정으로 앱 이용 제한
  accessRestrictedMessage: string | null
  insideVenueId: string | null     // 현재 진입한 지오펜스 행사장 ID

  // ─── 액션 ─────────────────────────────────────
  /** 앱 시작 시 AsyncStorage에서 유저 정보 복원 */
  loadFromStorage: () => Promise<void>

  /**
   * Firebase 로그인 완료 후 백엔드에 등록 여부 확인
   * → isRegistered: true  : user 세팅
   * → isRegistered: false : needsSignup = true
   */
  checkBackendLogin: () => Promise<void>

  /**
   * 회원가입 완료 처리
   * SignupScreen에서 POST /users/signup 성공 후 호출
   */
  completeSignup: (user: User) => Promise<void>

  /** 로그아웃: Firebase + AsyncStorage 초기화 */
  logout: () => Promise<void>

  /** MapScreen/ChatScreen에서 지오펜스 진입 ID 공유 */
  setInsideVenueId: (id: string | null) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isHydrated: false,
  isCheckingAuth: false,
  needsSignup: false,
  accessRestricted: false,
  accessRestrictedMessage: null,
  insideVenueId: null,

  // ─── loadFromStorage ──────────────────────────
  // 앱 재시작 시 이전에 저장된 유저 정보를 불러옴
  // (토큰 유효성은 onAuthStateChanged가 별도로 검증)
  loadFromStorage: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_USER)
      if (raw) {
        const cached = JSON.parse(raw) as User
        set({ user: cached })
      }
    } catch (e) {
      console.warn('[authStore] 스토리지 로드 실패:', e)
    } finally {
      // 성공/실패 무관하게 하이드레이션 완료 표시
      set({ isHydrated: true })
    }
  },

  // ─── checkBackendLogin ────────────────────────
  // Firebase 인증 완료 후 백엔드 DB 등록 여부 확인
  checkBackendLogin: async () => {
    set({ isCheckingAuth: true })
    try {
      // 백엔드 로그인 API 호출 (인터셉터가 Firebase 토큰 자동 첨부)
      const res = await api.post<{
        isRegistered: boolean
        accessRestricted?: boolean
        accountStatus?: 'ACTIVE' | 'INACTIVE'
        message?: string
        user?: { nickname: string; email: string; roleType: string }
      }>('/users/login')

      if (res.data.accessRestricted) {
        set({
          user: null,
          needsSignup: false,
          accessRestricted: true,
          accessRestrictedMessage: res.data.message ?? '계정 이용이 제한되었습니다.',
        })
        await signOut(auth).catch((e) => {
          console.warn('[authStore] 제한 계정 로그아웃 실패:', e)
        })
        return
      }

      if (res.data.isRegistered && res.data.user) {
        // 백엔드 DB에 등록된 유저 → 메인탭 진입
        const currentUser = auth.currentUser
        const user: User = {
          uid: currentUser?.uid ?? '',
          email: res.data.user.email,
          nickname: res.data.user.nickname,
          roleType: res.data.user.roleType as 'USER' | 'ADMIN',
          accountStatus: res.data.accountStatus ?? 'ACTIVE',
        }
        set({
          user,
          needsSignup: false,
          accessRestricted: false,
          accessRestrictedMessage: null,
        })
        await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user))
      } else {
        // Firebase UID는 있지만 백엔드 미등록 → 회원가입 화면으로
        set({
          needsSignup: true,
          user: null,
          accessRestricted: false,
          accessRestrictedMessage: null,
        })
      }
    } catch (e) {
      console.warn('[authStore] 백엔드 로그인 확인 실패:', e)
      // 네트워크 오류 등: 로컬 캐시 유저가 있으면 그대로 유지
    } finally {
      set({ isCheckingAuth: false })
    }
  },

  // ─── completeSignup ───────────────────────────
  // 회원가입 완료 후 user 세팅 & needsSignup 해제
  completeSignup: async (user: User) => {
    set({
      user,
      needsSignup: false,
      accessRestricted: false,
      accessRestrictedMessage: null,
    })
    try {
      await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user))
    } catch (e) {
      console.warn('[authStore] 가입 후 유저 저장 실패:', e)
    }
  },

  // ─── logout ───────────────────────────────────
  logout: async () => {
    try {
      await signOut(auth)
    } catch (e) {
      console.warn('[authStore] Firebase 로그아웃 실패:', e)
    }
    set({
      user: null,
      needsSignup: false,
      accessRestricted: false,
      accessRestrictedMessage: null,
    })
    try {
      await AsyncStorage.removeItem(STORAGE_KEY_USER)
    } catch (e) {
      console.warn('[authStore] 스토리지 삭제 실패:', e)
    }
  },

  // ─── setInsideVenueId ─────────────────────────
  setInsideVenueId: (id) => set({ insideVenueId: id }),
}))
