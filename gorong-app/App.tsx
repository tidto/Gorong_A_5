// ──────────────────────────────────────────────────────────────
// App.tsx — 앱 루트 컴포넌트
//
// 화면 전환 흐름:
//   Firebase 미로그인                → AuthNavigator (Login / Signup)
//   Firebase 로그인 + 백엔드 미등록  → Signup 화면 (needsSignup)
//   Firebase 로그인 + 백엔드 등록    → MainNavigator (탭)
//
// ⚠️ GestureHandlerRootView:
//   Stack Navigator 사용을 위해 필요. flex:1 필수.
//   SafeAreaProvider 는 원본 코드에 없었으므로 제거.
//   각 화면에서 paddingTop 으로 노치 직접 처리 중.
// ──────────────────────────────────────────────────────────────

import React, { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { onAuthStateChanged } from 'firebase/auth'

import { auth } from './src/config/firebaseConfig'
import { useAuthStore } from './src/store/authStore'
import { AuthNavigator, MainNavigator } from './src/navigation/AppNavigator'

const queryClient = new QueryClient()

function AppContent() {
  const {
    user,
    isHydrated,
    isCheckingAuth,
    needsSignup,
    loadFromStorage,
    checkBackendLogin,
  } = useAuthStore()

  useEffect(() => {
    // Step 1: AsyncStorage 캐시 복원 (앱 재시작 시 로그인 유지)
    loadFromStorage()

    // Step 2: Firebase 인증 상태 구독
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Firebase 로그인 확인 → 백엔드 DB 등록 여부 체크
        checkBackendLogin().catch((e) => {
          console.warn('[App] checkBackendLogin 실패:', e)
        })
      }
    })

    return () => unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // AsyncStorage 로드 전이거나 백엔드 확인 중이면 로딩 스피너
  if (!isHydrated || isCheckingAuth) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    )
  }

  // user 있고 needsSignup 아닐 때만 메인탭
  const isAuthenticated = !!user && !needsSignup

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  )
}

export default function App() {
  return (
    // GestureHandlerRootView: Stack Navigator 제스처 활성화 (flex:1 필수)
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
