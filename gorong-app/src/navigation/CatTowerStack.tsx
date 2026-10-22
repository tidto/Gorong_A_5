// ──────────────────────────────────────────────────────────────
// CatTowerStack.tsx — 캣타워 탭 내부 스택 (홈 / 방명록 / 활동)
// ──────────────────────────────────────────────────────────────

import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import CatTowerScreen from '../screens/CatTowerScreen'
import CatTowerGuestbookScreen from '../screens/CatTowerGuestbookScreen'
import CatTowerActivityScreen from '../screens/CatTowerActivityScreen'

export type CatTowerStackParamList = {
  CatTowerHome: undefined
  CatTowerGuestbook: undefined
  CatTowerActivity: undefined
}

const Stack = createStackNavigator<CatTowerStackParamList>()

export default function CatTowerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CatTowerHome" component={CatTowerScreen} />
      <Stack.Screen name="CatTowerGuestbook" component={CatTowerGuestbookScreen} />
      <Stack.Screen name="CatTowerActivity" component={CatTowerActivityScreen} />
    </Stack.Navigator>
  )
}
