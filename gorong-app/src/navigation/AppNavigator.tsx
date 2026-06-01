// ─────────────────────────────────────────────────────────────────
// AppNavigator.tsx — 앱 전체 네비게이션 구조
//
// 화면 전환 로직:
//   Firebase 미로그인       → AuthStack (Login → Signup)
//   Firebase OK, 미등록     → AuthStack/Signup (needsSignup)
//   Firebase OK, 백엔드 등록 → MainTab (Map / Chat / Trail / Group)
//
// Expo Go 호환:
//   createStackNavigator → GestureHandlerRootView 필요 (App.tsx에서 감쌈)
// ─────────────────────────────────────────────────────────────────

import React from 'react'
import { Text } from 'react-native'
import { createStackNavigator } from '@react-navigation/stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

// ─── 화면 임포트 ──────────────────────────────
import LoginScreen from '../screens/auth/LoginScreen'
import SignupScreen from '../screens/auth/SignupScreen'
import MapScreen from '../screens/MapScreen'
import ChatScreen from '../screens/ChatScreen'
import TrailScreen from '../screens/TrailScreen'
import GroupScreen from '../screens/GroupScreen'
import ReportScreen from '../screens/ReportScreen'

// ─── 네비게이션 파라미터 타입 ─────────────────
// AuthStack 화면 목록 & 파라미터
export type AuthStackParamList = {
  Login: undefined
  Signup: undefined
}

// MainTab 화면 목록 & 파라미터
export type MainTabParamList = {
  지도: undefined
  채팅: undefined
  트레일: undefined
  그룹: undefined
  신고: undefined
}

// ─── 네비게이터 인스턴스 ──────────────────────
const AuthStack = createStackNavigator<AuthStackParamList>()
const MainTab = createBottomTabNavigator<MainTabParamList>()

// ─────────────────────────────────────────────
// AuthNavigator — 로그인/회원가입 Stack
// ─────────────────────────────────────────────
export function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false, // 헤더 숨김 (각 화면에서 직접 구현)
        cardStyle: { backgroundColor: '#fff' },
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  )
}

// ─────────────────────────────────────────────
// MainNavigator — 로그인 후 탭 네비게이션
// ─────────────────────────────────────────────
export function MainNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          borderTopColor: '#f0f0f0',
          paddingTop: 4,
          height: 60,
        },
        headerShown: false,
      }}
    >
      {/* 지도 — 행사장 마커 + 지오펜싱 + 트레일 기록 */}
      <MainTab.Screen
        name="지도"
        component={MapScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>📍</Text>
          ),
        }}
      />

      {/* 채팅 — 익명 채팅(지오펜스) + 모임 채팅 */}
      <MainTab.Screen
        name="채팅"
        component={ChatScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>💬</Text>
          ),
        }}
      />

      {/* 트레일 — 동선 기록 보관함 */}
      <MainTab.Screen
        name="트레일"
        component={TrailScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>🐾</Text>
          ),
        }}
      />

      {/* 그룹 — 웹에서 생성된 모임 목록 + 참가 */}
      <MainTab.Screen
        name="그룹"
        component={GroupScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>👥</Text>
          ),
        }}
      />

      {/* 신고 — 공사현장 등 지도 마커 신고 (후순위 기능) */}
      <MainTab.Screen
        name="신고"
        component={ReportScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>🚧</Text>
          ),
        }}
      />
    </MainTab.Navigator>
  )
}