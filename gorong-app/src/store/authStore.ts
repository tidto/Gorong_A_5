import { create } from 'zustand'
import { User } from '../types'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface AuthStore {
  user: User | null
  token: string | null
  setUser: (user: User, token: string) => void
  logout: () => void
  loadFromStorage: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,

  setUser: (user, token) => {
    set({ user, token })
    AsyncStorage.setItem('gorong-user', JSON.stringify(user))
    AsyncStorage.setItem('gorong-token', token)
  },

  logout: () => {
    set({ user: null, token: null })
    AsyncStorage.removeItem('gorong-user')
    AsyncStorage.removeItem('gorong-token')
  },

  loadFromStorage: async () => {
    const userStr = await AsyncStorage.getItem('gorong-user')
    const token = await AsyncStorage.getItem('gorong-token')
    if (userStr && token) {
      set({ user: JSON.parse(userStr), token })
    }
  }
}))