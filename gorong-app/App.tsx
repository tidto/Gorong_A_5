// App.tsx
import React, { useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text, View, ActivityIndicator } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from './src/store/authStore'
import MapScreen from './src/screens/MapScreen'
import ChatScreen from './src/screens/ChatScreen'
import TrailScreen from './src/screens/TrailScreen'

const Tab = createBottomTabNavigator()
const queryClient = new QueryClient()

function MainApp() {
  const { loadFromStorage, isHydrated } = useAuthStore()

  useEffect(() => {
    loadFromStorage()
  }, [])

  // AsyncStorage에서 유저 정보 읽어오는 동안 로딩 표시
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