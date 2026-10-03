// ─────────────────────────────────────────────────────────────────
// AppNavigator.tsx — 앱 전체 네비게이션 구조
//
// 화면 전환 로직:
//   Firebase 미로그인       → AuthStack (Login → Signup)
//   Firebase OK, 미등록     → AuthStack/Signup (needsSignup)
//   Firebase OK, 백엔드 등록 → MainTab (Map / Chat / Trail / Group / CatTower / Report)
//
// Expo Go 호환:
//   createStackNavigator → GestureHandlerRootView 필요 (App.tsx에서 감쌈)
// ─────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react'
import { Text } from 'react-native'
import { AppState, View } from 'react-native'
import { createStackNavigator } from '@react-navigation/stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { fetchAppGroups } from '../services/api'
import { useGroupChatUnread } from '../hooks/useGroupChatUnread'
import { useChatUnreadStore } from '../store/chatUnreadStore'

// ─── 화면 임포트 ──────────────────────────────
import LoginScreen from '../screens/auth/LoginScreen'
import SignupScreen from '../screens/auth/SignupScreen'
import MapScreen from '../screens/MapScreen'
import ChatScreen from '../screens/ChatScreen'
import TrailScreen from '../screens/TrailScreen'
import GroupScreen from '../screens/GroupScreen'
import ReportScreen from '../screens/ReportScreen'
import CatTowerStack from './CatTowerStack'
import GroupDetailScreen from '../screens/GroupDetailScreen'
import type { AppGroup } from '../types'

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
  발자국: undefined
  모임: undefined
  캣타워: undefined
  신고: undefined
}

export type MainStackParamList = {
  MainTabs: undefined
  GroupDetail: { group: AppGroup }
}

// ─── 네비게이터 인스턴스 ──────────────────────
const AuthStack = createStackNavigator<AuthStackParamList>()
const MainTab = createBottomTabNavigator<MainTabParamList>()
const MainStack = createStackNavigator<MainStackParamList>()

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
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen name="MainTabs" component={MainTabs} />
      <MainStack.Screen name="GroupDetail" component={GroupDetailScreen} />
    </MainStack.Navigator>
  )
}

function MainTabs() {
  const insets = useSafeAreaInsets()
  const [joinedGroupIds, setJoinedGroupIds] = useState<number[]>([])
  const [isChatTabFocused, setIsChatTabFocused] = useState(false)
  const [chatSocketRevision, setChatSocketRevision] = useState(0)
  const hasNewMessages = useChatUnreadStore((state) => state.hasNewMessages)
  const clearNewMessages = useChatUnreadStore((state) => state.clearNewMessages)

  const refreshJoinedGroups = useCallback(async () => {
    try {
      const response = await fetchAppGroups()
      setJoinedGroupIds(response.data.filter((group) => group.joined).map((group) => group.id))
    } catch (error) {
      console.warn('[chat-unread] 참여 모임 갱신 실패:', error)
    }
  }, [])

  useEffect(() => {
    void refreshJoinedGroups()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshJoinedGroups()
        setChatSocketRevision((revision) => revision + 1)
      }
    })
    return () => subscription.remove()
  }, [refreshJoinedGroups])

  useGroupChatUnread(joinedGroupIds, isChatTabFocused, chatSocketRevision)

  return (
    <View style={{ flex: 1 }}>
      <MainTab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          borderTopColor: '#f0f0f0',
          paddingTop: 4,
          paddingBottom: Math.max(insets.bottom, 8),
          height: 60 + insets.bottom,
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
        listeners={{
          focus: () => {
            setIsChatTabFocused(true)
            clearNewMessages()
            void refreshJoinedGroups()
          },
          blur: () => setIsChatTabFocused(false),
        }}
        options={{
          tabBarIcon: ({ color }) => (
            <View style={{ width: 42, height: 28, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20, color }}>💬</Text>
              {hasNewMessages && !isChatTabFocused && (
                <View style={{
                  position: 'absolute',
                  top: -5,
                  right: -8,
                  minWidth: 28,
                  height: 16,
                  paddingHorizontal: 5,
                  borderRadius: 8,
                  backgroundColor: '#EF4444',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>NEW</Text>
                </View>
              )}
            </View>
          ),
        }}
      />

      {/* 발자국 — 동선 기록 보관함 */}
      <MainTab.Screen
        name="발자국"
        component={TrailScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>🐾</Text>
          ),
        }}
      />

      {/* 모임 — 웹에서 생성된 그룹 목록 + 참가 */}
      <MainTab.Screen
        name="모임"
        component={GroupScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>👥</Text>
          ),
        }}
      />

      {/* 캣타워 — 성장·방문·활동 조회 (발자국과 분리) */}
      <MainTab.Screen
        name="캣타워"
        component={CatTowerStack}
        options={{
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>🐱</Text>
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
    </View>
  )
}
