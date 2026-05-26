import React, { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { auth } from '../../config/firebaseConfig'
import { useAuthStore } from '../../store/authStore'

export default function LoginScreen() {
  const { setUser } = useAuthStore()

  useEffect(() => {
    // Firebase 익명 로그인 자동 실행
    signInAnonymously(auth).catch(e => console.error('익명 로그인 실패:', e))

    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? '',
          nickname: '익명',
        })
      } else {
        setUser(null)
      }
    })
    return unsub
  }, [])

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#FF6B35" />
    </View>
  )
}