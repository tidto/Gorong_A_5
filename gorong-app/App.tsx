import React, { useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { ActivityIndicator, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import { auth } from './src/config/firebaseConfig'
import { useAuthStore } from './src/store/authStore'
import MapScreen from './src/screens/MapScreen'
import ChatScreen from './src/screens/ChatScreen'
import TrailScreen from './src/screens/TrailScreen'
import GroupScreen from './src/screens/GroupScreen'

const Tab = createBottomTabNavigator()
const queryClient = new QueryClient()

function MainApp() {
  const { loadFromStorage, isHydrated, setUser } = useAuthStore()

  useEffect(() => {
    loadFromStorage()

    // 앱이 켜졌을 때 Firebase 로그인 상태를 보장한다.
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        signInAnonymously(auth).catch((e) => console.error('익명 로그인 실패:', e))
        return
      }

      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? '',
        nickname: '익명',
      })
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
          options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📍</Text> }}
        />
        <Tab.Screen
          name="채팅"
          component={ChatScreen}
          options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>💬</Text> }}
        />
        <Tab.Screen
          name="트레일"
          component={TrailScreen}
          options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🐾</Text> }}
        />
        <Tab.Screen
          name="그룹"
          component={GroupScreen}
          options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👥</Text> }}
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
