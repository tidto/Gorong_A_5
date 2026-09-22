// ──────────────────────────────────────────────────────────────
// CatTowerScreen.tsx — 캣타워 홈 (성장·프로필·방문자 조회)
// 발자국과 분리. 3D/Rive/꾸미기 없음.
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
import { fetchMyCatTowerPage, fetchVisitorStats, formatGrowthStage } from '../services/catTowerApi'
import type { CatTowerPage, CatTowerVisitorStats } from '../types/catTower'
import type { CatTowerStackParamList } from '../navigation/CatTowerStack'

type Props = {
  navigation: StackNavigationProp<CatTowerStackParamList, 'CatTowerHome'>
}

export default function CatTowerScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets()
  const [page, setPage] = useState<CatTowerPage | null>(null)
  const [visitors, setVisitors] = useState<CatTowerVisitorStats>({ todayCount: 0, totalCount: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = await fetchMyCatTowerPage()
      setPage(data)
      const ownerId = data.miniHome?.userId
      if (ownerId) {
        try {
          const stats = await fetchVisitorStats(ownerId)
          setVisitors(stats)
        } catch {
          setVisitors({ todayCount: 0, totalCount: 0 })
        }
      }
    } catch (e: any) {
      const status = e?.response?.status
      if (status === 404) {
        setPage(null)
        setError('캣타워가 아직 없습니다. 웹에서 고냥이를 먼저 만들어 주세요.')
      } else {
        setError('캣타워 정보를 불러오지 못했습니다.')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    void load()
  }, [load])

  const catName = page?.miniHome?.cat?.catName ?? '고냥이'
  const nickname = page?.ownerNickname ?? '나'
  const stage = formatGrowthStage(page?.stats?.growthStage)
  const activityCount = page?.stats?.activityCount ?? 0
  const exp = page?.stats?.temperatureTotal ?? 0
  const level = page?.stats?.level ?? 1

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: 16 + insets.top, paddingBottom: 32 + insets.bottom },
      ]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
    >
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🐱</Text>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>캣타워</Text>
          <Text style={styles.headerSub}>성장 · 방문 · 활동 조회</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#FF6B35" />
        </View>
      ) : error && !page ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>안내</Text>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarEmoji}>😺</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.catName}>{catName}</Text>
                <Text style={styles.nickname}>{nickname}의 캣타워</Text>
                <View style={styles.badgeRow}>
                  <Text style={styles.badge}>{stage}</Text>
                  <Text style={styles.meta}>Lv.{level}</Text>
                </View>
              </View>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{activityCount}</Text>
                <Text style={styles.statLabel}>활동</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{exp}</Text>
                <Text style={styles.statLabel}>경험치</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{visitors.todayCount}</Text>
                <Text style={styles.statLabel}>오늘 방문</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{visitors.totalCount}</Text>
                <Text style={styles.statLabel}>전체 방문</Text>
              </View>
            </View>

            <Text style={styles.hint}>꾸미기·3D는 웹 캣타워에서 이용할 수 있어요</Text>
          </View>

          <TouchableOpacity
            style={styles.menuBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('CatTowerGuestbook')}
          >
            <Text style={styles.menuTitle}>방명록</Text>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('CatTowerActivity')}
          >
            <Text style={styles.menuTitle}>활동</Text>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F8' },
  content: { paddingHorizontal: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  headerEmoji: { fontSize: 28 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  headerSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  center: { paddingVertical: 48, alignItems: 'center' },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFE4D6',
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF3EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFD4BC',
  },
  avatarEmoji: { fontSize: 28 },
  catName: { fontSize: 18, fontWeight: '800', color: '#111827' },
  nickname: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  badge: {
    backgroundColor: '#FF6B35',
    color: '#FFF',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '800',
  },
  meta: { fontSize: 12, fontWeight: '700', color: '#9ca3af' },
  statRow: { flexDirection: 'row', marginTop: 16, gap: 8 },
  statBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statValue: { fontSize: 16, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 10, color: '#6b7280', marginTop: 2 },
  hint: { marginTop: 12, fontSize: 11, color: '#9ca3af', textAlign: 'center' },
  menuBtn: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  menuTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  menuChevron: { fontSize: 22, color: '#9ca3af', fontWeight: '300' },
  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 6 },
  emptyText: { fontSize: 12, color: '#6b7280', textAlign: 'center', lineHeight: 18 },
})
