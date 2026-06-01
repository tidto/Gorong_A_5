import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native'
import { useTrailStore } from '../store/trailStore'
import AsyncStorage from '@react-native-async-storage/async-storage'

const TRAIL_ARCHIVE_KEY = 'gorong-trail-archive-count'

export default function TrailScreen() {
  const { isRecording, trail, startRecording, stopRecording } = useTrailStore()
  const [archiveCount, setArchiveCount] = React.useState(0)

  React.useEffect(() => {
    ;(async () => {
      const raw = await AsyncStorage.getItem(TRAIL_ARCHIVE_KEY)
      setArchiveCount(Number(raw ?? 0))
    })()
  }, [])

  const handleArchive = async () => {
    if (trail.length < 2) return
    const nextCount = archiveCount + 1
    await AsyncStorage.setItem(`gorong-trail-${Date.now()}`, JSON.stringify(trail))
    await AsyncStorage.setItem(TRAIL_ARCHIVE_KEY, String(nextCount))
    setArchiveCount(nextCount)
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🐾 나의 동선 기록</Text>
        <Text style={styles.headerSub}>행사장에서의 경로를 기록해보세요</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{trail.length}</Text>
          <Text style={styles.statLabel}>기록된 포인트</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{isRecording ? '🔴 기록 중' : '⏸ 대기'}</Text>
          <Text style={styles.statLabel}>상태</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{archiveCount}</Text>
          <Text style={styles.statLabel}>보관된 동선</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
        onPress={isRecording ? () => stopRecording('manual') : startRecording}
      >
        <Text style={styles.recordBtnText}>
          {isRecording ? '⏹ 동선 기록 종료' : '▶ 동선 기록 시작'}
        </Text>
      </TouchableOpacity>

      <FlatList
        data={trail.slice().reverse()}
        keyExtractor={(_, i) => String(i)}
        style={styles.list}
        renderItem={({ item, index }) => (
          <View style={styles.pointItem}>
            <Text style={styles.pointIndex}>#{trail.length - index}</Text>
            <Text style={styles.pointCoord}>
              {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>기록된 동선이 없습니다.</Text>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  header: {
    backgroundColor: '#FF6B35', paddingTop: 60,
    paddingBottom: 16, paddingHorizontal: 16,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: '#fff', fontSize: 12, marginTop: 4, opacity: 0.85 },
  statsRow: { flexDirection: 'row', padding: 16, gap: 12 },
  statBox: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12,
    padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  statValue: { fontSize: 20, fontWeight: '700', color: '#333' },
  statLabel: { fontSize: 12, color: '#999', marginTop: 4 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8 },
  recordBtn: {
    flex: 1, backgroundColor: '#FF6B35',
    borderRadius: 12, padding: 16, alignItems: 'center',
  },
  recordBtnActive: { backgroundColor: '#333' },
  recordBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  archiveBtn: { backgroundColor: '#2f855a', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16 },
  archiveBtnDisabled: { backgroundColor: '#9ca3af' },
  archiveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list: { flex: 1, marginTop: 16, paddingHorizontal: 16 },
  pointItem: {
    backgroundColor: '#fff', borderRadius: 10, padding: 12,
    marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  pointIndex: { fontSize: 11, color: '#FF6B35', fontWeight: '700', width: 28 },
  pointCoord: { flex: 1, fontSize: 12, color: '#555' },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40 },
})
