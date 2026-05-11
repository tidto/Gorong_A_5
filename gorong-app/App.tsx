import React, { useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useAuthStore } from './src/store/authStore'
import MapScreen from './src/screens/MapScreen'
import ChatScreen from './src/screens/ChatScreen'
import TrailScreen from './src/screens/TrailScreen'

const Tab = createBottomTabNavigator()

export default function App() {
  const { loadFromStorage } = useAuthStore()

  useEffect(() => {
    loadFromStorage()
  }, [])

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