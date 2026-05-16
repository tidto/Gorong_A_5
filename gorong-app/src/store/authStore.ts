import { create } from 'zustand'
import { User } from '../types'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { auth } from '../config/firebaseConfig'
import { signOut } from 'firebase/auth'

interface AuthStore {
  user: User | null
  setUser: (user: User | null) => void
  logout: () => Promise<void>
  loadFromStorage: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,

  setUser: (user) => {
    set({ user })
    if (user) {
      AsyncStorage.setItem('gorong-user', JSON.stringify(user))
    } else {
      AsyncStorage.removeItem('gorong-user')
    }
  },

  logout: async () => {
    await signOut(auth)  // Firebase 로그아웃
    set({ user: null })
    AsyncStorage.removeItem('gorong-user')
  },

  loadFromStorage: async () => {
    const userStr = await AsyncStorage.getItem('gorong-user')
    if (userStr) {
      set({ user: JSON.parse(userStr) })
    }
  }
}))