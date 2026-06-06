import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'
import LazyImage from '../components/common/LazyImage'
import Button from '../components/Button'
import IconLabel from '../components/IconLabel'
import MapView from '../components/MapView'
import { useAuth } from '../contexts/AuthContext'
import { Filter, MapPin, Search, X, Loader2, LayoutGrid, Map, Target, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react'

interface EventItem {
  contentid: string
  title: string
  addr1: string
  mapx?: string
  mapy?: string
  firstimage?: string
  parking?: string
  elevator?: string
  restroom?: string
  cat1?: string
  overview?: string
}

const CATEGORY_MAP: Record<string, string> = {
  A01: '자연관광',
  A02: '문화/역사',
  A03: '레포츠',
  A04: '쇼핑',
  C01: '추천코스',
  ETC: '기타',
}

const CATEGORY_OPTIONS = [
  { value: 'ALL', label: '전체' },
  { value: 'A02', label: '문화/역사' },
  { value: 'A01', label: '자연관광' },
  { value: 'A03', label: '레포츠' },
  { value: 'A04', label: '쇼핑' },
]

const PAGE_SIZE = 12

const SCROLL_KEY = 'eventlist-scroll-y'

type SortKey = 'default' | 'title_asc' | 'title_desc' | 'barrier_first' | 'distance'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'default',       label: '기본순' },
  { value: 'distance',      label: '가까운순' },
  { value: 'title_asc',     label: '이름 오름차순' },
  { value: 'title_desc',    label: '이름 내림차순' },
  { value: 'barrier_first', label: '배리어프리 우선' },
]

const calcDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLng = (lng2 - lng1) * (Math.PI / 180)
  const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const isAccessible = (field?: string) => {
  if (!field) return false
  const v = field.trim().toUpperCase()
  return v !== 'N' && v !== '없음' && v !== '' && v !== 'NO'
}

const hasBarrierFreeInfo = (event: EventItem) =>
    isAccessible(event.parking) || isAccessible(event.elevator) || isAccessible(event.restroom)

type ViewMode = 'list' | 'map'

export default function EventList() {
  const navigate = useNavigate()
  const auth = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // ── URL에서 초기값 읽기 ──────────────────────────────────────────
  const getParam = (key: string, fallback: string) => searchParams.get(key) ?? fallback

  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const viewMode = (getParam('view', 'list')) as ViewMode
  const searchQuery = getParam('q', '')
  const selectedCategory = getParam('category', 'ALL')
  const barrierFreeOnly = getParam('barrier', 'false') === 'true'
  const currentPage = Math.max(1, parseInt(getParam('page', '1'), 10))
  const sortKey = getParam('sort', 'default') as SortKey

  const listRef = useRef<HTMLDivElement>(null)

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null)

  // ── URL 파라미터 업데이트 헬퍼 ───────────────────────────────────
  const updateParams = useCallback(
      (updates: Record<string, string>) => {
        setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev)
              Object.entries(updates).forEach(([k, v]) => {
                // 기본값은 URL에서 제거해 URL을 깔끔하게 유지
                const defaults: Record<string, string> = {
                  view: 'list',
                  q: '',
                  category: 'ALL',
                  barrier: 'false',
                  page: '1',
                  sort: 'default',
                }
                if (v === defaults[k]) {
                  next.delete(k)
                } else {
                  next.set(k, v)
                }
              })
              return next
            },
            { replace: true }
        )
      },
      [setSearchParams]
  )

  const setViewMode = (v: ViewMode) => updateParams({ view: v, page: '1' })
  const setSearchQuery = (v: string) => updateParams({ q: v, page: '1' })
  const setSelectedCategory = (v: string) => updateParams({ category: v, page: '1' })
  const setBarrierFreeOnly = (v: boolean) => updateParams({ barrier: String(v), page: '1' })
  const setCurrentPage = (p: number) => updateParams({ page: String(p) })
  const setSortKey = (v: SortKey) => updateParams({ sort: v, page: '1' })

  // ── API 호출 ─────────────────────────────────────────────────────
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await axiosInstance.get('/public/map')
        setEvents(response.data)
      } catch (err) {
        console.error('이벤트 목록 로드 실패:', err)
        setError('행사 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [auth.user])

  // ── 유저 위치 ────────────────────────────────────────────────────
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
            setUserLocation(loc)
            setMapCenter(loc)
          },
          () => {
            const fallback = { lat: 35.8956, lng: 128.6224 }
            setUserLocation(fallback)
            setMapCenter(fallback)
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    } else {
      const fallback = { lat: 35.8956, lng: 128.6224 }
      setUserLocation(fallback)
      setMapCenter(fallback)
    }
  }, [])

  const handleRecenter = () => {
    if (userLocation) setMapCenter({ ...userLocation })
  }

  // ── 필터링 ───────────────────────────────────────────────────────
  const filteredEvents = useMemo(() => {
    const filtered = events.filter((event) => {
      if (selectedCategory !== 'ALL' && event.cat1 !== selectedCategory) return false
      if (barrierFreeOnly && !hasBarrierFreeInfo(event)) return false
      if (
          searchQuery.trim() &&
          !event.title.includes(searchQuery.trim()) &&
          !(event.addr1 ?? '').includes(searchQuery.trim())
      )
        return false
      return true
    })

    // ── 정렬 ─────────────────────────────────────────────────────────
    if (sortKey === 'title_asc')    return [...filtered].sort((a, b) => a.title.localeCompare(b.title, 'ko'))
    if (sortKey === 'title_desc')   return [...filtered].sort((a, b) => b.title.localeCompare(a.title, 'ko'))
    if (sortKey === 'barrier_first') return [...filtered].sort((a, b) => Number(hasBarrierFreeInfo(b)) - Number(hasBarrierFreeInfo(a)))
    if (sortKey === 'distance' && userLocation) {
      return [...filtered].sort((a, b) => {
        const distA = (a.mapx && a.mapy)
            ? calcDistance(userLocation.lat, userLocation.lng, parseFloat(a.mapy), parseFloat(a.mapx))
            : Infinity
        const distB = (b.mapx && b.mapy)
            ? calcDistance(userLocation.lat, userLocation.lng, parseFloat(b.mapy), parseFloat(b.mapx))
            : Infinity
        return distA - distB
      })
    }
    return filtered // 'default' 또는 위치 없는 거리순: API 반환 순서 유지
  }, [events, selectedCategory, barrierFreeOnly, searchQuery, sortKey, userLocation])

  // ── 페이지네이션 ─────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE))
  // 필터 변경 시 page가 범위 초과하면 자동 보정
  const safePage = Math.min(currentPage, totalPages)
  const pagedEvents = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filteredEvents.slice(start, start + PAGE_SIZE)
  }, [filteredEvents, safePage])

  // safePage와 currentPage가 다를 경우 URL 보정
  useEffect(() => {
    if (!loading && currentPage > totalPages && totalPages > 0) {
      updateParams({ page: '1' })
    }
  }, [filteredEvents.length, loading])

  // ── 지도용 데이터 (필터 전체, 페이지 무관) ───────────────────────
  const mapData = useMemo(
      () =>
          filteredEvents
              .filter((e) => e.mapx && e.mapy)
              .map((e) => ({
                title: e.title,
                addr1: e.addr1,
                mapx: e.mapx,
                mapy: e.mapy,
                contentid: e.contentid,
                id: e.contentid,
                firstimage: e.firstimage,
              })),
      [filteredEvents]
  )

  // ── 스크롤 위치 저장·복원 ────────────────────────────────────────
  // 리스트 마운트 시 저장된 스크롤 위치 복원
  useEffect(() => {
    if (loading) return
    const saved = sessionStorage.getItem(SCROLL_KEY)
    if (saved) {
      window.scrollTo({ top: parseInt(saved, 10), behavior: 'instant' })
      sessionStorage.removeItem(SCROLL_KEY)
    }
  }, [loading])

  // 카드 클릭 시 현재 스크롤 저장 후 이동
  const handleEventClick = useCallback((contentid: string) => {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY))
    navigate(`/events/${contentid}`)
  }, [navigate])

  const resetFilters = () => {
    setSearchParams({}, { replace: true })
  }

  // ── 페이지네이션 버튼 렌더 ────────────────────────────────────────
  const renderPagination = () => {
    if (totalPages <= 1) return null

    // 표시할 페이지 번호 범위 계산 (현재 페이지 중심으로 최대 5개)
    const delta = 2
    const rangeStart = Math.max(1, safePage - delta)
    const rangeEnd = Math.min(totalPages, safePage + delta)
    const pages: (number | 'ellipsis')[] = []

    if (rangeStart > 1) {
      pages.push(1)
      if (rangeStart > 2) pages.push('ellipsis')
    }
    for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i)
    if (rangeEnd < totalPages) {
      if (rangeEnd < totalPages - 1) pages.push('ellipsis')
      pages.push(totalPages)
    }

    return (
        <div className="flex items-center justify-center gap-1 mt-10">
          <button
              onClick={() => setCurrentPage(safePage - 1)}
              disabled={safePage === 1}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {pages.map((p, idx) =>
              p === 'ellipsis' ? (
                  <span key={`ellipsis-${idx}`} className="w-9 h-9 flex items-center justify-center text-gray-400 text-sm">
              …
            </span>
              ) : (
                  <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-semibold transition-all ${
                          p === safePage
                              ? 'bg-orange-500 text-white shadow-sm'
                              : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    {p}
                  </button>
              )
          )}

          <button
              onClick={() => setCurrentPage(safePage + 1)}
              disabled={safePage === totalPages}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
    )
  }

  const DEFAULT_IMAGE = '/images/default-event.png'

  return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-end justify-between mb-2">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">🎉 행사 둘러보기</h1>
            <p className="text-gray-500 mt-1">대구·경북 지역의 문화 행사를 찾아보세요</p>
          </div>

          {/* 뷰 전환 탭 */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
            <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    viewMode === 'list'
                        ? 'bg-white text-orange-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <LayoutGrid className="w-4 h-4" />
              목록
            </button>
            <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    viewMode === 'map'
                        ? 'bg-white text-orange-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <Map className="w-4 h-4" />
              지도
            </button>
          </div>
        </div>

        {/* 필터 섹션 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 my-6">
          <div className="flex items-center gap-3 mb-5">
            <Filter className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-bold text-gray-900">검색 및 필터</h2>
          </div>

          {/* 검색창 */}
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
                type="text"
                placeholder="행사명 또는 주소로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
            {searchQuery && (
                <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
            )}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 카테고리 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">카테고리</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => setSelectedCategory(opt.value)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                            selectedCategory === opt.value
                                ? 'bg-orange-500 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      {opt.label}
                    </button>
                ))}
              </div>
            </div>

            {/* 접근성 토글 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">접근성</label>
              <label className="flex items-center gap-3 cursor-pointer w-fit">
                <div
                    onClick={() => setBarrierFreeOnly(!barrierFreeOnly)}
                    className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 ${
                        barrierFreeOnly ? 'bg-orange-500' : 'bg-gray-300'
                    }`}
                >
                  <div
                      className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          barrierFreeOnly ? 'translate-x-5' : 'translate-x-0'
                      }`}
                  />
                </div>
                <span className="text-sm text-gray-700">배리어프리 정보 있는 행사만 보기</span>
              </label>
            </div>

            {/* 정렬 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
              <span className="flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5" />
                정렬
              </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {SORT_OPTIONS.map((opt) => {
                  const isDistanceDisabled = opt.value === 'distance' && !userLocation
                  return (
                      <button
                          key={opt.value}
                          onClick={() => !isDistanceDisabled && setSortKey(opt.value)}
                          disabled={isDistanceDisabled}
                          title={isDistanceDisabled ? '위치 정보를 가져오는 중입니다' : undefined}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                              isDistanceDisabled
                                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                  : sortKey === opt.value
                                      ? 'bg-gray-800 text-white shadow-sm'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                      >
                        {opt.label}
                        {isDistanceDisabled && <span className="ml-1 text-xs">(로딩중)</span>}
                      </button>
                  )
                })}
              </div>
            </div>
          </div>

          {auth.user?.requiresBarrierFree && (
              <div className="mt-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
                ♿ 배리어프리 우선 추천이 적용되어 있습니다.
              </div>
          )}

          <div className="mt-5 pt-5 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {viewMode === 'map' ? (
                <>
                  지도에 <span className="font-bold text-gray-900">{mapData.length}</span>개 마커 표시
                </>
            ) : (
                <>
                  총 <span className="font-bold text-gray-900">{filteredEvents.length}</span>개 중{' '}
                  <span className="font-bold text-gray-900">
                  {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredEvents.length)}
                </span>
                  번째
                </>
            )}
          </span>
            <Button variant="secondary" onClick={resetFilters}>
              필터 초기화
            </Button>
          </div>
        </div>

        {/* 로딩 */}
        {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
              <p className="text-gray-500 font-medium">행사 목록을 불러오는 중...</p>
            </div>
        )}

        {/* 에러 */}
        {!loading && error && (
            <div className="text-center py-16 bg-red-50 rounded-2xl border border-red-100">
              <p className="text-red-600 font-semibold mb-3">{error}</p>
              <Button variant="primary" onClick={() => window.location.reload()}>
                다시 시도
              </Button>
            </div>
        )}

        {!loading && !error && (
            <>
              {/* ── 지도 뷰 ── */}
              {viewMode === 'map' && (
                  <div
                      className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm"
                      style={{ height: '620px', position: 'relative' }}
                  >
                    <button
                        onClick={handleRecenter}
                        title="내 위치로 이동"
                        style={{
                          position: 'absolute',
                          bottom: 16,
                          right: 16,
                          zIndex: 20,
                          width: 42,
                          height: 42,
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.92)',
                          backdropFilter: 'blur(6px)',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
                          transition: 'transform 0.2s, background 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      <Target size={19} color="#f97316" />
                    </button>

                    {mapData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full bg-gray-50 gap-3">
                          <p className="text-gray-400 text-lg">🗺️</p>
                          <p className="text-gray-500 font-medium">표시할 위치 정보가 있는 행사가 없습니다.</p>
                          <Button variant="primary" onClick={resetFilters}>
                            필터 초기화
                          </Button>
                        </div>
                    ) : (
                        <MapView
                            data={mapData}
                            onDetailClick={(id) => navigate(`/events/${id}`)}
                            userLocation={userLocation}
                            mapCenter={mapCenter}
                        />
                    )}
                  </div>
              )}

              {/* ── 리스트 뷰 ── */}
              {viewMode === 'list' && (
                  <>
                    {filteredEvents.length === 0 ? (
                        <div className="text-center py-16">
                          <p className="text-xl text-gray-400 mb-2">🔍</p>
                          <p className="text-gray-500 font-medium mb-4">조건에 맞는 행사가 없습니다.</p>
                          <Button variant="primary" onClick={resetFilters}>
                            필터 초기화
                          </Button>
                        </div>
                    ) : (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {pagedEvents.map((event) => {
                              const accessible = hasBarrierFreeInfo(event)
                              const categoryLabel = CATEGORY_MAP[event.cat1 ?? ''] ?? '문화행사'

                              return (
                                  <div
                                      key={event.contentid}
                                      onClick={() => handleEventClick(event.contentid)}
                                      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                                  >
                                    {/* 이미지 */}
                                    <div className="relative h-44 bg-gray-100 overflow-hidden">
                                      <LazyImage
                                          src={event.firstimage || DEFAULT_IMAGE}
                                          alt={event.title}
                                          wrapperClassName="w-full h-full"
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            ;(e.target as HTMLImageElement).src = DEFAULT_IMAGE
                                          }}
                                      />
                                      <span className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 text-white text-xs font-semibold rounded-full backdrop-blur-sm">
                              {categoryLabel}
                            </span>
                                    </div>

                                    {/* 내용 */}
                                    <div className="p-4">
                                      <h3 className="font-bold text-gray-900 text-base mb-1 line-clamp-1">
                                        {event.title}
                                      </h3>
                                      <p className="text-sm text-gray-500 flex items-center gap-1 mb-3 line-clamp-1">
                                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                        {event.addr1 || '주소 정보 없음'}
                                      </p>

                                      <div className="flex flex-wrap gap-1.5 mb-4 min-h-[24px]">
                                        {accessible && <IconLabel type="barrierFree" />}
                                        {(event.overview?.includes('시각장애인') ||
                                            event.title.includes('배리어프리')) && (
                                            <IconLabel type="guideDog" />
                                        )}
                                      </div>

                                      <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleEventClick(event.contentid)
                                          }}
                                          className="w-full py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 font-semibold text-sm rounded-xl transition-colors"
                                      >
                                        자세히 보기
                                      </button>
                                    </div>
                                  </div>
                              )
                            })}
                          </div>

                          {/* 페이지네이션 */}
                          {renderPagination()}
                        </>
                    )}
                  </>
              )}
            </>
        )}
      </div>
  )
}