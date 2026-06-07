import AsyncStorage from '@react-native-async-storage/async-storage'
import React from 'react'
import * as ImagePicker from 'expo-image-picker'
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { uploadFileToS3 } from '../services/api'
import { TRAIL_HISTORY_KEY, TrailHistoryEntry, useTrailStore } from '../store/trailStore'

type TrailSessionDetail = TrailHistoryEntry & {
  localTrailSize?: number
}

function formatTime(ms: number) {
  return new Date(ms).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(startedAt: number, endedAt: number) {
  const diff = Math.max(0, endedAt - startedAt)
  const minutes = Math.floor(diff / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  return `${minutes}분 ${seconds}초`
}

export default function TrailScreen() {
  const insets = useSafeAreaInsets()
  const { isRecording, trail, startRecording, stopRecording, startedAt } = useTrailStore()
  const [history, setHistory] = React.useState<TrailSessionDetail[]>([])
  const [refreshing, setRefreshing] = React.useState(false)
  const [galleryUploading, setGalleryUploading] = React.useState(false)

  const loadHistory = React.useCallback(async () => {
    const raw = await AsyncStorage.getItem(TRAIL_HISTORY_KEY)
    const parsed = raw ? (JSON.parse(raw) as TrailHistoryEntry[]) : []

    const withLocalSize = await Promise.all(
      parsed.map(async (entry) => {
        try {
          const sessionRaw = await AsyncStorage.getItem(`gorong-trail-session-${entry.id}`)
          const points = sessionRaw ? JSON.parse(sessionRaw) as Array<{ latitude: number; longitude: number }> : []
          return { ...entry, localTrailSize: points.length }
        } catch {
          return { ...entry, localTrailSize: undefined }
        }
      })
    )

    setHistory(withLocalSize)
  }, [])

  React.useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const onRefresh = async () => {
    setRefreshing(true)
    try {
      await loadHistory()
    } finally {
      setRefreshing(false)
    }
  }

  const activeMinutes = startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 60000)) : 0

  const handleToggleRecording = async () => {
    if (isRecording) {
      await stopRecording('manual')
      await loadHistory()
      return
    }
    await startRecording()
  }

  const handleGalleryUpload = React.useCallback(async () => {
    try {
      setGalleryUploading(true)
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: false,
      })

      if (result.canceled || !result.assets.length) return

      const asset = result.assets[0]
      const fileName = asset.fileName ?? `gallery-${Date.now()}.jpg`
      const response = await uploadFileToS3(asset.uri, fileName, 'APP_PHOTO', true)
      Alert.alert('완료', response.data?.gallerySaved ? '사진이 갤러리에 저장되었습니다.' : '사진 업로드가 완료되었습니다.')
    } catch (error) {
      console.error('갤러리 업로드 실패:', error)
      Alert.alert('안내', '갤러리 업로드에 실패했습니다.')
    } finally {
      setGalleryUploading(false)
    }
  }, [])

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: 16 + insets.top, paddingBottom: 24 + insets.bottom }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🐾 트레일 기록 히스토리</Text>
        <Text style={styles.headerSub}>
          현재 기록과 종료된 세션의 저장 위치를 확인할 수 있습니다.
        </Text>
      </View>

      <View style={styles.activeCard}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>현재 세션</Text>
          <Text style={[styles.statusPill, isRecording ? styles.statusOn : styles.statusOff]}>
            {isRecording ? '기록 중' : '대기'}
          </Text>
        </View>
        <Text style={styles.activeStat}>기록된 포인트: {trail.length}</Text>
        <Text style={styles.activeStat}>
          기록 시간: {isRecording && startedAt ? `${activeMinutes}분 경과` : '진행 중인 기록 없음'}
        </Text>
        <Text style={styles.activeHint}>
          {isRecording
            ? '지도에서 트레일 기록을 종료하면 서버 활동 로그와 로컬 히스토리에 함께 남습니다.'
            : '지도 탭에서 기록을 시작/종료할 수 있습니다.'}
        </Text>
        <TouchableOpacity
          style={[styles.primaryBtn, isRecording && styles.primaryBtnActive]}
          onPress={handleToggleRecording}
        >
          <Text style={styles.primaryBtnText}>
            {isRecording ? '기록 종료' : '기록 시작'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.galleryCard}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>갤러리 업로드</Text>
          <Text style={styles.sectionSub}>자동 저장됨</Text>
        </View>
        <Text style={styles.galleryText}>
          사진을 선택하면 서버 저장 후 갤러리에 자동으로 들어갑니다.
        </Text>
        <TouchableOpacity
          style={[styles.galleryBtn, galleryUploading && styles.galleryBtnDisabled]}
          onPress={handleGalleryUpload}
          disabled={galleryUploading}
        >
          <Text style={styles.galleryBtnText}>
            {galleryUploading ? '업로드 중...' : '사진 올리기'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>종료된 기록</Text>
        <Text style={styles.sectionSub}>{history.length}개</Text>
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>아직 종료된 기록이 없습니다.</Text>
          <Text style={styles.emptyText}>
            지도에서 트레일을 종료하면 여기서 서버/로컬 저장 상태를 확인할 수 있습니다.
          </Text>
        </View>
      ) : (
        history.map((item) => (
          <View key={item.id} style={styles.historyCard}>
            <View style={styles.historyTopRow}>
              <Text style={styles.historyTitle}>{item.venueId}</Text>
              <Text style={[styles.statusPill, item.serverSaved ? styles.statusOn : styles.statusOff]}>
                {item.serverSaved ? '서버 저장' : '서버 실패'}
              </Text>
            </View>
            <Text style={styles.historyMeta}>
              시작: {formatTime(item.startedAt)}
            </Text>
            <Text style={styles.historyMeta}>
              종료: {formatTime(item.endedAt)}
            </Text>
            <Text style={styles.historyMeta}>
              지속시간: {formatDuration(item.startedAt, item.endedAt)}
            </Text>
            <Text style={styles.historyMeta}>
              포인트: {item.pointCount}개 · 로컬 보관: {item.localSaved ? '완료' : '실패'}
            </Text>
            <Text style={styles.historyMeta}>
              로컬 기록: {item.localTrailSize ?? item.pointCount}개 좌표
            </Text>
            <Text style={styles.historyReason}>
              종료 사유: {item.reason === 'manual' ? '직접 종료' : item.reason === 'max_duration' ? '최대 시간 도달' : '행사장 이탈 후 종료'}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  content: { paddingHorizontal: 16, gap: 12 },
  header: {
    backgroundColor: '#FF6B35',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSub: { color: '#fff', fontSize: 12, marginTop: 6, opacity: 0.9, lineHeight: 18 },
  activeCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  sectionSub: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    overflow: 'hidden',
    fontWeight: '800',
  },
  statusOn: { backgroundColor: '#DCFCE7', color: '#166534' },
  statusOff: { backgroundColor: '#E5E7EB', color: '#4B5563' },
  activeStat: { fontSize: 13, color: '#374151', marginBottom: 6, fontWeight: '600' },
  activeHint: { fontSize: 12, color: '#6b7280', lineHeight: 18, marginTop: 4 },
  primaryBtn: {
    marginTop: 14,
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryBtnActive: {
    backgroundColor: '#111827',
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  galleryCard: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  galleryText: { fontSize: 12, color: '#e5e7eb', lineHeight: 18, marginBottom: 12 },
  galleryBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  galleryBtnDisabled: {
    backgroundColor: '#6b7280',
  },
  galleryBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 6 },
  emptyText: { fontSize: 12, color: '#6b7280', textAlign: 'center', lineHeight: 18 },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
    gap: 5,
  },
  historyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  historyTitle: { fontSize: 14, fontWeight: '800', color: '#111827', flex: 1, paddingRight: 8 },
  historyMeta: { fontSize: 12, color: '#374151', lineHeight: 18 },
  historyReason: {
    marginTop: 4,
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '700',
  },
})
