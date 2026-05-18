import React, { useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text, View, ActivityIndicator } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth'  
import { auth } from './src/config/firebaseConfig'                     
import { useAuthStore } from './src/store/authStore'
import MapScreen from './src/screens/MapScreen'
import ChatScreen from './src/screens/ChatScreen'
import TrailScreen from './src/screens/TrailScreen'

const Tab = createBottomTabNavigator()
const queryClient = new QueryClient()

function MainApp() {
  const { loadFromStorage, isHydrated, setUser } = useAuthStore()

  useEffect(() => {
    loadFromStorage()

    // Firebase 익명 로그인 — auth.currentUser가 없으면 자동 로그인
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        signInAnonymously(auth).catch(e => console.error('익명 로그인 실패:', e))
      } else {
        // Firebase 유저가 있으면 store에도 동기화
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? '',
          nickname: '익명',
        })
      }
    })

    return () => unsubscribe()
  }, [])

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#FF6B35',
          tabBarInactiveTintColor: '#999',
          headerShown: false,
        }}
      >
        <Tab.Screen
          name="지도"
          component={MapScreen}
          options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🗺️</Text> }}
        />
        <Tab.Screen
          name="채팅"
          component={ChatScreen}
          options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>💬</Text> }}
        />
        <Tab.Screen
          name="동선"
          component={TrailScreen}
          options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🐾</Text> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainApp />
    </QueryClientProvider>
  )
}