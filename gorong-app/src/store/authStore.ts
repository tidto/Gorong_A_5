// src/store/authStore.ts
import { create } from 'zustand'
import { User } from '../types'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { auth } from '../config/firebaseConfig'
import { signOut } from 'firebase/auth'

interface AuthStore {
  user: User | null
  isHydrated: boolean                              // 추가: 스토리지 로드 완료 여부
  setUser: (user: User | null) => Promise<void>    // 변경: async로
  logout: () => Promise<void>
  loadFromStorage: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isHydrated: false,   // 초기값 false

  setUser: async (user) => {
    set({ user })
    try {
      if (user) {
        await AsyncStorage.setItem('gorong-user', JSON.stringify(user))
      } else {
        await AsyncStorage.removeItem('gorong-user')
      }
    } catch (e) {
      console.error('유저 정보 저장 실패:', e)
    }
  },

  logout: async () => {
    try {
      await signOut(auth)
    } catch (e) {
      console.error('Firebase 로그아웃 실패:', e)
    }
    set({ user: null })
    try {
      await AsyncStorage.removeItem('gorong-user')
    } catch (e) {
      console.error('로컬 유저 정보 삭제 실패:', e)
    }
  },

  loadFromStorage: async () => {
    try {
      const userStr = await AsyncStorage.getItem('gorong-user')
      if (userStr) {
        set({ user: JSON.parse(userStr) })
      }
    } catch (e) {
      console.error('스토리지 로드 실패:', e)
    } finally {
      set({ isHydrated: true })   // 성공/실패 관계없이 로드 완료 표시
    }
  },
}))