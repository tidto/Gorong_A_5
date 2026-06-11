// ──────────────────────────────────────────────────────────────
// TrailScreen.tsx — 내 발자국 (갤러리 + 기록 히스토리)
// ──────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage'
import React, { useCallback, useEffect, useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  RefreshControl,
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
const THUMB = (SCREEN_W - 32 - 8 * 2) / 4

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
  referenceId: string | null
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

function formatVenueName(venueId: string | null | undefined): string {
  if (!venueId || venueId === 'UNKNOWN_VENUE' || venueId.trim() === '') {
    return '장소 미지정'
  }
  if (/^\d+$/.test(venueId.trim())) {
    return `행사 #${venueId.trim()}`
  }
  return venueId
}

function formatReasonLabel(reason: string) {
  if (reason === 'manual') return '직접 종료'
  if (reason === 'max_duration') return '최대 시간 도달'
  return '행사장 이탈'
}

export default function TrailScreen() {
  const insets = useSafeAreaInsets()
  const { isRecording, trail, startRecording, stopRecording, startedAt } = useTrailStore()

  const [history, setHistory] = useState<TrailSessionDetail[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [galleryUploading, setGalleryUploading] = useState(false)

  const [galleryMap, setGalleryMap] = useState<Record<string, GalleryImage[]>>({})
  const [allImages, setAllImages] = useState<(GalleryImage & { venueId: string })[]>([])
  const [galleryLoadError, setGalleryLoadError] = useState(false)

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
  // [수정 1] 404 등 에러 시 조용히 처리하되 상태 추적, URL 경로는 /api/v1/minihomes/me/page
  const loadGallery = useCallback(async () => {
    try {
      setGalleryLoadError(false)
      // api 인스턴스의 baseURL은 /api/v1 이므로 /minihomes/me/page 로 호출
      const res = await api.get<{ galleries: Gallery[] }>('/minihomes/me/page')
      const galleries = res.data.galleries ?? []

      const map: Record<string, GalleryImage[]> = {}
      const flat: (GalleryImage & { venueId: string })[] = []

      for (const g of galleries) {
        if (!g.images.length) continue
        if (g.referenceId) {
          map[g.referenceId] = [...(map[g.referenceId] ?? []), ...g.images]
        }
        for (const img of g.images) {
          // [수정 1] imageUrl이 실제로 있는 것만 포함
          if (img.imageUrl && img.imageUrl.trim() !== '') {
            flat.push({ ...img, venueId: g.referenceId ?? '' })
          }
        }
      }

      setGalleryMap(map)
      setAllImages(flat.sort((a, b) =>
        new Date(b.createAt ?? 0).getTime() - new Date(a.createAt ?? 0).getTime()
      ))
    } catch (err: any) {
      // 404 = 미니홈 미생성 상태 → 정상으로 처리 (사진 없음)
      const status = err?.response?.status
      if (status === 404) {
        setGalleryMap({})
        setAllImages([])
        return
      }
      console.warn('[TrailScreen] 갤러리 로드 실패:', err)
      setGalleryLoadError(true)
    }
  }, [])

  const uploadSelectedImages = useCallback(async (
    assets: ImagePicker.ImagePickerAsset[],
    venueId?: string | null,
  ) => {
    const normalizedAssets = assets.slice(0, 10)
    if (normalizedAssets.length === 0) return

    // venueId가 없거나 UNKNOWN_VENUE면 referenceId를 undefined로 처리 (자동저장갤러리로 저장)
    const referenceId = venueId && venueId !== 'UNKNOWN_VENUE' ? venueId : undefined

    setGalleryUploading(true)
    try {
      let successCount = 0
      let failureCount = 0

      for (const [index, asset] of normalizedAssets.entries()) {
        try {
          const prepared = await prepareImageForUpload(
            asset,
            `gallery-${Date.now()}-${index + 1}.jpg`,
          )
          console.log('[TrailScreen] 사진 업로드 시작:', {
            current: index + 1,
            total: normalizedAssets.length,
            fileName: prepared.fileName,
            uri: prepared.uri,
            venueId: referenceId ?? 'AUTO_GALLERY',
          })
          const response = await uploadFileToS3(
            prepared.uri,
            prepared.fileName,
            'APP_PHOTO',
            true,
            referenceId,
          )
          successCount += 1
          console.log('[TrailScreen] 사진 업로드 성공:', {
            current: index + 1,
            total: normalizedAssets.length,
            fileName: prepared.fileName,
            status: response.status,
          })
          if (index < normalizedAssets.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 200))
          }
        } catch (err) {
          failureCount += 1
          console.error('[TrailScreen] 사진 업로드 실패:', err)
        }
      }

      if (successCount > 0) {
        await loadGallery()
      }

      if (successCount > 0 && failureCount === 0) {
        Alert.alert('완료', `${successCount}장의 사진이 저장되었습니다.`)
      } else if (successCount > 0) {
        Alert.alert('부분 완료', `${successCount}장 저장, ${failureCount}장 실패`)
      } else {
        console.error('[TrailScreen] 사진 업로드 전체 실패: 모든 요청이 실패했습니다.')
        Alert.alert('업로드 실패', '사진을 올리지 못했습니다. 네트워크 상태와 서버 응답을 확인해 주세요.')
      }
    } catch (error) {
      console.error('사진 업로드 실패:', error)
      Alert.alert('안내', '사진 업로드에 실패했습니다.')
    } finally {
      setGalleryUploading(false)
    }
  }, [loadGallery])

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

  const handleGalleryUpload = useCallback(async (venueId?: string | null) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: 10,
      })

      if (result.canceled || !result.assets.length) return

      await uploadSelectedImages(result.assets, venueId)
    } catch (error: any) {
      console.error('사진 업로드 실패:', error)
      const status = error?.response?.status
      if (status === 403) {
        Alert.alert('인증 필요', '도착 인증이 서버에 기록되지 않았습니다. 행사장 반경 안에서 다시 인증 후 시도해 주세요.')
      } else {
        Alert.alert('안내', '사진 업로드에 실패했습니다.')
      }
    } finally {
      setGalleryUploading(false)
    }
  } , [loadGallery])

  // ── [수정 2] 기록 삭제 ────────────────────────────────────
  const handleDeleteHistory = useCallback(async (itemId: string) => {
    Alert.alert('기록 삭제', '이 발자국 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            const raw = await AsyncStorage.getItem(TRAIL_HISTORY_KEY)
            const current = raw ? (JSON.parse(raw) as TrailHistoryEntry[]) : []
            const updated = current.filter((e) => e.id !== itemId)
            await AsyncStorage.setItem(TRAIL_HISTORY_KEY, JSON.stringify(updated))
            await AsyncStorage.removeItem(`gorong-trail-session-${itemId}`)
            setHistory((prev) => prev.filter((e) => e.id !== itemId))
          } catch (err) {
            console.error('기록 삭제 실패:', err)
            Alert.alert('오류', '기록 삭제에 실패했습니다.')
          }
        },
      },
    ])
  }, [])

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
        {/* ── 헤더 ─────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerEmoji}>🐾</Text>
            <View>
              <Text style={styles.headerTitle}>내 발자국</Text>
              <Text style={styles.headerSub}>기록 · 사진 · 히스토리</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.headerUploadBtn, galleryUploading && styles.headerUploadBtnDisabled]}
            onPress={() => handleGalleryUpload()}
            disabled={galleryUploading}
            activeOpacity={0.75}
          >
            <Text style={styles.headerUploadIcon}>{galleryUploading ? '···' : '＋'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── 갤러리 카드 (사진 + 세션 상태 통합) ────────────── */}
        <View style={styles.galleryCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>갤러리</Text>
            <View style={styles.rowGap}>
              <Text style={styles.galleryCount}>{allImages.length}장</Text>
              <Text style={[styles.statusPill, isRecording ? styles.statusOn : styles.statusOff]}>
                {isRecording ? `기록 중 · ${activeMinutes}분` : '대기 중'}
              </Text>
            </View>
          </View>

          {galleryLoadError && (
            <Text style={styles.errorText}>갤러리를 불러오지 못했습니다. 당겨서 새로고침 해주세요.</Text>
          )}

          {!galleryLoadError && allImages.length === 0 ? (
            <View style={styles.emptyGallery}>
              <Text style={styles.emptyGalleryText}>아직 사진이 없어요</Text>
              <Text style={styles.emptyGalleryHint}>우측 상단 ＋ 버튼으로 첫 사진을 올려보세요</Text>
            </View>
          ) : (
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
                  <Image
                    source={{ uri: img.imageUrl }}
                    style={styles.galleryThumb}
                    resizeMode="cover"
                    onError={() => {
                      setAllImages((prev) => prev.filter((i) => i.galleryImageId !== img.galleryImageId))
                    }}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.divider} />

          <View style={styles.recordRow}>
            <View style={styles.recordInfo}>
              <Text style={styles.recordStat}>
                {isRecording ? `${trail.length}개 포인트 기록 중` : '진행 중인 기록 없음'}
              </Text>
              <Text style={styles.recordHint}>
                {isRecording
                  ? '지도 탭에서 기록을 종료할 수 있습니다'
                  : '지도 탭에서 기록을 시작할 수 있습니다'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
              onPress={handleToggleRecording}
              activeOpacity={0.8}
            >
              <Text style={styles.recordBtnText}>
                {isRecording ? '종료' : '시작'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 섹션 레이블: 발자국 기록 ────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>발자국 기록</Text>
          <Text style={styles.sectionCount}>{history.length}개</Text>
        </View>

        {/* ── 히스토리 목록 ─────────────────────────────────── */}
        {history.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>아직 기록이 없어요</Text>
            <Text style={styles.emptyText}>지도에서 트레일을 종료하면 여기에 쌓입니다.</Text>
          </View>
        ) : (
          history.map((item) => {
            const sessionPhotos = item.venueId && item.venueId !== 'UNKNOWN_VENUE'
              ? (galleryMap[item.venueId] ?? []).filter((img) => img.imageUrl && img.imageUrl.trim() !== '')
              : []

            return (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.historyTitle} numberOfLines={1}>
                    {formatVenueName(item.venueId)}
                  </Text>
                  <View style={styles.rowGap}>
                    <Text style={[styles.statusPill, item.serverSaved ? styles.statusOn : styles.statusOff]}>
                      {item.serverSaved ? '저장됨' : '로컬'}
                    </Text>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteHistory(item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.deleteBtnText}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.historyMeta}>
                  {formatTime(item.startedAt)} · {formatDuration(item.startedAt, item.endedAt)} · {item.pointCount}포인트
                </Text>
                <Text style={styles.historyReason}>{formatReasonLabel(item.reason)}</Text>

                {sessionPhotos.length > 0 && (
                  <View style={styles.sessionPhotos}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.sessionPhotoLabel}>이 행사 사진</Text>
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
                            onError={() => {
                              setGalleryMap((prev) => ({
                                ...prev,
                                [item.venueId]: (prev[item.venueId] ?? []).filter(
                                  (i) => i.galleryImageId !== img.galleryImageId
                                ),
                              }))
                            }}
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

                {/* ── 트레일 아트 이미지 (S3에 업로드된 경로 기록) ── */}
                {item.trailArtUrl ? (
                  <View style={styles.sessionPhotos}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.sessionPhotoLabel}>🗺 트레일 아트</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setPreviewUrl(item.trailArtUrl!)}
                      activeOpacity={0.85}
                      style={{ marginTop: 6 }}
                    >
                      <Image
                        source={{ uri: item.trailArtUrl }}
                        style={styles.trailArtThumb}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  </View>
                ) : null}

                {item.venueId && item.venueId !== 'UNKNOWN_VENUE' && sessionPhotos.length === 0 && (
                  <View style={styles.noPhotoRow}>
                    <Text style={styles.noPhotoHint}>이 행사 사진이 없어요</Text>
                    <TouchableOpacity
                      style={styles.miniUploadBtn}
                      onPress={() => handleGalleryUpload(item.venueId)}
                      disabled={galleryUploading}
                    >
                      <Text style={styles.miniUploadBtnText}>사진 올리기</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )
          })
        )}
      </ScrollView>

      {/* ── [수정 3] 전체 화면 이미지 오버레이 모달 ──────────── */}
      <Modal
        visible={Boolean(previewUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUrl(null)}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={styles.previewBg}
          activeOpacity={1}
          onPress={() => setPreviewUrl(null)}
        >
          {previewUrl && (
            <>
              <Image
                source={{ uri: previewUrl }}
                style={styles.previewImg}
                resizeMode="contain"
              />
              <View style={styles.previewCloseArea}>
                <Text style={styles.previewClose}>✕ 닫기</Text>
              </View>
            </>
          )}
        </TouchableOpacity>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container:             { flex: 1, backgroundColor: '#f8f8f8' },
  content:               { paddingHorizontal: 16, gap: 12 },

  // ── 헤더 ──────────────────────────────────────────────────
  header:                { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  headerLeft:            { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerEmoji:           { fontSize: 28 },
  headerTitle:           { fontSize: 17, fontWeight: '800', color: '#111827' },
  headerSub:             { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  headerUploadBtn:       { width: 38, height: 38, borderRadius: 12, backgroundColor: '#FFF4F0', borderWidth: 1, borderColor: '#FFD5C5', alignItems: 'center', justifyContent: 'center' },
  headerUploadBtnDisabled: { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' },
  headerUploadIcon:      { fontSize: 20, color: '#FF6B35', fontWeight: '600', lineHeight: 24 },

  // ── 공통 ──────────────────────────────────────────────────
  rowBetween:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowGap:                { flexDirection: 'row', alignItems: 'center', gap: 6 },
  divider:               { height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 },
  statusPill:            { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, fontSize: 11, overflow: 'hidden', fontWeight: '700' },
  statusOn:              { backgroundColor: '#DCFCE7', color: '#166534' },
  statusOff:             { backgroundColor: '#F3F4F6', color: '#6B7280' },
  errorText:             { fontSize: 12, color: '#ef4444', marginTop: 6 },

  // ── 갤러리 카드 ───────────────────────────────────────────
  galleryCard:           { backgroundColor: '#fff', borderRadius: 18, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  cardTitle:             { fontSize: 15, fontWeight: '800', color: '#111827' },
  galleryCount:          { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  thumbRow:              { gap: 6, paddingVertical: 4 },
  galleryThumb:          { width: THUMB + 8, height: THUMB + 8, borderRadius: 10, backgroundColor: '#e5e7eb' },
  emptyGallery:          { paddingVertical: 18, alignItems: 'center' },
  emptyGalleryText:      { fontSize: 14, fontWeight: '700', color: '#9CA3AF' },
  emptyGalleryHint:      { fontSize: 12, color: '#C4C9D4', marginTop: 4 },

  // 기록 제어 행
  recordRow:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  recordInfo:            { flex: 1 },
  recordStat:            { fontSize: 13, fontWeight: '700', color: '#374151' },
  recordHint:            { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  recordBtn:             { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10, backgroundColor: '#FF6B35' },
  recordBtnActive:       { backgroundColor: '#111827' },
  recordBtnText:         { color: '#fff', fontWeight: '800', fontSize: 13 },

  // ── 섹션 헤더 ─────────────────────────────────────────────
  sectionHeader:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  sectionLabel:          { fontSize: 12, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase' },
  sectionCount:          { fontSize: 12, color: '#C4C9D4', fontWeight: '600' },

  // ── 히스토리 카드 ─────────────────────────────────────────
  emptyCard:             { backgroundColor: '#fff', borderRadius: 18, padding: 20, alignItems: 'center' },
  emptyTitle:            { fontSize: 14, fontWeight: '800', color: '#9CA3AF', marginBottom: 4 },
  emptyText:             { fontSize: 12, color: '#C4C9D4', textAlign: 'center', lineHeight: 18 },
  historyCard:           { backgroundColor: '#fff', borderRadius: 18, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1, gap: 4 },
  historyTitle:          { fontSize: 14, fontWeight: '800', color: '#111827', flex: 1, paddingRight: 8 },
  historyMeta:           { fontSize: 12, color: '#6B7280', lineHeight: 18 },
  historyReason:         { fontSize: 11, color: '#FF6B35', fontWeight: '700' },
  deleteBtn:             { padding: 4, borderRadius: 8, backgroundColor: '#FEE2E2' },
  deleteBtnText:         { fontSize: 14 },

  // 세션별 사진
  sessionPhotos:         { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  sessionPhotoLabel:     { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  sessionPhotoCount:     { fontSize: 11, color: '#C4C9D4' },
  sessionThumb:           { width: THUMB + 4, height: THUMB + 4, borderRadius: 8, backgroundColor: '#e5e7eb' },
  trailArtThumb:          { width: '100%', height: 160, borderRadius: 10, backgroundColor: '#e5e7eb' },
  thumbDateOverlay:      { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)', paddingVertical: 2, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  thumbDateText:         { color: '#fff', fontSize: 9, textAlign: 'center' },
  noPhotoRow:            { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  noPhotoHint:           { fontSize: 11, color: '#C4C9D4', fontStyle: 'italic', flex: 1 },
  miniUploadBtn:         { backgroundColor: '#FF6B35', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  miniUploadBtnText:     { color: '#fff', fontSize: 11, fontWeight: '700' },

  // 전체화면 미리보기
  previewBg:             { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  previewImg:            { width: SCREEN_W, height: SCREEN_W * 1.4, borderRadius: 4 },
  previewCloseArea:      { position: 'absolute', top: 56, right: 20 },
  previewClose:          { color: '#fff', fontSize: 16, fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
})
