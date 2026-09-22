// ──────────────────────────────────────────────────────────────
// CatTowerActivityScreen.tsx — 활동 목록 조회
// ──────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { StackNavigationProp } from '@react-navigation/stack'
import { fetchMyCatTowerPage } from '../services/catTowerApi'
import type { CatTowerActivity } from '../types/catTower'
import type { CatTowerStackParamList } from '../navigation/CatTowerStack'

type Props = {
  navigation: StackNavigationProp<CatTowerStackParamList, 'CatTowerActivity'>
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function activityTitle(a: CatTowerActivity) {
  if (a.title?.trim()) return a.title.trim()
  const t = (a.activityType ?? '').toUpperCase()
  if (t.includes('REVIEW')) return '리뷰 작성'
  if (t.includes('EVENT') || t.includes('FESTIVAL') || t.includes('CHECKIN')) return '행사 참여'
  if (t.includes('GROUP') || t.includes('RECRUIT')) return '모임 활동'
  return a.activityType || '활동'
}

export default function CatTowerActivityScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets()
  const [items, setItems] = useState<CatTowerActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const page = await fetchMyCatTowerPage()
      setItems(page.activities ?? [])
    } catch {
      setError('활동 목록을 불러오지 못했습니다.')
      setItems([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: 12 + insets.top, paddingBottom: 32 + insets.bottom },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            void load()
          }}
          tintColor="#FF6B35"
        />
      }
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ 캣타워</Text>
        </TouchableOpacity>
        <Text style={styles.title}>활동</Text>
        <View style={{ width: 64 }} />
      </View>

      <Text style={styles.hint}>갤러리·동선 기록은 발자국 탭에서 확인할 수 있어요</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#FF6B35" />
        </View>
      ) : error ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>아직 활동이 없어요</Text>
          <Text style={styles.emptyText}>행사 참여·리뷰 작성 시 여기에 쌓입니다.</Text>
        </View>
      ) : (
        items.map((item) => (
          <View key={item.activityId} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {activityTitle(item)}
              </Text>
              <Text style={styles.xp}>+{item.temperatureChange ?? 0}</Text>
            </View>
            {item.description ? (
              <Text style={styles.desc} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            <Text style={styles.date}>{formatDate(item.createAt)}</Text>
          </View>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F8' },
  content: { paddingHorizontal: 16, gap: 10 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  back: { fontSize: 16, fontWeight: '700', color: '#FF6B35', width: 64 },
  title: { fontSize: 17, fontWeight: '800', color: '#111827' },
  hint: { fontSize: 11, color: '#9ca3af', marginBottom: 4 },
  center: { paddingVertical: 40, alignItems: 'center' },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: '#111827', marginRight: 8 },
  xp: { fontSize: 13, fontWeight: '800', color: '#FF6B35' },
  desc: { marginTop: 4, fontSize: 12, color: '#6b7280', lineHeight: 18 },
  date: { marginTop: 6, fontSize: 11, color: '#9ca3af' },
  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 6 },
  emptyText: { fontSize: 12, color: '#6b7280', textAlign: 'center', lineHeight: 18 },
})
