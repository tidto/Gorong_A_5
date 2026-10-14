import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, AppState, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import * as Location from 'expo-location'
import MapView, { Circle, Marker, Polyline, Region } from 'react-native-maps'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useGeofence, ENTER_DWELL_S } from '../hooks/useGeofence'
import VenueDetailModal from '../components/VenueDetailModal'
import { fetchMyParticipations, fetchNearbyVenues, fetchPublicEventDetail, fetchPublicEvents, fetchWeather, uploadFileToS3 } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { useTrailStore } from '../store/trailStore'
import { PublicEvent, Venue } from '../types'
import { buildAccessibility } from '../utils/accessibility'
// [수정] 유틸/스코어링 로직은 utils/recommend.ts로 분리
import {
  distanceMeters,
  getEffectiveWeather,
  getEffectiveWeatherRaw,
  isVenueActiveToday,
  normalizeWeatherMain,
  recommendVenues,
  weatherEmoji,
  weatherReason,
  WeatherType,
} from '../utils/recommend'

// [수정] 이름을 위치·날씨·주변 장소 공용으로 확장 (셋을 한 번에 갱신하므로)
// 앱을 켜둔 채 30분마다, 또는 백그라운드에서 돌아왔을 때 마지막 갱신 후 10분이 지났으면 다시 조회
const REFRESH_MS = 30 * 60 * 1000
const STALE_MS = 10 * 60 * 1000
// 혼자 참여 신청한 행사에 부여하는 지오펜스 반경(m) — 서버 nearby 목록에 없는 행사용
const SOLO_GEOFENCE_RADIUS_M = 300

// [추가] 발자국 표시 — 좌표 개수가 아니라 '실제 이동 거리' 기준으로 간격을 둠
// (예전: 5번째 좌표마다 → GPS가 튀거나 멈춰 있으면 한곳에 뭉치고, 이동 중엔 듬성듬성)
// 화면에서 발자국끼리 떨어져 보일 간격(px) — 줌 레벨에 맞춰 실제 거리(m)로 환산해서 씀
// (고정 m 간격이면 지도를 축소했을 때 발자국이 겹쳐서 검은 띠처럼 보임)
const PAW_SPACING_PX = 36
const PAW_MIN_SPACING_M = 10
// 발자국이 너무 많아지면(긴 이동) 간격을 자동으로 넓혀서 마커 수를 제한
const MAX_PAWS = 300
const SCREEN_H = Dimensions.get('window').height

// [추가] 러닝아트 캡처 상수
// takeSnapshot 은 좌표를 받지 않고 '지도에 지금 그려진 것'만 담는다.
// 따라서 캡처 전에 ① 폴리라인을 확실히 마운트시키고 ② 카메라를 트레일에 맞춘 뒤
// ③ 실제 렌더가 끝난 다음에 촬영해야 한다.
// EDGE_PADDING 의 bottom 은 하단 버튼 시트(buttonRowBottom)가 가리는 만큼의 여백이다.
const TRAIL_ART_EDGE_PADDING = { top: 120, right: 70, bottom: 300, left: 70 }
// onRegionChangeComplete 가 아예 오지 않는 경우를 대비한 안전 타임아웃
const REGION_SETTLE_TIMEOUT_MS = 1500
// 상태 변경 후 네이티브 뷰 갱신이 반영될 때까지의 최소 대기
const PAINT_SETTLE_MS = 80

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// 발자국 마커 — 안드로이드에서 마커 안 뷰가 계속 다시 그려지면 느려지고 일부가 사라지므로
// 처음 잠깐만 추적하고 이후엔 멈춤(tracksViewChanges=false). React.memo로 이미 찍힌 발자국은 다시 그리지 않음
const PawMarker = React.memo(function PawMarker({ latitude, longitude }: { latitude: number; longitude: number }) {
  const [tracks, setTracks] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setTracks(false), 600)
    return () => clearTimeout(t)
  }, [])
  return (
      <Marker
          coordinate={{ latitude, longitude }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={tracks}
      >
        <Text style={{ fontSize: 16 }}>🐾</Text>
      </Marker>
  )
})

// [추가] 내 위치 버튼 아이콘 — 풍선 핀(📍)은 '장소 표시'처럼 보여서 GPS 조준(⌖) 모양으로 교체
// 이모지 대신 View로 그려서 기기/OS 상관없이 같은 모양으로 보임
function LocateIcon() {
  return (
      <View style={styles.locateIconBox}>
        <View style={styles.locateRing}>
          <View style={styles.locateDot} />
        </View>
        <View style={[styles.locateTick, styles.locateTickTop]} />
        <View style={[styles.locateTick, styles.locateTickBottom]} />
        <View style={[styles.locateTick, styles.locateTickLeft]} />
        <View style={[styles.locateTick, styles.locateTickRight]} />
      </View>
  )
}

// [추가] 카테고리 필터 — 웹(Home.tsx)의 CATEGORY_TABS와 동일한 TourAPI 대분류 기준
// venue.category는 TourAPI cat1 코드(A01~A05)를 그대로 담고 있어 접두어 비교로 필터링
const CATEGORY_TABS: { id: string; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'A01', label: '자연' },
  { id: 'A02', label: '문화' },
  { id: 'A03', label: '레저' },
  { id: 'A04', label: '쇼핑' },
]

function formatEventPeriod(start?: string, end?: string) {
  if (start && end) return `${start} ~ ${end}`
  if (start) return `${start} 시작`
  if (end) return `${end} 종료`
  return '기간 제한 없음'
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
    tel: item.tel,
    accessibility: buildAccessibility(item),
  }
}

function mapNearbyVenueToVenue(item: Venue): Venue {
  return { ...item, geofenceEnabled: true }
}

export default function MapScreen() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  // [추가] 상세페이지 모달에 띄울 장소 (지도 focus와는 별개 상태)
  const [detailVenue, setDetailVenue] = useState<Venue | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [showPawPrint, setShowPawPrint] = useState(false)
  // [추가] 러닝아트 캡처 중인지 — 캡처 순간에만 폴리라인을 발자국 모드와 무관하게 그린다
  const [isCapturingTrailArt, setIsCapturingTrailArt] = useState(false)
  // 지도 확대 정도(latitudeDelta의 log2를 0.5 단위로 반올림) — 줌이 바뀔 때만 발자국 간격을 다시 계산
  const [zoomBucket, setZoomBucket] = useState(Math.round(Math.log2(0.05) * 2) / 2)
  const [outsideTimer, setOutsideTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [isStoppingTrail, setIsStoppingTrail] = useState(false)
  // [수정] 기본값 null — 날씨 조회 실패와 '맑음'을 구분
  const [weatherState, setWeatherState] = useState<WeatherType | null>(null)
  // [수정] 점수용으로 4단계(Clear/Clouds/Rain/Snow)로 뭉개기 전의 원본 main 값도 보관
  // (Drizzle·Thunderstorm·Fog 등을 이모지에서 구분해 보여주기 위함)
  const [weatherRaw, setWeatherRaw] = useState<string | null>(null)
  // 추천/주변행사 탭 전환
  const [activeTab, setActiveTab] = useState<'recommended' | 'nearby'>('recommended')
  // [추가] 카테고리 필터 — '전체'가 기본값
  const [activeCategory, setActiveCategory] = useState<string>('all')
  // [수정] "트레일 기록 시작" 버튼이 하단 카드 시트(eventSheet)와 겹치는 문제
  // - 기존엔 버튼 위치가 220(고정값)이었는데, 추천 근거 문구(weatherNote) 한 줄이 추가되며
  //   시트 실제 높이가 늘어나 겹치게 됨
  // - 고정값 대신 시트의 실제 렌더 높이를 onLayout으로 측정해서 그 위에 버튼을 띄움
  const [sheetHeight, setSheetHeight] = useState(0)

  const mapRef = useRef<MapView | null>(null)
  // [추가] 지도 영역 변경 완료를 기다리는 리졸버 — onRegionChangeComplete 에서 resolve 된다
  const regionSettledRef = useRef<(() => void) | null>(null)
  // [추가] 줌 버튼용 — 지도가 멈출 때마다 현재 보이는 영역을 기억
  const regionRef = useRef<Region | null>(null)
  const lastRefreshAt = useRef(0)
  // 서버 nearby 목록에서 온 행사 id — 혼자 참여 취소 시 '원래 지오펜스 대상'인 행사는 유지하기 위해 기록
  const nearbyIdsRef = useRef<Set<string>>(new Set())
  const insets = useSafeAreaInsets()
  const { setInsideVenueId, logout } = useAuthStore()

  const geofenceVenues = useMemo(
      () => venues.filter((v) => v.geofenceEnabled !== false && v.radius > 0 && isVenueActiveToday(v)),
      [venues],
  )

  // dwellSeconds — 배지 카운트다운에 사용
  const { insideVenueId, isVerified, dwellSeconds } = useGeofence(geofenceVenues)
  const { isRecording, trail, startRecording, stopRecording, setRecordingVenueId } = useTrailStore()

  const selectedVenue = useMemo(
      () => venues.find((v) => v.id === selectedVenueId) ?? null,
      [venues, selectedVenueId],
  )
  // 버튼-시트 사이 여백 12 + 측정된 시트 높이(= paddingBottom에 insets.bottom 포함된 실측값)
  // 아직 시트를 한 번도 렌더 못 해 측정값이 0일 때만 기존 고정값으로 대체
  const buttonRowBottom = sheetHeight > 0 ? sheetHeight + 16 : 220 + insets.bottom
  const eventSheetBottomPadding = 12 + insets.bottom

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

  // [추가] 지도 영역 변경이 실제로 끝날 때까지 대기한다.
  // 고정 sleep 은 추측이지만, fitToCoordinates 는 카메라 애니메이션을 거쳐
  // onRegionChangeComplete 를 비로소 울리므로 이벤트로 기다리는 쪽이 정확하다.
  // 이벤트 자체가 오지 않는 경우에도 반드시 타임아웃으로 빠져나간다.
  const waitRegionSettled = useCallback((timeoutMs: number) => (
      new Promise<void>((resolve) => {
        let done = false
        const finish = () => {
          if (done) return
          done = true
          clearTimeout(timer)
          regionSettledRef.current = null
          resolve()
        }
        const timer = setTimeout(finish, timeoutMs)
        regionSettledRef.current = finish
      })
  ), [])

  const finalizeTrailArt = useCallback(async (venueId: string | null): Promise<string | undefined> => {
    const map = mapRef.current
    if (!map || trail.length < 2) return undefined
    // 트레일 기록(venueId)이 없는 러닝아트는 갤러리에 등록하지 않는다.
    // referenceId 없이 업로드하면 백엔드가 REFERENCE_ID가 비어 있는 갤러리에
    // 저장해 버려 트레일과 무관한 이미지가 갤러리에 노출된다.
    if (!venueId) {
      console.warn('러닝아트 업로드 생략 - 트레일 기록 venueId가 없습니다.')
      return undefined
    }

    // 카메라를 되돌리기 위해 캡처 직전의 영역을 기억한다
    const previousRegion = regionRef.current

    // [수정] ④ 캡처가 끝나면 카메라를 원래대로 되돌려 사용자 화면 UX를 기존과 같게 유지한다.
    // 업로드(네트워크 왕복)가 끝날 때까지 지도가 확대된 채 남지 않도록,
    // takeSnapshot 직후(=캡처 완료 직후) 바로 복원한다.
    const restoreCamera = () => {
      setIsCapturingTrailArt(false)
      if (previousRegion) {
        regionRef.current = previousRegion
        map.animateToRegion(previousRegion, 0)
      }
    }

    try {
      // [수정] ① 캡처 순간에는 발자국 표시 설정과 무관하게 폴리라인을 마운트시킨다.
      // 폴리라인은 지도 렌더러가 직접 그리는 오버레이라 takeSnapshot 에 포함되지만,
      // 발자국(🐾)은 Android 에서 tracksViewChanges=false 의 비트맵 캐시 경유라 잡히지 않는다.
      // → 캡처 이미지의 목표는 "지도 + 주황색 경로" 로 고정한다.
      setIsCapturingTrailArt(true)
      await sleep(PAINT_SETTLE_MS)

      // [수정] ② 트레일 전체가 캡처 영역에 들어오도록 카메라를 맞춘다.
      // (기존에는 카메라를 한 번도 맞추지 않아 트레일이 화면 밖이면 캡처에 안 담겼다)
      map.fitToCoordinates(
          trail.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
          { edgePadding: TRAIL_ART_EDGE_PADDING, animated: true },
      )

      // [수정] ③ 실제 영역 변경 완료(onRegionChangeComplete) → zoomBucket 변경 →
      //         pawMarks 재계산 리커밋까지 지난 뒤에 촬영한다.
      //         이 대기가 캡처 '이전' 안정화이고, 기존의 500ms 대기는 캡처 '이후' 복구 대기다.
      await waitRegionSettled(REGION_SETTLE_TIMEOUT_MS)
      await sleep(PAINT_SETTLE_MS)

      const snapshotUri = await map.takeSnapshot({
        width: 1080, height: 1920, format: 'jpg', quality: 0.85, result: 'file',
      })

      // takeSnapshot이 네트워크 소켓을 잠시 블로킹하므로, 복구 대기
      await sleep(500)

      // 캡처가 끝났으므로 카메라와 폴리라인을 원래 상태로 되돌린다
      restoreCamera()

      const res = await uploadFileToS3(
        snapshotUri,
        `trail-art-${Date.now()}.jpg`,
        'TRAIL_ART',
        true,
        venueId,
      )
      const artUrl: string | undefined =
          res.data?.url ?? res.data?.fileUrl ?? res.data?.imageUrl ?? undefined
      return artUrl
    } catch (error) {
      // 캡처 도중 예외가 나도 지도가 확대된 채 남지 않도록 반드시 복원한다
      restoreCamera()
      console.error('러닝아트 업로드 실패:', error)
      return undefined
    }
  }, [trail.length, waitRegionSettled])

  const handleStopRecording = useCallback(async (
      reason: 'manual' | 'max_duration' | 'left_venue_timeout',
  ) => {
    setIsStoppingTrail(true)
    try {
      // stopRecording()이 recordingVenueId를 정리하기 전에 먼저 읽어야 한다.
      const venueId = useTrailStore.getState().recordingVenueId ?? null
      const trailArtUrl = await finalizeTrailArt(venueId)
      await stopRecording(reason, venueId, trailArtUrl)
    } finally {
      setIsStoppingTrail(false)
    }
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

  // [추가] 날씨 조회 (최초 로딩 / 앱 복귀 / 주기 갱신에서 공용)
  // 실패하면 이전 값을 그대로 유지 (없으면 null → 날씨 점수 중립)
  const loadWeather = useCallback((lat: number, lng: number) => {
    fetchWeather(lat, lng)
        .then((w) => {
          console.log('[weather] main =', w.main, '/ city =', w.city)
          setWeatherRaw(w.main)
          setWeatherState(normalizeWeatherMain(w.main))
        })
        .catch((err) => console.warn('날씨 조회 실패(이전 값 유지):', err?.message))
  }, [])

  // [추가] 주변 장소(지오펜싱 대상) 재조회 — 위치가 바뀌면 '주변에서 새로 잡히는' 장소가 달라짐
  // 공개 행사 목록(publicVenues)은 위치와 무관해서 다시 안 불러오고, nearby만 갱신해서 merge
  const refreshNearbyVenues = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetchNearbyVenues(lat, lng)
      const nearbyVenues = res.data
          .map(mapNearbyVenueToVenue)
          .filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lng))
      nearbyVenues.forEach((v) => nearbyIdsRef.current.add(v.id))
      setVenues((prev) => {
        const venueById = new Map(prev.map((v) => [v.id, v]))
        nearbyVenues.forEach((v) => {
          const current = venueById.get(v.id)
          venueById.set(v.id, { ...(current ?? v), ...v, radius: v.radius, geofenceEnabled: true })
        })
        return Array.from(venueById.values())
      })
    } catch (err: any) {
      console.warn('주변 장소 갱신 실패(이전 목록 유지):', err?.message)
    }
  }, [])

  // [추가] 위치·날씨·주변 장소를 한 번에 갱신
  // - 앱을 켜둔 채 이동했을 때: 거리 점수·날씨·지오펜싱 대상이 옛 위치 기준으로 멈춰있던 문제 개선
  const refreshLocationAndData = useCallback(async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({})
      const { latitude, longitude } = loc.coords
      lastRefreshAt.current = Date.now()
      setUserLocation({ lat: latitude, lng: longitude })
      loadWeather(latitude, longitude)
      refreshNearbyVenues(latitude, longitude)
    } catch (err: any) {
      console.warn('위치 갱신 실패(이전 위치 유지):', err?.message)
    }
  }, [loadWeather, refreshNearbyVenues])

  // [수정] 30분마다 + 앱이 포그라운드로 돌아왔을 때(10분 이상 지났으면) 위치·날씨·주변 장소 갱신
  useEffect(() => {
    if (!userLocation) return undefined
    const timer = setInterval(refreshLocationAndData, REFRESH_MS)
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && Date.now() - lastRefreshAt.current > STALE_MS) {
        refreshLocationAndData()
      }
    })
    return () => {
      clearInterval(timer)
      sub.remove()
    }
  }, [userLocation, refreshLocationAndData])

  // [추가] 행사 선택 + 지도를 그 행사 위치로 이동 (하단 카드 / 미리보기 카드 탭에서 사용)
  const focusVenue = useCallback((venue: Venue) => {
    setSelectedVenueId(venue.id)
    mapRef.current?.animateToRegion(
        { latitude: venue.lat, longitude: venue.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 },
        500,
    )
  }, [])

  // [추가] 상세페이지 모달에서 '지도에서 보기'를 누르면 모달을 닫고 해당 위치로 이동
  const handleShowOnMapFromDetail = useCallback((venue: Venue) => {
    setDetailVenue(null)
    focusVenue(venue)
  }, [focusVenue])

  // [추가] 상세 모달에서 혼자 참여를 신청/취소하면 지오펜싱 대상을 즉시 반영
  // - 신청: 지오펜스가 없던 행사에 기본 반경을 부여 → 도착 인증 가능
  // - 취소: 서버 nearby 목록에서 온 행사는 그대로 두고, 참여 때문에 켜졌던 행사만 끔
  // - detailVenue는 스냅샷이라 같이 갱신해야 모달의 '지오펜싱' 문구가 바뀜
  const handleParticipationChange = useCallback((venue: Venue, applied: boolean) => {
    const patch = (v: Venue): Venue => {
      if (applied) {
        return { ...v, radius: v.radius > 0 ? v.radius : SOLO_GEOFENCE_RADIUS_M, geofenceEnabled: true }
      }
      if (nearbyIdsRef.current.has(v.id)) return v
      return { ...v, radius: 0, geofenceEnabled: false }
    }
    setVenues((prev) => prev.map((v) => (v.id === venue.id ? patch(v) : v)))
    setDetailVenue((prev) => (prev && prev.id === venue.id ? patch(prev) : prev))
  }, [])

  // [추가] 상세 모달을 열면 공개 행사 상세 API(/api/public/map/{id})로 무장애 정보·소개를 보강
  // - 목록 API(/api/public/map)는 DB에 저장된 값을 그대로 내려주고, 비어 있는 무장애/소개는
  //   상세 API를 처음 호출할 때 서버가 TourAPI에서 채워 넣음 → 목록에서 온 행사도 한 번은 호출해야 함
  // - /venues/nearby 응답에는 무장애 정보가 아예 없음
  // - 행사별로 앱을 켜 둔 동안 1번만 호출 (서버에 없는 행사는 재시도하지 않음, 네트워크 오류만 재시도 허용)
  const detailFetchedRef = useRef<Set<string>>(new Set())
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null)

  useEffect(() => {
    const id = detailVenue?.id
    if (!id || detailFetchedRef.current.has(id)) return
    detailFetchedRef.current.add(id)
    setDetailLoadingId(id)

    fetchPublicEventDetail(id)
        .then((res) => {
          const accessibility = buildAccessibility(res.data)
          const { overview, tel } = res.data
          const enrich = (v: Venue): Venue => ({
            ...v,
            accessibility: accessibility ?? v.accessibility,
            overview: v.overview || overview || undefined,
            tel: v.tel || tel || undefined,
          })
          setVenues((prev) => prev.map((v) => (v.id === id ? enrich(v) : v)))
          setDetailVenue((prev) => (prev && prev.id === id ? enrich(prev) : prev))
        })
        .catch((e) => {
          console.warn('[detail] 무장애 정보 보강 실패:', e?.response?.status ?? e?.message)
          if (!e?.response) detailFetchedRef.current.delete(id) // 응답 자체가 없던 네트워크 오류만 재시도
        })
        .finally(() => setDetailLoadingId((cur) => (cur === id ? null : cur)))
  }, [detailVenue?.id])

  // [추가] 발자국을 찍을 좌표 — 기록된 좌표 '사이'도 채워서 찍음
  // 좌표가 듬성듬성 기록돼도(빠른 이동, 에뮬레이터 위치 점프 등) 선으로 이은 경로를 따라
  // 화면에서 일정한 간격(PAW_SPACING_PX)으로 발자국을 배치 → 선 모드와 같은 구간이 발자국으로도 이어짐
  const pawMarks = useMemo(() => {
    if (!isRecording || !showPawPrint || trail.length === 0) return []

    let total = 0
    for (let i = 1; i < trail.length; i++) {
      total += distanceMeters(trail[i - 1].latitude, trail[i - 1].longitude, trail[i].latitude, trail[i].longitude)
    }
    // 현재 줌에서 화면 PAW_SPACING_PX 만큼에 해당하는 실제 거리(m)
    const metersPerPx = (Math.pow(2, zoomBucket) * 111320) / SCREEN_H
    const spacing = Math.max(PAW_MIN_SPACING_M, metersPerPx * PAW_SPACING_PX, total / MAX_PAWS)

    const out: { latitude: number; longitude: number }[] = [
      { latitude: trail[0].latitude, longitude: trail[0].longitude },
    ]
    let toNext = spacing // 다음 발자국까지 남은 거리(m)
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1]
      const b = trail[i]
      const seg = distanceMeters(a.latitude, a.longitude, b.latitude, b.longitude)
      if (seg === 0) continue
      let pos = 0
      while (seg - pos >= toNext) {
        pos += toNext
        const t = pos / seg
        out.push({
          latitude: a.latitude + (b.latitude - a.latitude) * t,
          longitude: a.longitude + (b.longitude - a.longitude) * t,
        })
        toNext = spacing
      }
      toNext -= seg - pos
    }
    return out
  }, [trail, isRecording, showPawPrint, zoomBucket])

  // [추가] 줌 인/아웃 버튼 — factor 0.5면 확대(2배), 2면 축소(1/2)
  // (제스처 대신 버튼으로도 줌할 수 있게; region 기반이라 Google/Apple 지도 모두 동작)
  const zoomMap = useCallback((factor: number) => {
    const r: Region | null =
        regionRef.current ??
        (userLocation
            ? { latitude: userLocation.lat, longitude: userLocation.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }
            : null)
    if (!r) return
    const clamp = (v: number) => Math.min(Math.max(v, 0.001), 60)
    const next = {
      ...r,
      latitudeDelta: clamp(r.latitudeDelta * factor),
      longitudeDelta: clamp(r.longitudeDelta * factor),
    }
    regionRef.current = next
    mapRef.current?.animateToRegion(next, 250)
  }, [userLocation])

  // [추가] 내 위치로 복귀 — 멀리 있는 행사를 보다가 한 번 누르면 현재 위치로 돌아옴
  // (줌도 주변이 보이는 수준으로 되돌림)
  const goToMyLocation = useCallback(async () => {
    try {
      const cur = await Location.getCurrentPositionAsync({})
      mapRef.current?.animateToRegion(
          {
            latitude: cur.coords.latitude,
            longitude: cur.coords.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          },
          500,
      )
    } catch (err: any) {
      console.warn('현재 위치 조회 실패:', err?.message)
      // 실패하면 마지막으로 알고 있던 위치로라도 이동
      if (userLocation) {
        mapRef.current?.animateToRegion(
            { latitude: userLocation.lat, longitude: userLocation.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 },
            500,
        )
      }
    }
  }, [userLocation])

  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('위치 권한 필요', '지도 기능을 사용하려면 위치 권한이 필요합니다.')
        return
      }
      const loc = await Location.getCurrentPositionAsync({})
      const { latitude, longitude } = loc.coords
      lastRefreshAt.current = Date.now()
      setUserLocation({ lat: latitude, lng: longitude })

      // 날씨 조회 — 행사 목록 로딩을 막지 않도록 await 하지 않고 병렬로 처리
      // (백엔드 프록시 → 실패 시 직접 호출 → 그래도 실패하면 weatherState=null → 날씨 점수 중립)
      loadWeather(latitude, longitude)

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
        nearbyVenues.forEach((v) => nearbyIdsRef.current.add(v.id))

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
            radius: current.radius > 0 ? current.radius : SOLO_GEOFENCE_RADIUS_M,
            geofenceEnabled: true,
          })
        })

        const mergedVenues = Array.from(venueById.values())
        setVenues(mergedVenues)
        // [수정] 첫 행사를 자동 선택하던 동작 제거 — 앱을 켜자마자 미리보기 카드가 뜨지 않게
      } catch (err) {
        console.error('주변 행사 조회 실패:', err)
        Alert.alert('오류', '주변 행사 정보를 불러오지 못했습니다.')
      }
    })()
  }, [loadWeather])

  useEffect(() => {
    if (!isVerified || !insideVenueId) return
    const venue = venues.find((v) => v.id === insideVenueId)
    Alert.alert('도착 인증 ✅', `${venue?.name ?? '행사장'}에 도착했습니다!`)
  }, [isVerified, insideVenueId, venues])

  // [추가] 카테고리 필터 — 지도 마커·추천·주변행사 목록에 공통 적용
  // (지오펜싱/도착 인증은 사용자가 뭘 필터링해서 보고 있든 항상 동작해야 하므로 geofenceVenues는 건드리지 않음)
  const filteredVenues = useMemo(() => {
    if (activeCategory === 'all') return venues
    return venues.filter((v) => (v.category ?? '').toUpperCase().startsWith(activeCategory))
  }, [venues, activeCategory])

  const visibleVenues = useMemo(() => {
    if (!userLocation) return filteredVenues.slice(0, 5)
    return [...filteredVenues]
        .map((v) => ({ ...v, distance: distanceMeters(userLocation.lat, userLocation.lng, v.lat, v.lng) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 8)
  }, [filteredVenues, userLocation])

  // [수정] 오늘의 추천 — utils/recommend.ts의 스코어링 사용
  // (기간 미정/종료 행사/50km 초과 제외 → 거리·날씨적합도·종료임박도 가중합 정렬)
  const recommendedVenues = useMemo(() => {
    if (!userLocation) return []
    return recommendVenues(filteredVenues, {
      weather: weatherState,
      weatherRaw, // 뇌우 여부 판단용 (4단계로 뭉개기 전 원본)
      lat: userLocation.lat,
      lng: userLocation.lng,
    })
  }, [filteredVenues, userLocation, weatherState, weatherRaw])

  // 현재 탭에 표시할 목록
  const activeList = activeTab === 'recommended' ? recommendedVenues : visibleVenues

  // [수정] 탭 이모지 / 근거 문구
  // - DEBUG_WEATHER가 켜져 있으면 추천 점수와 동일하게 그 값을 따라감 (getEffectiveWeather*)
  // - 이모지는 원본 main 기준이라 뇌우 ⛈️ / 안개 🌫️ 까지 구분됨
  // - 날씨를 못 가져오면 ☀️ 대신 중립 아이콘 🎯
  const effectiveWeather = getEffectiveWeather(weatherState)
  const effectiveWeatherRaw = getEffectiveWeatherRaw(weatherRaw)
  const weatherTabLabel = `${weatherEmoji(effectiveWeatherRaw, effectiveWeather)} 오늘의 추천`
  const weatherNote = weatherReason(effectiveWeatherRaw, effectiveWeather)

  if (!userLocation) {
    return (
        <View style={styles.center}>
          <Text>위치 정보를 불러오는 중...</Text>
        </View>
    )
  }

  return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity
            style={[styles.logoutPill, { top: insets.top + 14 }]}
            onPress={logout}
            activeOpacity={0.85}
        >
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>

        <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            showsUserLocation
            // 기본 내 위치 버튼(우상단)은 로그아웃 버튼과 겹쳐서 끄고, 아래 커스텀 버튼 사용
            showsMyLocationButton={false}
            onRegionChangeComplete={(r) => {
              regionRef.current = r
              setZoomBucket(Math.round(Math.log2(Math.max(r.latitudeDelta, 0.0001)) * 2) / 2)
              // [추가] 러닝아트 캡처가 카메라 이동을 기다리고 있다면 완료 알림
              const resolve = regionSettledRef.current
              if (resolve) {
                regionSettledRef.current = null
                resolve()
              }
            }}
            // [추가] 지도의 빈 곳을 누르면 미리보기 카드 닫기
            // (Android는 마커를 눌러도 지도 onPress가 같이 오므로 marker-press는 무시)
            onPress={(e) => {
              if (e.nativeEvent.action === 'marker-press') return
              setSelectedVenueId(null)
            }}
            initialRegion={{
              latitude: userLocation.lat,
              longitude: userLocation.lng,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
        >
          {filteredVenues.map((venue) => (
              <React.Fragment key={venue.id}>
                <Marker
                    coordinate={{ latitude: venue.lat, longitude: venue.lng }}
                    // [수정] 기본 콜아웃 말풍선 제거
                    // - calloutEnabled={false}만으로는 Android에서 title이 있으면 정보창이 뜨는
                    //   경우가 있어, 같은 정보를 보여주는 title/description 자체를 뺌
                    //   (같은 정보는 위쪽 커스텀 미리보기 카드가 보여줌)
                    calloutEnabled={false}
                    pinColor={insideVenueId === venue.id ? 'green' : 'red'}
                    onPress={() => setSelectedVenueId(venue.id)}
                />
                {venue.geofenceEnabled !== false && venue.radius > 0 && (
                    <Circle
                        center={{ latitude: venue.lat, longitude: venue.lng }}
                        radius={venue.radius}
                        strokeWidth={insideVenueId === venue.id ? 3 : 2}
                        strokeColor={insideVenueId === venue.id ? 'rgba(255,107,53,0.95)' : 'rgba(59,130,246,0.75)'}
                        fillColor={insideVenueId === venue.id ? 'rgba(255,107,53,0.14)' : 'rgba(59,130,246,0.09)'}
                    />
                )}
              </React.Fragment>
          ))}

          {/* [수정] 캡처(isCapturingTrailArt) 순간에는 발자국 모드여도 폴리라인을 함께 그린다.
              takeSnapshot 은 좌표를 받지 않고 현재 렌더 결과만 담으므로,
              캡처 시점에는 반드시 렌더러가 직접 그리는 폴리라인이 마운트돼 있어야 한다. */}
          {isRecording && trail.length > 1 && (!showPawPrint || isCapturingTrailArt) && (
              <Polyline coordinates={trail} strokeColor="#FF6B35" strokeWidth={3} />
          )}

          {pawMarks.map((point, i) => (
              <PawMarker key={i} latitude={point.latitude} longitude={point.longitude} />
          ))}
        </MapView>

        {selectedVenue && (
            <TouchableOpacity
                style={[styles.previewCard, { top: 96 + insets.top }]}
                onPress={() => focusVenue(selectedVenue)}
                activeOpacity={0.9}
            >
              <Image
                  source={selectedVenue.imageUrl ? { uri: selectedVenue.imageUrl } : require('../../assets/icon.png')}
                  style={styles.previewImage}
              />
              <View style={styles.previewText}>
                <Text style={styles.previewTitle} numberOfLines={1}>{selectedVenue.name}</Text>
                <Text style={styles.previewSub} numberOfLines={2}>{selectedVenue.address}</Text>
                {/* [추가] 상세페이지 진입 */}
                <TouchableOpacity onPress={() => setDetailVenue(selectedVenue)} hitSlop={{ top: 14, bottom: 14, left: 0, right: 14 }}>
                  <Text style={styles.previewMore}>자세히 보기 ›</Text>
                </TouchableOpacity>
              </View>
              {/* [추가] 미리보기 카드 닫기 버튼 */}
              <TouchableOpacity
                  style={styles.previewClose}
                  onPress={() => setSelectedVenueId(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel="미리보기 닫기"
              >
                <Ionicons name="close" size={16} color="#6b7280" />
              </TouchableOpacity>
            </TouchableOpacity>
        )}

        {/* "오늘의 추천"과 "주변 행사"를 탭으로 전환 */}
        <View
            style={[styles.eventSheet, { paddingBottom: eventSheetBottomPadding }]}
            onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
        >
          <View style={styles.tabRow}>
            <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'recommended' && styles.tabBtnActive]}
                onPress={() => setActiveTab('recommended')}
                hitSlop={{ top: 12, bottom: 4, left: 6, right: 6 }}
            >
              <Text style={[styles.tabText, activeTab === 'recommended' && styles.tabTextActive]}>
                {weatherTabLabel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'nearby' && styles.tabBtnActive]}
                onPress={() => setActiveTab('nearby')}
                hitSlop={{ top: 12, bottom: 4, left: 6, right: 6 }}
            >
              <Text style={[styles.tabText, activeTab === 'nearby' && styles.tabTextActive]}>주변 행사</Text>
            </TouchableOpacity>
          </View>

          {/* [추가] 추천 탭일 때만 '왜 이 순서인지' 한 줄 근거 표시 */}
          {activeTab === 'recommended' && (
              <Text style={styles.weatherNote} numberOfLines={1}>{weatherNote}</Text>
          )}

          {/* [추가] 카테고리 필터 칩 — 웹 Home.tsx의 카테고리 탭과 동일한 기준(A01~A04) */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {CATEGORY_TABS.map((c) => {
              const active = activeCategory === c.id
              return (
                  <TouchableOpacity
                      key={c.id}
                      style={[styles.categoryChip, active && styles.categoryChipActive]}
                      onPress={() => setActiveCategory(c.id)}
                      hitSlop={{ top: 9, bottom: 9, left: 2, right: 2 }}
                  >
                    <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>{c.label}</Text>
                  </TouchableOpacity>
              )
            })}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardRow}>
            {activeList.map((venue) => {
              const isSelected = selectedVenueId === venue.id
              const isInside = insideVenueId === venue.id
              return (
                  <TouchableOpacity
                      key={venue.id}
                      style={[styles.eventCard, isSelected && styles.eventCardSelected, isInside && styles.eventCardInside]}
                      onPress={() => focusVenue(venue)}
                      onLongPress={() => setDetailVenue(venue)}
                      activeOpacity={0.85}
                  >
                    <Image
                        source={venue.imageUrl ? { uri: venue.imageUrl } : require('../../assets/icon.png')}
                        style={styles.eventCardThumb}
                    />
                    <View style={styles.eventCardBody}>
                      <Text style={styles.eventCardTitle} numberOfLines={1}>{venue.name}</Text>
                      <Text style={styles.eventCardPeriod} numberOfLines={1}>
                        {formatEventPeriod(venue.eventStartDate, venue.eventEndDate)}
                      </Text>
                      <Text style={styles.eventCardAddress} numberOfLines={1}>{venue.address}</Text>
                      <View style={styles.eventCardFooter}>
                        {/* '지오펜싱'은 개발 용어 → 상세페이지와 같은 '도착 인증' 표현으로 통일 */}
                        {!isInside && (
                            <Text style={styles.eventCardRadius} numberOfLines={1}>
                              {venue.geofenceEnabled === false || venue.radius <= 0 ? '신청 후 도착 인증' : `반경 ${venue.radius}m 자동 인증`}
                            </Text>
                        )}
                        {isInside ? (
                            <View style={styles.eventCardBadgeRow}>
                              {isVerified && <Ionicons name="checkmark-circle" size={13} color="#FF6B35" />}
                              <Text style={styles.eventCardBadge}>{isVerified ? '인증완료' : '진입 중'}</Text>
                            </View>
                        ) : (
                            <TouchableOpacity onPress={() => setDetailVenue(venue)} hitSlop={{ top: 14, bottom: 14, left: 14, right: 10 }}>
                              <Text style={styles.eventCardMore}>자세히 ›</Text>
                            </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>

        {/* [추가] 줌 인/아웃 버튼 (내 위치 버튼 바로 위) */}
        <View style={[styles.zoomBox, { bottom: buttonRowBottom + 58 + 44 + 10 }]}>
          <TouchableOpacity
              style={styles.zoomBtn}
              onPress={() => zoomMap(0.5)}
              activeOpacity={0.85}
              accessibilityLabel="지도 확대"
          >
            <Ionicons name="add" size={24} color="#374151" />
          </TouchableOpacity>
          <View style={styles.zoomDivider} />
          <TouchableOpacity
              style={styles.zoomBtn}
              onPress={() => zoomMap(2)}
              activeOpacity={0.85}
              accessibilityLabel="지도 축소"
          >
            <Ionicons name="remove" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* [추가] 내 위치로 돌아가기 버튼 (트레일 버튼 바로 위, 오른쪽) */}
        <TouchableOpacity
            style={[styles.locateBtn, { bottom: buttonRowBottom + 58 }]}
            onPress={goToMyLocation}
            activeOpacity={0.85}
            accessibilityLabel="내 위치로 이동"
        >
          <LocateIcon />
        </TouchableOpacity>

        <View style={[styles.buttonRow, { bottom: buttonRowBottom }]}>
          {/* 앱의 주 기능이라 주황 채움 버튼 / 기록 중에는 어두운 색으로 상태 구분 */}
          <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, isRecording && styles.btnRecording, isStoppingTrail && styles.btnDisabled]}
              onPress={isRecording ? () => handleStopRecording('manual') : () => startRecording(insideVenueId)}
              disabled={isStoppingTrail}
              activeOpacity={0.85}
          >
            <View style={styles.btnInner}>
              <Ionicons name={isRecording ? 'stop-circle' : 'footsteps'} size={16} color="#fff" />
              <Text style={styles.btnTextOn}>
                {isStoppingTrail ? '저장 중...' : isRecording ? '트레일 기록 종료' : '트레일 기록 시작'}
              </Text>
            </View>
          </TouchableOpacity>

          {isRecording && (
              <TouchableOpacity style={styles.btn} onPress={() => setShowPawPrint((prev) => !prev)}>
                <Text style={styles.btnText}>{showPawPrint ? '선으로 보기' : '발자국 보기'}</Text>
              </TouchableOpacity>
          )}
        </View>

        {/* 지오펜스 배지: 카운트다운 + 진행바 + 인증완료 색상 변경 */}
        {insideVenueId && (
            <View style={[styles.badgeWrap, isVerified && styles.badgeWrapVerified]}>
              <View style={[styles.badge, isVerified && styles.badgeVerified]}>
                <Ionicons
                    name={isVerified ? 'checkmark-circle' : 'location'}
                    size={16}
                    color={isVerified ? '#fff' : '#FF6B35'}
                />
                <Text style={[styles.badgeText, isVerified && styles.badgeTextVerified]}>
                  {isVerified
                      ? '도착 인증 완료'
                      : `행사장 진입 중 · ${ENTER_DWELL_S - dwellSeconds}초 후 자동 인증`}
                </Text>
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
            </View>
        )}

        {/* [추가] 행사 상세페이지 모달 */}
        <VenueDetailModal
            venue={detailVenue}
            detailLoading={detailLoadingId !== null && detailLoadingId === detailVenue?.id}
            formatPeriod={formatEventPeriod}
            onClose={() => setDetailVenue(null)}
            onShowOnMap={handleShowOnMapFromDetail}
            onParticipationChange={handleParticipationChange}
        />
      </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { backgroundColor: '#9ca3af' },
  logoutPill: {
    position: 'absolute',
    right: 14,
    zIndex: 50,
    backgroundColor: 'rgba(17,24,39,0.92)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  buttonRow: { position: 'absolute', left: 16, flexDirection: 'row', gap: 8 },
  btn: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  btnActive: { backgroundColor: '#FF6B35' },
  btnPrimary: { backgroundColor: '#FF6B35', paddingVertical: 11, paddingHorizontal: 18, borderRadius: 999, shadowOpacity: 0.22 },
  btnRecording: { backgroundColor: '#111827' },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnTextOn: { fontWeight: '800', fontSize: 14, color: '#fff' },
  locateBtn: { position: 'absolute', right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, elevation: 5 },
  locateIcon: { fontSize: 20 },
  // 내 위치(조준) 아이콘: 24x24 안에 링 + 점 + 상하좌우 눈금
  locateIconBox: { width: 24, height: 24 },
  locateRing: { position: 'absolute', left: 4, top: 4, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#FF6B35', alignItems: 'center', justifyContent: 'center' },
  locateDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF6B35' },
  locateTick: { position: 'absolute', backgroundColor: '#FF6B35', borderRadius: 1 },
  locateTickTop: { left: 11, top: 0, width: 2, height: 4 },
  locateTickBottom: { left: 11, top: 20, width: 2, height: 4 },
  locateTickLeft: { left: 0, top: 11, width: 4, height: 2 },
  locateTickRight: { left: 20, top: 11, width: 4, height: 2 },
  zoomBox: { position: 'absolute', right: 16, width: 44, borderRadius: 22, backgroundColor: '#fff', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, elevation: 5 },
  zoomBtn: { height: 44, alignItems: 'center', justifyContent: 'center' },
  zoomText: { fontSize: 22, fontWeight: '700', color: '#374151' },
  zoomDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#e5e7eb', marginHorizontal: 8 },
  btnText: { fontWeight: '600', color: '#333' },

  // 탭 스타일 (오늘의 추천 / 주변 행사)
  tabRow: { flexDirection: 'row', gap: 22, marginBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  tabBtn: { paddingBottom: 9, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: '#FF6B35' },
  tabText: { fontSize: 15, fontWeight: '700', color: '#6b7280' },
  tabTextActive: { color: '#111827' },
  // 카테고리 필터 칩 (전체/자연/문화/레저/쇼핑)
  categoryRow: { gap: 6, marginBottom: 10 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  categoryChipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  categoryChipText: { fontSize: 12, fontWeight: '700', color: '#4b5563' },
  categoryChipTextActive: { color: '#fff' },
  // 추천 근거 한 줄 (예: '비 오는 날 · 실내 위주로 추천')
  weatherNote: { marginBottom: 8, fontSize: 12, color: '#4b5563', fontWeight: '600' },

  // 배지 스타일
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  previewCard: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 18, padding: 12, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 14, elevation: 8 },
  previewImage: { width: 64, height: 64, borderRadius: 14, backgroundColor: '#f3f4f6' },
  previewText: { flex: 1 },
  previewClose: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  previewCloseText: { fontSize: 13, color: '#6b7280', fontWeight: '700' },
  previewTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  previewSub: { marginTop: 4, fontSize: 12, color: '#6b7280', lineHeight: 16 },
  previewMore: { marginTop: 6, fontSize: 12, color: '#FF6B35', fontWeight: '800' },
  eventSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 12, paddingHorizontal: 16, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, elevation: 10 },
  sheetHeader: { marginBottom: 10 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  sheetSub: { marginTop: 4, fontSize: 12, color: '#6b7280' },
  cardRow: { gap: 10, paddingBottom: 4 },
  eventCard: { width: 262, flexDirection: 'row', gap: 12, borderRadius: 18, padding: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eef0f3', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  eventCardSelected: { borderColor: '#FF6B35', backgroundColor: '#fff7f2' },
  eventCardInside: { borderColor: '#FF6B35', backgroundColor: '#FFEFE7' },
  eventCardTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
  eventCardThumb: { width: 72, height: 72, borderRadius: 12, backgroundColor: '#f3f4f6' },
  eventCardBody: { flex: 1, justifyContent: 'space-between' },
  eventCardPeriod: { marginTop: 3, fontSize: 12, color: '#FF6B35', fontWeight: '700' },
  eventCardAddress: { marginTop: 2, fontSize: 11, color: '#6b7280' },
  eventCardFooter: { marginTop: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 },
  eventCardRadius: { flexShrink: 1, fontSize: 11, color: '#6b7280', fontWeight: '600' },
  eventCardBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' },
  eventCardBadge: { fontSize: 11, color: '#FF6B35', fontWeight: '800' },
  eventCardMore: { fontSize: 11, color: '#9ca3af', fontWeight: '700' },
})