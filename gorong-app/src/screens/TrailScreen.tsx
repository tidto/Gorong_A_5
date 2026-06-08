// ──────────────────────────────────────────────────────────────
// TrailScreen.tsx — 트레일 기록 히스토리 + 행사별 사진 조회
//
// 자연스러운 연결 구조:
//   트레일 히스토리(venueId)  →  갤러리(referenceId)  →  사진 목록
//
//   trailHistory[].venueId === gallery.referenceId 일 때
//   해당 카드 아래에 사진 썸네일을 붙여서 보여줌
//
//   "전체 사진" 버튼은 맨 위 요약 섹션에만 두고,
//   각 히스토리 카드는 해당 행사 사진만 표시
// ──────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage'
import React, { useCallback, useEffect, useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import {
  Dimensions,
  Image,
  Modal,
  RefreshControl,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TRAIL_HISTORY_KEY, TrailHistoryEntry, useTrailStore } from '../store/trailStore'
import api, { uploadFileToS3 } from '../services/api'
import { prepareImageForUpload } from '../utils/imageUpload'

const SCREEN_W = Dimensions.get('window').width
const THUMB = (SCREEN_W - 32 - 8 * 2) / 4   // 4열 썸네일

// ── 백엔드 갤러리 타입 ────────────────────────────────────────
interface GalleryImage {
  galleryImageId: number
  imageUrl: string
  locationName: string | null
  takenAt: string | null
  createAt: string

}
interface Gallery {
  galleryId: number
  title: string
  referenceId: string | null  // venueId 와 매핑
  images: GalleryImage[]
}

type TrailSessionDetail = TrailHistoryEntry & {
  localTrailSize?: number
}

function formatTime(ms: number) {
  return new Date(ms).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}
function formatDuration(start: number, end: number) {
  const diff = Math.max(0, end - start)
  const m = Math.floor(diff / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return `${m}분 ${s}초`
}
function formatDate(iso: string | null) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  } catch { return '' }
}

export default function TrailScreen() {
  const insets = useSafeAreaInsets()
  const { isRecording, trail, startRecording, stopRecording, startedAt } = useTrailStore()

  const [history, setHistory] = useState<TrailSessionDetail[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [galleryUploading, setGalleryUploading] = useState(false)

  // ── 갤러리 데이터 (venueId → 사진 목록 매핑) ──────────────
  const [galleryMap, setGalleryMap] = useState<Record<string, GalleryImage[]>>({})
  const [allImages, setAllImages] = useState<(GalleryImage & { venueId: string })[]>([])
  // 전체 사진 미리보기
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    const raw = await AsyncStorage.getItem(TRAIL_HISTORY_KEY)
    const parsed = raw ? (JSON.parse(raw) as TrailHistoryEntry[]) : []

    const withSize = await Promise.all(
      parsed.map(async (entry) => {
        try {
          const sessionRaw = await AsyncStorage.getItem(`gorong-trail-session-${entry.id}`)
          const pts = sessionRaw ? JSON.parse(sessionRaw) as any[] : []
          return { ...entry, localTrailSize: pts.length }
        } catch {
          return { ...entry, localTrailSize: undefined }
        }
      })
    )
    setHistory(withSize)
  }, [])

  // ── 갤러리 로드: GET /api/minihomes/me/page ───────────────
  // referenceId가 있는 갤러리만 venueId 기준으로 map 생성
  const loadGallery = useCallback(async () => {
    try {
      const res = await api.get<{ galleries: Gallery[] }>('/minihomes/me/page')
      const galleries = res.data.galleries ?? []

      // venueId(referenceId) → 이미지 배열 매핑
      const map: Record<string, GalleryImage[]> = {}
      const flat: (GalleryImage & { venueId: string })[] = []

      for (const g of galleries) {
        if (!g.images.length) continue
        if (g.referenceId) {
          // 행사별 사진 (upload 시 referenceId = venueId 로 저장된 것)
          map[g.referenceId] = [...(map[g.referenceId] ?? []), ...g.images]
        }
        // 전체 사진 목록 (venueId 있는 것만)
        for (const img of g.images) {
          flat.push({ ...img, venueId: g.referenceId ?? '' })
        }
      }

      setGalleryMap(map)
      setAllImages(flat.sort((a, b) =>
        new Date(b.createAt ?? 0).getTime() - new Date(a.createAt ?? 0).getTime()
      ))
    } catch (err) {
      // 갤러리 로드 실패는 조용히 처리 (트레일 히스토리는 정상 표시)
      console.warn('[TrailScreen] 갤러리 로드 실패:', err)
    }
  }, [])

  useEffect(() => {
    loadHistory()
    loadGallery()
  }, [loadHistory, loadGallery])

  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([loadHistory(), loadGallery()])
    setRefreshing(false)
  }

  const activeMinutes = startedAt
    ? Math.max(0, Math.floor((Date.now() - startedAt) / 60000))
    : 0

  const handleToggleRecording = async () => {
    if (isRecording) {
      await stopRecording('manual')
      await loadHistory()
    } else {
      await startRecording()
    }
  }

  const handleGalleryUpload = useCallback(async () => {
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
      const prepared = await prepareImageForUpload(asset, `gallery-${Date.now()}.jpg`)
      const response = await uploadFileToS3(prepared.uri, prepared.fileName, 'APP_PHOTO', true)
      Alert.alert('완료', response.data?.gallerySaved ? '사진이 갤러리에 저장되었습니다.' : '사진 업로드가 완료되었습니다.')
      await loadGallery()
    } catch (error) {
      console.error('갤러리 업로드 실패:', error)
      Alert.alert('안내', '갤러리 업로드에 실패했습니다.')
    } finally {
      setGalleryUploading(false)
    }
  }, [loadGallery])

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: 16 + insets.top, paddingBottom: 32 + insets.bottom },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🐾 트레일 기록 히스토리</Text>
          <Text style={styles.headerSub}>
            현재 기록과 행사별 사진을 확인할 수 있습니다.
          </Text>
        </View>

        <View style={styles.uploadCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>내 사진 업로드</Text>
            <Text style={styles.photoCount}>항상 표시</Text>
          </View>
          <Text style={styles.uploadHint}>
            트레일 참여 여부와 상관없이 사진을 갤러리에 올리고, 아래에서 내가 올린 사진을 확인할 수 있습니다.
          </Text>
          <TouchableOpacity
            style={[styles.uploadBtn, galleryUploading && styles.uploadBtnDisabled]}
            onPress={handleGalleryUpload}
            disabled={galleryUploading}
          >
            <Text style={styles.uploadBtnText}>
              {galleryUploading ? '업로드 중...' : '사진 올리기'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── 최근 사진 요약 (전체 사진이 있을 때만 표시) ──────── */}
        <View style={styles.photoSummaryCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>내가 올린 사진</Text>
            <Text style={styles.photoCount}>총 {allImages.length}장</Text>
          </View>
          {allImages.length === 0 ? (
            <Text style={styles.emptyText}>
              아직 업로드한 사진이 없습니다. 위 버튼으로 첫 사진을 올려보세요.
            </Text>
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbRow}
              >
                {allImages.slice(0, 8).map((img) => (
                  <TouchableOpacity
                    key={img.galleryImageId}
                    onPress={() => setPreviewUrl(img.imageUrl)}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: img.imageUrl }} style={styles.summaryThumb} resizeMode="cover" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </View>

        {/* ── 현재 세션 카드 ─────────────────────────────────── */}
        <View style={styles.activeCard}>
          <View style={styles.rowBetween}>
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

        {/* ── 종료된 기록 목록 ───────────────────────────────── */}
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>종료된 기록</Text>
          <Text style={styles.photoCount}>{history.length}개</Text>
        </View>

        {history.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>아직 종료된 기록이 없습니다.</Text>
            <Text style={styles.emptyText}>
              지도에서 트레일을 종료하면 여기서 확인할 수 있습니다.
            </Text>
          </View>
        ) : (
          history.map((item) => {
            // ── 이 트레일 세션의 행사 사진 찾기 ──────────────
            // venueId === gallery.referenceId 로 매핑
            const sessionPhotos = item.venueId ? (galleryMap[item.venueId] ?? []) : []

            return (
              <View key={item.id} style={styles.historyCard}>
                {/* 세션 헤더 */}
                <View style={styles.rowBetween}>
                  <Text style={styles.historyTitle} numberOfLines={1}>
                    {item.venueId ?? '알 수 없는 행사장'}
                  </Text>
                  <Text style={[styles.statusPill, item.serverSaved ? styles.statusOn : styles.statusOff]}>
                    {item.serverSaved ? '서버 저장' : '로컬만'}
                  </Text>
                </View>
                <Text style={styles.historyMeta}>시작: {formatTime(item.startedAt)}</Text>
                <Text style={styles.historyMeta}>종료: {formatTime(item.endedAt)}</Text>
                <Text style={styles.historyMeta}>
                  지속: {formatDuration(item.startedAt, item.endedAt)} · {item.pointCount}포인트
                </Text>
                <Text style={styles.historyReason}>
                  종료 사유:{' '}
                  {item.reason === 'manual'
                    ? '직접 종료'
                    : item.reason === 'max_duration'
                    ? '최대 시간 도달'
                    : '행사장 이탈 후 종료'}
                </Text>

                {/* ── 행사별 사진 (venueId 매핑된 것만 표시) ── */}
                {sessionPhotos.length > 0 && (
                  <View style={styles.sessionPhotos}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.sessionPhotoLabel}>
                        📷 이 행사에서 올린 사진
                      </Text>
                      <Text style={styles.sessionPhotoCount}>{sessionPhotos.length}장</Text>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.thumbRow}
                    >
                      {sessionPhotos.map((img) => (
                        <TouchableOpacity
                          key={img.galleryImageId}
                          onPress={() => setPreviewUrl(img.imageUrl)}
                          activeOpacity={0.85}
                        >
                          <Image
                            source={{ uri: img.imageUrl }}
                            style={styles.sessionThumb}
                            resizeMode="cover"
                          />
                          {img.takenAt && (
                            <View style={styles.thumbDateOverlay}>
                              <Text style={styles.thumbDateText}>{formatDate(img.takenAt)}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* 도착 인증한 행사인데 사진이 없을 때 안내 */}
                {item.venueId && sessionPhotos.length === 0 && (
                  <Text style={styles.noPhotoHint}>
                    아직 이 행사에서 올린 사진이 없습니다
                  </Text>
                )}
              </View>
            )
          })
        )}
      </ScrollView>

      {/* ── 전체 화면 사진 미리보기 모달 ──────────────────────── */}
      <Modal
        visible={Boolean(previewUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUrl(null)}
      >
        <TouchableOpacity
          style={styles.previewBg}
          activeOpacity={1}
          onPress={() => setPreviewUrl(null)}
        >
          {previewUrl && (
            <Image
              source={{ uri: previewUrl }}
              style={styles.previewImg}
              resizeMode="contain"
            />
          )}
          <Text style={styles.previewClose}>✕ 닫기</Text>
        </TouchableOpacity>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#f8f8f8' },
  content:             { paddingHorizontal: 16, gap: 14 },

  header:              { backgroundColor: '#FF6B35', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 18 },
  headerTitle:         { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSub:           { color: '#fff', fontSize: 12, marginTop: 6, opacity: 0.9, lineHeight: 18 },

  rowBetween:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle:        { fontSize: 15, fontWeight: '800', color: '#111827' },
  photoCount:          { fontSize: 12, color: '#6b7280', fontWeight: '600' },

  // 최근 사진 요약 카드
  photoSummaryCard:    { backgroundColor: '#fff', borderRadius: 18, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  uploadCard:          { backgroundColor: '#fff', borderRadius: 18, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1, gap: 10 },
  thumbRow:            { gap: 6, paddingVertical: 4 },
  summaryThumb:        { width: THUMB + 8, height: THUMB + 8, borderRadius: 10, backgroundColor: '#e5e7eb' },
  uploadHint:          { fontSize: 12, color: '#4B5563', lineHeight: 18 },
  uploadBtn:           { backgroundColor: '#FF6B35', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  uploadBtnDisabled:   { backgroundColor: '#9CA3AF' },
  uploadBtnText:       { color: '#fff', fontWeight: '800', fontSize: 14 },

  // 현재 세션 카드
  activeCard:          { backgroundColor: '#fff', borderRadius: 18, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  statusPill:          { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, fontSize: 11, overflow: 'hidden', fontWeight: '800' },
  statusOn:            { backgroundColor: '#DCFCE7', color: '#166534' },
  statusOff:           { backgroundColor: '#E5E7EB', color: '#4B5563' },
  activeStat:          { fontSize: 13, color: '#374151', marginBottom: 6, fontWeight: '600' },
  activeHint:          { fontSize: 12, color: '#6b7280', lineHeight: 18, marginTop: 4 },
  primaryBtn:          { marginTop: 14, backgroundColor: '#FF6B35', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  primaryBtnActive:    { backgroundColor: '#111827' },
  primaryBtnText:      { color: '#fff', fontWeight: '800', fontSize: 14 },

  // 히스토리 카드
  emptyCard:           { backgroundColor: '#fff', borderRadius: 18, padding: 16, alignItems: 'center' },
  emptyTitle:          { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 6 },
  emptyText:           { fontSize: 12, color: '#6b7280', textAlign: 'center', lineHeight: 18 },
  historyCard:         { backgroundColor: '#fff', borderRadius: 18, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1, gap: 5 },
  historyTitle:        { fontSize: 14, fontWeight: '800', color: '#111827', flex: 1, paddingRight: 8 },
  historyMeta:         { fontSize: 12, color: '#374151', lineHeight: 18 },
  historyReason:       { fontSize: 12, color: '#FF6B35', fontWeight: '700' },

  // 세션별 사진 영역
  sessionPhotos:       { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f1f1' },
  sessionPhotoLabel:   { fontSize: 13, fontWeight: '700', color: '#374151' },
  sessionPhotoCount:   { fontSize: 11, color: '#9CA3AF' },
  sessionThumb:        { width: THUMB + 4, height: THUMB + 4, borderRadius: 8, backgroundColor: '#e5e7eb' },
  thumbDateOverlay:    { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)', paddingVertical: 2, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  thumbDateText:       { color: '#fff', fontSize: 9, textAlign: 'center' },
  noPhotoHint:         { marginTop: 8, fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' },

  // 전체화면 미리보기
  previewBg:           { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  previewImg:          { width: SCREEN_W, height: SCREEN_W * 1.25 },
  previewClose:        { position: 'absolute', top: 60, right: 20, color: '#fff', fontSize: 16, fontWeight: '700' },
})
