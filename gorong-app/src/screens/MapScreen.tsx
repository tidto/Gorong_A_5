import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import MapView, { Circle, Marker, Polyline } from 'react-native-maps'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
// [수정] ENTER_DWELL_S 추가 import — 카운트다운 표시에 사용
import { useGeofence, ENTER_DWELL_S } from '../hooks/useGeofence'
import { fetchMyParticipations, fetchNearbyVenues, fetchPublicEventDetail, fetchPublicEvents, uploadFileToS3 } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { useTrailStore } from '../store/trailStore'
import { PublicEvent, Venue } from '../types'
import { prepareImageForUpload } from '../utils/imageUpload'

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatEventPeriod(start?: string, end?: string) {
  if (start && end) return `${start} ~ ${end}`
  if (start) return `${start} 시작`
  if (end) return `${end} 종료`
  return '기간 미정'
}

function parseLooseDate(value?: string | null) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d{8}$/.test(trimmed)) {
    const year = Number(trimmed.slice(0, 4))
    const month = Number(trimmed.slice(4, 6)) - 1
    const day = Number(trimmed.slice(6, 8))
    return new Date(year, month, day)
  }
  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function isVenueActiveToday(venue: Venue) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = parseLooseDate(venue.eventStartDate)
  const end = parseLooseDate(venue.eventEndDate)
  if (!start && !end) return true
  if (start && today < start) return false
  if (end) {
    const endOfDay = new Date(end)
    endOfDay.setHours(23, 59, 59, 999)
    if (today > endOfDay) return false
  }
  return true
}

function mapPublicEventToVenue(item: PublicEvent): Venue {
  return {
    id: String(item.contentid),
    name: item.title,
    lat: Number(item.mapy),
    lng: Number(item.mapx),
    radius: 0,
    geofenceEnabled: false,
    address: item.addr1,
    category: item.cat1 ?? 'EVENT',
    imageUrl: item.firstimage,
    eventStartDate: item.eventStartDate,
    eventEndDate: item.eventEndDate,
    overview: item.overview,
  }
}

function mapNearbyVenueToVenue(item: Venue): Venue {
  return { ...item, geofenceEnabled: true }
}

export default function MapScreen() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [showPawPrint, setShowPawPrint] = useState(false)
  const [outsideTimer, setOutsideTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [galleryUploading, setGalleryUploading] = useState(false)

  const mapRef = useRef<MapView | null>(null)
  const insets = useSafeAreaInsets()
  const { setInsideVenueId } = useAuthStore()

  const geofenceVenues = useMemo(
    () => venues.filter((v) => v.geofenceEnabled !== false && v.radius > 0 && isVenueActiveToday(v)),
    [venues],
  )

  // [수정] dwellSeconds 추가 구조분해 — 배지 카운트다운에 사용
  const { insideVenueId, isVerified, dwellSeconds } = useGeofence(geofenceVenues)
  const { isRecording, trail, startRecording, stopRecording, setRecordingVenueId } = useTrailStore()

  const selectedVenue = useMemo(
    () => venues.find((v) => v.id === selectedVenueId) ?? null,
    [venues, selectedVenueId],
  )
  const buttonRowBottom = 220 + insets.bottom
  const eventSheetBottomPadding = 24 + insets.bottom

  useEffect(() => {
    setInsideVenueId(insideVenueId)
  }, [insideVenueId, setInsideVenueId])

  useEffect(() => {
    if (!isRecording) {
      setRecordingVenueId(null)
      return
    }
    if (insideVenueId) {
      setRecordingVenueId(insideVenueId)
    }
  }, [isRecording, insideVenueId, setRecordingVenueId])

  const finalizeTrailArt = useCallback(async () => {
    if (!mapRef.current || trail.length < 2) return
    try {
      const snapshotUri = await mapRef.current.takeSnapshot({
        width: 1080, height: 1920, format: 'jpg', quality: 0.85, result: 'file',
      })
      await uploadFileToS3(snapshotUri, `trail-art-${Date.now()}.jpg`, 'TRAIL_ART', true)
    } catch (error) {
      console.error('러닝아트 업로드 실패:', error)
    }
  }, [trail.length])

  const handleGalleryUpload = useCallback(async () => {
    const venueId = insideVenueId ?? selectedVenue?.id ?? null
    if (!venueId) {
      Alert.alert('안내', '지오펜싱 인증 후에만 갤러리 업로드를 사용할 수 있습니다.')
      return
    }

    try {
      setGalleryUploading(true)
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: false,
      })

      if (result.canceled || !result.assets.length) return

      const asset = result.assets[0]
      const prepared = await prepareImageForUpload(asset, `gallery-${venueId}-${Date.now()}.jpg`)
      const response = await uploadFileToS3(prepared.uri, prepared.fileName, 'APP_PHOTO', true, venueId)
      Alert.alert('완료', response.data?.gallerySaved ? '사진이 갤러리에 저장되었습니다.' : '사진 업로드가 완료되었습니다.')
    } catch (error) {
      console.error('갤러리 업로드 실패:', error)
      Alert.alert('안내', '갤러리 업로드에 실패했습니다.')
    } finally {
      setGalleryUploading(false)
    }
  }, [insideVenueId, selectedVenue?.id])

  const handleStopRecording = useCallback(async (
    reason: 'manual' | 'max_duration' | 'left_venue_timeout',
  ) => {
    await stopRecording(reason)
    await finalizeTrailArt()
  }, [stopRecording, finalizeTrailArt])

  useEffect(() => {
    if (isRecording && !insideVenueId && !outsideTimer) {
      const timer = setTimeout(() => handleStopRecording('left_venue_timeout'), 3 * 60 * 1000)
      setOutsideTimer(timer)
      return
    }
    if ((insideVenueId || !isRecording) && outsideTimer) {
      clearTimeout(outsideTimer)
      setOutsideTimer(null)
    }
  }, [isRecording, insideVenueId, outsideTimer, handleStopRecording])

  useEffect(() => {
    return () => { if (outsideTimer) clearTimeout(outsideTimer) }
  }, [outsideTimer])

  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('위치 권한 필요', '지도 기능을 사용하려면 위치 권한이 필요합니다.')
        return
      }
      const loc = await Location.getCurrentPositionAsync({})
      const { latitude, longitude } = loc.coords
      setUserLocation({ lat: latitude, lng: longitude })

      try {
        const [publicResponse, nearbyResponse, participationResponse] = await Promise.allSettled([
          fetchPublicEvents(),
          fetchNearbyVenues(latitude, longitude),
          fetchMyParticipations(),
        ])

        if (publicResponse.status !== 'fulfilled' || nearbyResponse.status !== 'fulfilled') {
          throw new Error('행사 데이터를 불러오지 못했습니다.')
        }

        const participationData = participationResponse.status === 'fulfilled'
          ? participationResponse.value.data : []

        const publicVenues = publicResponse.value.data
          .map(mapPublicEventToVenue)
          .filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lng))

        const nearbyVenues = nearbyResponse.value.data
          .map(mapNearbyVenueToVenue)
          .filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lng))

        const soloParticipationIds = new Set(
          participationData
            .filter((item) => item.participationType === 'SOLO')
            .map((item) => item.eventContentId?.trim())
            .filter((v): v is string => Boolean(v))
        )

        const publicVenueById = new Map(publicVenues.map((v) => [v.id, v]))
        const missingSoloIds = Array.from(soloParticipationIds).filter((id) => !publicVenueById.has(id))

        const fallbackResponses = await Promise.allSettled(
          missingSoloIds.map(async (id) => {
            const response = await fetchPublicEventDetail(id)
            return mapPublicEventToVenue(response.data)
          })
        )

        const fallbackSoloVenues = fallbackResponses
          .filter((item): item is PromiseFulfilledResult<Venue> => item.status === 'fulfilled')
          .map((item) => item.value)
          .filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lng))

        const venueById = new Map<string, Venue>()
        ;[...publicVenues, ...fallbackSoloVenues].forEach((v) => venueById.set(v.id, v))

        nearbyVenues.forEach((v) => {
          const current = venueById.get(v.id)
          venueById.set(v.id, { ...(current ?? v), ...v, radius: v.radius, geofenceEnabled: true })
        })

        soloParticipationIds.forEach((venueId) => {
          const current = venueById.get(venueId)
          if (!current) return
          venueById.set(venueId, {
            ...current,
            radius: current.radius > 0 ? current.radius : 300,
            geofenceEnabled: true,
          })
        })

        const mergedVenues = Array.from(venueById.values())
        setVenues(mergedVenues)
        setSelectedVenueId((current) => current ?? mergedVenues[0]?.id ?? null)
      } catch (err) {
        console.error('주변 행사 조회 실패:', err)
        Alert.alert('오류', '주변 행사 정보를 불러오지 못했습니다.')
      }
    })()
  }, [])

  useEffect(() => {
    if (!isVerified || !insideVenueId) return
    const venue = venues.find((v) => v.id === insideVenueId)
    Alert.alert('도착 인증 ✅', `${venue?.name ?? '행사장'}에 도착했습니다!`)
  }, [isVerified, insideVenueId, venues])

  const visibleVenues = useMemo(() => {
    if (!userLocation) return venues.slice(0, 5)
    return [...venues]
      .map((v) => ({ ...v, distance: distanceMeters(userLocation.lat, userLocation.lng, v.lat, v.lng) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8)
  }, [venues, userLocation])

  if (!userLocation) {
    return (
      <View style={styles.center}>
        <Text>위치 정보를 불러오는 중...</Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        showsUserLocation
        initialRegion={{
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {venues.map((venue) => (
          <React.Fragment key={venue.id}>
            <Marker
              coordinate={{ latitude: venue.lat, longitude: venue.lng }}
              title={venue.name}
              description={venue.address}
              pinColor={insideVenueId === venue.id ? 'green' : 'red'}
              onPress={() => setSelectedVenueId(venue.id)}
            />
            {venue.geofenceEnabled !== false && venue.radius > 0 && (
              <Circle
                center={{ latitude: venue.lat, longitude: venue.lng }}
                radius={venue.radius}
                strokeWidth={insideVenueId === venue.id ? 4 : 2}
                strokeColor={insideVenueId === venue.id ? 'rgba(255,107,53,0.95)' : 'rgba(59,130,246,0.75)'}
                fillColor={insideVenueId === venue.id ? 'rgba(255,107,53,0.30)' : 'rgba(59,130,246,0.16)'}
              />
            )}
          </React.Fragment>
        ))}

        {isRecording && trail.length > 1 && !showPawPrint && (
          <Polyline coordinates={trail} strokeColor="#FF6B35" strokeWidth={3} />
        )}

        {isRecording && showPawPrint && trail.map((point, i) =>
          i % 5 === 0 ? (
            <Marker key={i} coordinate={{ latitude: point.latitude, longitude: point.longitude }}>
              <Text style={{ fontSize: 16 }}>🐾</Text>
            </Marker>
          ) : null
        )}
      </MapView>

      {selectedVenue && (
        <View style={[styles.previewCard, { top: 96 + insets.top }]}>
          <Image
            source={selectedVenue.imageUrl ? { uri: selectedVenue.imageUrl } : require('../../assets/icon.png')}
            style={styles.previewImage}
          />
          <View style={styles.previewText}>
            <Text style={styles.previewTitle} numberOfLines={1}>{selectedVenue.name}</Text>
            <Text style={styles.previewSub} numberOfLines={2}>{selectedVenue.address}</Text>
          </View>
        </View>
      )}

      <View style={[styles.eventSheet, { paddingBottom: eventSheetBottomPadding }]}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>주변 행사</Text>
          <Text style={styles.sheetSub}>
            {selectedVenueId ? '선택된 행사와 지오펜싱 반경을 확인하세요' : '행사 마커를 눌러 상세를 확인하세요'}
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardRow}>
          {visibleVenues.map((venue) => {
            const isSelected = selectedVenueId === venue.id
            const isInside = insideVenueId === venue.id
            return (
              <TouchableOpacity
                key={venue.id}
                style={[styles.eventCard, isSelected && styles.eventCardSelected, isInside && styles.eventCardInside]}
                onPress={() => setSelectedVenueId(venue.id)}
                activeOpacity={0.85}
              >
                <Text style={styles.eventCardTitle} numberOfLines={1}>{venue.name}</Text>
                <Text style={styles.eventCardPeriod} numberOfLines={1}>
                  {formatEventPeriod(venue.eventStartDate, venue.eventEndDate)}
                </Text>
                <Text style={styles.eventCardAddress} numberOfLines={2}>{venue.address}</Text>
                <View style={styles.eventCardFooter}>
                  <Text style={styles.eventCardRadius}>
                    {venue.geofenceEnabled === false || venue.radius <= 0 ? '지오펜싱 없음' : `반경 ${venue.radius}m`}
                  </Text>
                  {isInside && (
                    <Text style={styles.eventCardBadge}>
                      {isVerified ? '✅ 인증완료' : '진입 중'}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      <View style={[styles.buttonRow, { bottom: buttonRowBottom }]}>
        <TouchableOpacity
          style={[styles.btn, isRecording && styles.btnActive]}
          onPress={isRecording ? () => handleStopRecording('manual') : () => startRecording(insideVenueId)}
        >
          <Text style={styles.btnText}>
            {isRecording ? '트레일 기록 종료' : '트레일 기록 시작'}
          </Text>
        </TouchableOpacity>

        {isRecording && (
          <TouchableOpacity style={styles.btn} onPress={() => setShowPawPrint((prev) => !prev)}>
            <Text style={styles.btnText}>{showPawPrint ? '선으로 보기' : '발자국 보기'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── [수정] 지오펜스 배지: 카운트다운 + 진행바 + 인증완료 색상 변경 ── */}
      {insideVenueId && (
        <View style={[styles.badgeWrap, isVerified && styles.badgeWrapVerified]}>
          {/* 인증 상태에 따라 배경색 변경 */}
          <View style={[styles.badge, isVerified && styles.badgeVerified]}>
            <Text style={[styles.badgeText, isVerified && styles.badgeTextVerified]}>
              {isVerified
                ? '✅ 도착 인증 완료'
                : `📍 행사장 진입 중 · ${ENTER_DWELL_S - dwellSeconds}초 후 자동 인증`}
            </Text>
            {isVerified && (
              <Text style={[styles.badgeSubText, styles.badgeTextVerified]}>
                이제 사진을 갤러리에 바로 올릴 수 있습니다.
              </Text>
            )}
          </View>

          {/* 인증 전에만 진행바 표시 */}
          {!isVerified && (
            <View style={styles.dwellBarBg}>
              <View
                style={[
                  styles.dwellBarFill,
                  { width: `${(dwellSeconds / ENTER_DWELL_S) * 100}%` as any },
                ]}
              />
            </View>
          )}

          {isVerified && (
            <TouchableOpacity
              style={[styles.galleryBtn, galleryUploading && styles.galleryBtnDisabled]}
              onPress={handleGalleryUpload}
              disabled={galleryUploading}
            >
              <Text style={styles.galleryBtnText}>
                {galleryUploading ? '업로드 중...' : '갤러리에 사진 올리기'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  buttonRow: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', gap: 8 },
  btn: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  btnActive: { backgroundColor: '#FF6B35' },
  btnText: { fontWeight: '600', color: '#333' },

  // ── [수정] 배지 스타일 ──────────────────────────────────────
  badgeWrap: {
    position: 'absolute',
    top: 92,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 4,
  },
  badgeWrapVerified: {
    top: 88,
  },
  badge: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // 인증 완료 시 주황색 배경
  badgeVerified: {
    backgroundColor: '#FF6B35',
  },
  badgeText: {
    fontWeight: '700',
    fontSize: 13,
    color: '#333',
  },
  badgeSubText: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
  },
  // 인증 완료 시 흰색 텍스트
  badgeTextVerified: {
    color: '#fff',
  },
  // 진행바 배경
  dwellBarBg: {
    width: 200,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
  },
  // 진행바 채움 (dwellSeconds / ENTER_DWELL_S 비율로 width 결정)
  dwellBarFill: {
    height: 4,
    backgroundColor: '#FF6B35',
    borderRadius: 2,
  },
  galleryBtn: {
    marginTop: 6,
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  galleryBtnDisabled: {
    backgroundColor: '#6b7280',
  },
  galleryBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  // ──────────────────────────────────────────────────────────

  previewCard: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 18, padding: 12, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 14, elevation: 8 },
  previewImage: { width: 64, height: 64, borderRadius: 14, backgroundColor: '#f3f4f6' },
  previewText: { flex: 1 },
  previewTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  previewSub: { marginTop: 4, fontSize: 12, color: '#6b7280', lineHeight: 16 },
  eventSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.98)', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 12, paddingHorizontal: 16, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, elevation: 10 },
  sheetHeader: { marginBottom: 10 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  sheetSub: { marginTop: 4, fontSize: 12, color: '#6b7280' },
  cardRow: { gap: 10, paddingBottom: 4 },
  eventCard: { width: 180, borderRadius: 16, padding: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e5e7eb' },
  eventCardSelected: { borderColor: '#FF6B35', backgroundColor: '#fff7f2' },
  eventCardInside: { borderColor: '#FF6B35', backgroundColor: 'rgba(255,107,53,0.12)' },
  eventCardTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
  eventCardPeriod: { marginTop: 4, fontSize: 12, color: '#FF6B35', fontWeight: '700' },
  eventCardAddress: { marginTop: 8, fontSize: 12, color: '#4b5563', lineHeight: 16 },
  eventCardFooter: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventCardRadius: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  eventCardBadge: { fontSize: 11, color: '#FF6B35', fontWeight: '800' },
})
