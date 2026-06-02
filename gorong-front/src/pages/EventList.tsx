import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'
import IconLabel from '../components/IconLabel'
import MapView from '../components/MapView'
import { Filter, List, Map, ArrowUpDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getEventList, type TourItemDto } from '../api/eventApi'

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const DEFAULT_LOCATION = { lat: 35.8956, lng: 128.6224 }

const isValidLocation = (loc?: { lat?: number; lng?: number } | null) => {
  if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return false
  return loc.lat !== 0 && loc.lng !== 0
}

const CAT1_LABELS: Record<string, string> = {
  All: '전체',
  A01: '🌿 자연',
  A02: '🏛 문화/역사',
  A03: '⚽ 레포츠',
  A04: '🛍 쇼핑',
  A05: '🍽 음식',
  C01: '📍 추천코스',
}

const isAccessible = (field: string | undefined) => {
  if (!field) return false
  const normalized = field.trim().toUpperCase()
  return normalized !== 'N' && normalized !== '없음' && normalized !== ''
}

type SortOption = 'default' | 'distance' | 'popular'
type ViewMode = 'list' | 'map'

export default function EventList() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [events, setEvents] = useState<TourItemDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // ③ locationReady: 위치가 확정된 이후에만 거리 필터 적용
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationReady, setLocationReady] = useState(false)

  const [cat1Filter, setCat1Filter] = useState<string>('All')
  const [maxDistance, setMaxDistance] = useState(10)
  const [barrierFreeOnly, setBarrierFreeOnly] = useState(
      user?.barrierFreeType ? user.barrierFreeType !== 'NONE' : false
  )
  const [sortOption, setSortOption] = useState<SortOption>('default')
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  useEffect(() => {
    getEventList()
        .then(setEvents)
        .catch(() => setError(true))
        .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const fallback = () => {
      setUserLocation(DEFAULT_LOCATION)
      setLocationReady(true)   // ③ fallback도 ready 처리
    }
    if (!navigator.geolocation) { fallback(); return }
    navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setUserLocation(isValidLocation(loc) ? loc : DEFAULT_LOCATION)
          setLocationReady(true)  // ③ 위치 확정 후 ready
        },
        fallback,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [])

  const resetFilters = () => {
    setCat1Filter('All')
    setMaxDistance(10)
    setBarrierFreeOnly(user?.barrierFreeType ? user.barrierFreeType !== 'NONE' : false)
    setSortOption('default')
  }

  const filteredEvents = useMemo(() => {
    let result = events.filter((event) => {
      if (cat1Filter !== 'All' && event.cat1 !== cat1Filter) return false

      // ③ locationReady일 때만 거리 필터 적용
      if (locationReady && userLocation) {
        const lat = parseFloat(event.mapy)
        const lng = parseFloat(event.mapx)
        if (!isNaN(lat) && !isNaN(lng)) {
          if (calculateDistance(userLocation.lat, userLocation.lng, lat, lng) > maxDistance) return false
        }
      }

      if (barrierFreeOnly) {
        const accessible = isAccessible(event.parking) || isAccessible(event.elevator) || isAccessible(event.restroom)
        if (!accessible) return false
      }

      return true
    })

    // ① 정렬
    if (sortOption === 'distance' && userLocation) {
      result = [...result].sort((a, b) => {
        const dA = calculateDistance(userLocation.lat, userLocation.lng, parseFloat(a.mapy), parseFloat(a.mapx))
        const dB = calculateDistance(userLocation.lat, userLocation.lng, parseFloat(b.mapy), parseFloat(b.mapx))
        return dA - dB
      })
    } else if (sortOption === 'popular') {
      // 서버 응답 원본 순서를 인기순으로 사용 (API가 이미 인기순 정렬 반환)
      // 클라이언트 임의 기준으로 재정렬하지 않음
      result = [...result].sort((a, b) => {
        const idxA = events.indexOf(a)
        const idxB = events.indexOf(b)
        return idxA - idxB
      })
    }

    return result
  }, [events, cat1Filter, maxDistance, barrierFreeOnly, sortOption, userLocation, locationReady])

  const getDistanceText = (event: TourItemDto): string => {
    if (!userLocation) return ''
    const lat = parseFloat(event.mapy)
    const lng = parseFloat(event.mapx)
    if (isNaN(lat) || isNaN(lng)) return ''
    return `${calculateDistance(userLocation.lat, userLocation.lng, lat, lng).toFixed(1)}km`
  }

  if (loading) {
    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">🎉 행사 둘러보기</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow p-4 animate-pulse">
                  <div className="h-40 bg-gray-200 rounded-lg mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
            ))}
          </div>
        </div>
    )
  }

  if (error) {
    return (
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <p className="text-xl text-gray-500 mb-4">행사 정보를 불러오지 못했습니다.</p>
          <Button variant="primary" onClick={() => window.location.reload()}>다시 시도</Button>
        </div>
    )
  }

  return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">🎉 행사 둘러보기</h1>

        {/* 필터 섹션 */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-bold text-gray-900">필터</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* 카테고리 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">카테고리</label>
              <div className="space-y-2">
                {Object.entries(CAT1_LABELS).map(([code, label]) => (
                    <label key={code} className="flex items-center gap-2 cursor-pointer">
                      <input
                          type="radio" name="cat1" value={code}
                          checked={cat1Filter === code}
                          onChange={(e) => setCat1Filter(e.target.value)}
                          className="w-4 h-4"
                      />
                      <span className="text-gray-700">{label}</span>
                    </label>
                ))}
              </div>
            </div>

            {/* ④ 거리 버튼 방식 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                거리: {maxDistance}km 이내
                {!locationReady && (
                    <span className="text-xs text-gray-400 ml-2">(위치 확인 중...)</span>
                )}
              </label>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={maxDistance}
                onChange={(e) => setMaxDistance(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>1km</span>
                <span>50km</span>
              </div>
            </div>

            {/* 접근성 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">접근성</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox" checked={barrierFreeOnly}
                    onChange={(e) => setBarrierFreeOnly(e.target.checked)}
                    className="w-4 h-4"
                />
                <span className="text-gray-700">배리어프리만 보기</span>
              </label>
            </div>
          </div>

          {user?.barrierFreeType && user.barrierFreeType !== 'NONE' && (
              <div className="rounded-3xl bg-green-50 border border-green-200 p-4 text-green-900 mt-4">
                배리어프리 우선 추천이 적용되어 있습니다. 필요시 필터를 조정하세요.
              </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <Button variant="secondary" onClick={resetFilters}>필터 초기화</Button>
          </div>
        </div>

        {/* 결과 수 + 정렬 + 뷰 전환 */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-gray-600">
            검색 결과: <span className="font-bold text-gray-900">{filteredEvents.length}</span>개
            {events.length > 0 && (
                <span className="text-gray-400 text-sm ml-2">/ 전체 {events.length}개</span>
            )}
          </p>

          <div className="flex items-center gap-3">
            {/* 정렬 */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-gray-500" />
              <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="default">기본순</option>
                <option value="distance">거리순</option>
                <option value="popular">인기순</option>  {/* ① */}
              </select>
            </div>

            {/* 뷰 전환 */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      viewMode === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <List className="w-4 h-4" /> 리스트
              </button>
              <button
                  onClick={() => setViewMode('map')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      viewMode === 'map' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <Map className="w-4 h-4" /> 지도
              </button>
            </div>
          </div>
        </div>

        {/* 지도 뷰 */}
        {viewMode === 'map' && (
            <div className="bg-white rounded-xl shadow overflow-hidden mb-8" style={{ height: '600px' }}>
              <MapView
                  data={filteredEvents.map(e => ({
                    title: e.title,
                    addr1: e.addr1,
                    mapx: e.mapx,
                    mapy: e.mapy,
                    contentid: e.contentid,
                    firstimage: e.firstimage,
                    eventstartdate: e.eventstartdate,
                    eventenddate: e.eventenddate,
                  }))}
                  onDetailClick={(id) => navigate(`/events/${id}`)}
                  userLocation={userLocation}
              />
            </div>
        )}

        {/* 리스트 뷰 */}
        {viewMode === 'list' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => {
                const accessible = isAccessible(event.parking) || isAccessible(event.elevator) || isAccessible(event.restroom)
                const distanceText = getDistanceText(event)

                return (
                    <Card
                        key={event.contentid}
                        title={event.title}
                        description={event.addr1}
                        image={event.firstimage}
                        onClick={() => navigate(`/events/${event.contentid}`)}
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">
                            {event.cat1 ? CAT1_LABELS[event.cat1] ?? event.cat1 : '기타'}
                          </span>
                          {distanceText && (
                              <span className="text-orange-600 font-semibold">{distanceText}</span>
                          )}
                        </div>

                        {accessible && (
                            <div className="flex flex-wrap gap-2">
                              <IconLabel type="barrierFree" />
                            </div>
                        )}

                        <Button
                            variant="secondary"
                            onClick={() => navigate(`/events/${event.contentid}`)}
                            className="w-full"
                        >
                          자세히 보기
                        </Button>
                      </div>
                    </Card>
                )
              })}
            </div>
        )}

        {/* 빈 결과 */}
        {filteredEvents.length === 0 && (
            <div className="text-center py-20 bg-white rounded-xl shadow">
              <p className="text-5xl mb-4">🔍</p>
              <p className="text-xl font-semibold text-gray-700 mb-2">조건에 맞는 행사가 없습니다</p>
              <p className="text-sm text-gray-400 mb-6">거리 범위를 늘리거나 필터를 조정해보세요</p>
              <Button variant="primary" onClick={resetFilters}>필터 초기화</Button>
            </div>
        )}
      </div>
  )
}