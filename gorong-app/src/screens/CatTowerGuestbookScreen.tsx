// ──────────────────────────────────────────────────────────────
// CatTowerGuestbookScreen.tsx — 방명록·방문자 조회
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
import {
  fetchGuestbook,
  fetchMyCatTowerPage,
  fetchVisitorStats,
} from '../services/catTowerApi'
import type { CatTowerGuestbookEntry, CatTowerVisitorStats } from '../types/catTower'
import type { CatTowerStackParamList } from '../navigation/CatTowerStack'

type Props = {
  navigation: StackNavigationProp<CatTowerStackParamList, 'CatTowerGuestbook'>
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function CatTowerGuestbookScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets()
  const [entries, setEntries] = useState<CatTowerGuestbookEntry[]>([])
  const [visitors, setVisitors] = useState<CatTowerVisitorStats>({ todayCount: 0, totalCount: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const page = await fetchMyCatTowerPage()
      const ownerId = page.miniHome.userId
      const [list, stats] = await Promise.all([
        fetchGuestbook(ownerId),
        fetchVisitorStats(ownerId).catch(() => ({ todayCount: 0, totalCount: 0 })),
      ])
      setEntries(list)
      setVisitors(stats)
    } catch {
      setError('방명록을 불러오지 못했습니다.')
      setEntries([])
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
        <Text style={styles.title}>방명록</Text>
        <View style={{ width: 64 }} />
      </View>

      <View style={styles.visitorRow}>
        <View style={styles.visitorBox}>
          <Text style={styles.visitorValue}>{visitors.todayCount}</Text>
          <Text style={styles.visitorLabel}>오늘 방문</Text>
        </View>
        <View style={styles.visitorBox}>
          <Text style={styles.visitorValue}>{visitors.totalCount}</Text>
          <Text style={styles.visitorLabel}>전체 방문</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#FF6B35" />
        </View>
      ) : error ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>아직 방명록이 없어요</Text>
          <Text style={styles.emptyText}>웹에서 다른 유저가 남긴 글이 여기에 표시됩니다.</Text>
        </View>
      ) : (
        entries.map((entry) => (
          <View key={entry.guestbookId} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.author}>{entry.authorNickname || '익명'}</Text>
              <Text style={styles.date}>{formatDate(entry.createAt)}</Text>
            </View>
            <Text style={styles.body}>{entry.content}</Text>
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
    marginBottom: 8,
  },
  back: { fontSize: 16, fontWeight: '700', color: '#FF6B35', width: 64 },
  title: { fontSize: 17, fontWeight: '800', color: '#111827' },
  visitorRow: { flexDirection: 'row', gap: 8 },
  visitorBox: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE4D6',
  },
  visitorValue: { fontSize: 18, fontWeight: '800', color: '#111827' },
  visitorLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  center: { paddingVertical: 40, alignItems: 'center' },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  author: { fontSize: 13, fontWeight: '800', color: '#111827' },
  date: { fontSize: 11, color: '#9ca3af' },
  body: { fontSize: 13, color: '#374151', lineHeight: 20 },
  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 6 },
  emptyText: { fontSize: 12, color: '#6b7280', textAlign: 'center', lineHeight: 18 },
})
