// 웹 확인용 stub — 모바일 MapScreen은 그대로 유지
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function MapScreen() {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 24 }]}>
      <Text style={styles.title}>지도</Text>
      <Text style={styles.sub}>웹에서는 지도를 지원하지 않습니다.{'\n'}캣타워 탭으로 확인해 주세요.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#F7F7F8', paddingHorizontal: 20 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  sub: { marginTop: 12, fontSize: 14, color: '#6b7280', lineHeight: 22 },
})
