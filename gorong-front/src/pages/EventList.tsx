import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'
import LazyImage from '../components/common/LazyImage'
import IconLabel from '../components/IconLabel'
import MapView from '../components/MapView'
import { useAuth } from '../contexts/AuthContext'
import {
  MapPin, Search, X, Loader2, LayoutGrid, Map, Target,
  ChevronLeft, ChevronRight, ListOrdered, Navigation,
  ArrowUpAZ, ArrowDownAZ, Accessibility,
} from 'lucide-react'

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

const SORT_OPTIONS: { value: SortKey; label: string; icon: React.ReactNode }[] = [
  { value: 'default',       label: '기본순',        icon: <ListOrdered   className="w-3.5 h-3.5" /> },
  { value: 'distance',      label: '가까운순',       icon: <Navigation    className="w-3.5 h-3.5" /> },
  { value: 'title_asc',     label: '이름 오름차순',  icon: <ArrowUpAZ     className="w-3.5 h-3.5" /> },
  { value: 'title_desc',    label: '이름 내림차순',  icon: <ArrowDownAZ   className="w-3.5 h-3.5" /> },
  { value: 'barrier_first', label: '배리어프리 우선', icon: <Accessibility className="w-3.5 h-3.5" /> },
]

const DEFAULT_IMAGE = '/images/default-event.png'

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

  const getParam = (key: string, fallback: string) => searchParams.get(key) ?? fallback

  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const viewMode      = getParam('view', 'list') as ViewMode
  const searchQuery   = getParam('q', '')
  const selectedCategory = getParam('category', 'ALL')
  const barrierFreeOnly  = getParam('barrier', 'false') === 'true'
  const currentPage   = Math.max(1, parseInt(getParam('page', '1'), 10))
  const sortKey       = getParam('sort', 'default') as SortKey

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [mapCenter,    setMapCenter]    = useState<{ lat: number; lng: number } | null>(null)

  const updateParams = useCallback(
      (updates: Record<string, string>) => {
        setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev)
              const defaults: Record<string, string> = {
                view: 'list', q: '', category: 'ALL',
                barrier: 'false', page: '1', sort: 'default',
              }
              Object.entries(updates).forEach(([k, v]) => {
                v === defaults[k] ? next.delete(k) : next.set(k, v)
              })
              return next
            },
            { replace: true }
        )
      },
      [setSearchParams]
  )

  const setViewMode        = (v: ViewMode) => updateParams({ view: v, page: '1' })
  const setSearchQuery     = (v: string)   => updateParams({ q: v, page: '1' })
  const setSelectedCategory = (v: string)  => updateParams({ category: v, page: '1' })
  const setBarrierFreeOnly = (v: boolean)  => updateParams({ barrier: String(v), page: '1' })
  const setCurrentPage     = (p: number)   => updateParams({ page: String(p) })
  const setSortKey         = (v: SortKey)  => updateParams({ sort: v, page: '1' })

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await axiosInstance.get('/public/map')
        setEvents(response.data)
      } catch (err) {
        setError('행사 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [auth.user])

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

    if (sortKey === 'title_asc')     return [...filtered].sort((a, b) => a.title.localeCompare(b.title, 'ko'))
    if (sortKey === 'title_desc')    return [...filtered].sort((a, b) => b.title.localeCompare(a.title, 'ko'))
    if (sortKey === 'barrier_first') return [...filtered].sort((a, b) => Number(hasBarrierFreeInfo(b)) - Number(hasBarrierFreeInfo(a)))
    if (sortKey === 'distance' && userLocation) {
      return [...filtered].sort((a, b) => {
        const distA = a.mapx && a.mapy
            ? calcDistance(userLocation.lat, userLocation.lng, parseFloat(a.mapy), parseFloat(a.mapx))
            : Infinity
        const distB = b.mapx && b.mapy
            ? calcDistance(userLocation.lat, userLocation.lng, parseFloat(b.mapy), parseFloat(b.mapx))
            : Infinity
        return distA - distB
      })
    }
    return filtered
  }, [events, selectedCategory, barrierFreeOnly, searchQuery, sortKey, userLocation])

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE))
  const safePage   = Math.min(currentPage, totalPages)
  const pagedEvents = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filteredEvents.slice(start, start + PAGE_SIZE)
  }, [filteredEvents, safePage])

  useEffect(() => {
    if (!loading && currentPage > totalPages && totalPages > 0) {
      updateParams({ page: '1' })
    }
  }, [filteredEvents.length, loading])

  const mapData = useMemo(
      () =>
          filteredEvents
              .filter((e) => e.mapx && e.mapy)
              .map((e) => ({
                title: e.title, addr1: e.addr1,
                mapx: e.mapx, mapy: e.mapy,
                contentid: e.contentid, id: e.contentid,
                firstimage: e.firstimage,
              })),
      [filteredEvents]
  )

  useEffect(() => {
    if (loading) return
    const saved = sessionStorage.getItem(SCROLL_KEY)
    if (saved) {
      window.scrollTo({ top: parseInt(saved, 10), behavior: 'instant' })
      sessionStorage.removeItem(SCROLL_KEY)
    }
  }, [loading])

  const handleEventClick = useCallback((contentid: string) => {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY))
    navigate(`/events/${contentid}`)
  }, [navigate])

  const resetFilters = () => setSearchParams({}, { replace: true })

  const renderPagination = () => {
    if (totalPages <= 1) return null
    const delta = 2
    const rangeStart = Math.max(1, safePage - delta)
    const rangeEnd   = Math.min(totalPages, safePage + delta)
    const pages: (number | 'ellipsis')[] = []

    if (rangeStart > 1) { pages.push(1); if (rangeStart > 2) pages.push('ellipsis') }
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
                  <span key={`e-${idx}`} className="w-9 h-9 flex items-center justify-center text-gray-400 text-sm">…</span>
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

  return (
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* ── 헤더 ── */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">행사 둘러보기</h1>
            <p className="text-gray-400 mt-1 text-sm">대구·경북 지역의 문화 행사를 찾아보세요</p>
          </div>
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
            <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    viewMode === 'list' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <LayoutGrid className="w-4 h-4" /> 목록
            </button>
            <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    viewMode === 'map' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <Map className="w-4 h-4" /> 지도
            </button>
          </div>
        </div>

        {/* ── 사이드바 + 메인 2단 레이아웃 ── */}
        <div className="flex gap-6 items-start">

          {/* ── 왼쪽 사이드바 필터 ── */}
          <aside className="w-56 flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sticky top-6">

            {/* 카테고리 */}
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">카테고리</p>
            <div className="flex flex-col gap-1 mb-5">
              {CATEGORY_OPTIONS.map((opt) => (
                  <button
                      key={opt.value}
                      onClick={() => setSelectedCategory(opt.value)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedCategory === opt.value
                              ? 'bg-orange-50 border border-orange-200 text-orange-700'
                              : 'text-gray-600 hover:bg-gray-50 border border-transparent'
                      }`}
                  >
                    {opt.label}
                  </button>
              ))}
            </div>

            <div className="border-t border-gray-100 my-4" />

            {/* 정렬 */}
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">정렬</p>
            <div className="flex flex-col gap-1 mb-5">
              {SORT_OPTIONS.map((opt) => {
                const isDistanceDisabled = opt.value === 'distance' && !userLocation
                return (
                    <button
                        key={opt.value}
                        onClick={() => !isDistanceDisabled && setSortKey(opt.value)}
                        disabled={isDistanceDisabled}
                        title={isDistanceDisabled ? '위치 정보를 가져오는 중입니다' : undefined}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                            isDistanceDisabled
                                ? 'text-gray-300 cursor-not-allowed border border-transparent'
                                : sortKey === opt.value
                                    ? 'bg-gray-100 text-gray-900 border border-gray-200'
                                    : 'text-gray-600 hover:bg-gray-50 border border-transparent'
                        }`}
                    >
                      {opt.icon}
                      <span>{opt.label}</span>
                      {isDistanceDisabled && <span className="text-[10px] text-gray-300 ml-auto">로딩중</span>}
                    </button>
                )
              })}
            </div>

            <div className="border-t border-gray-100 my-4" />

            {/* 접근성 토글 */}
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">접근성</p>
            <label className="flex items-center justify-between gap-2 cursor-pointer mb-5">
              <span className="text-sm text-gray-600 leading-snug">배리어프리<br />정보만 보기</span>
              <div
                  onClick={() => setBarrierFreeOnly(!barrierFreeOnly)}
                  className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${
                      barrierFreeOnly ? 'bg-orange-500' : 'bg-gray-200'
                  }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    barrierFreeOnly ? 'translate-x-5' : 'translate-x-1'
                }`} />
              </div>
            </label>

            {auth.user?.requiresBarrierFree && (
                <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-800">
                  ♿ 배리어프리 우선 추천이 적용되어 있습니다.
                </div>
            )}

            <div className="border-t border-gray-100 my-4" />

            {/* 필터 초기화 */}
            <button
                onClick={resetFilters}
                className="w-full py-2 rounded-xl text-sm font-semibold text-orange-500 hover:bg-orange-50 transition-colors border border-orange-100"
            >
              필터 초기화
            </button>
          </aside>

          {/* ── 오른쪽 메인 콘텐츠 ── */}
          <div className="flex-1 min-w-0">

            {/* 검색창 */}
            <div className="relative mb-5">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                  type="text"
                  placeholder="행사명 또는 주소로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-10 py-3 border border-gray-200 rounded-2xl text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-shadow"
              />
              {searchQuery && (
                  <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
              )}
            </div>

            {/* 결과 수 */}
            {!loading && !error && viewMode === 'list' && (
                <p className="text-sm text-gray-400 mb-4">
                  총 <span className="font-bold text-gray-900">{filteredEvents.length}</span>개의 행사
                </p>
            )}
            {!loading && !error && viewMode === 'map' && (
                <p className="text-sm text-gray-400 mb-4">
                  지도에 <span className="font-bold text-gray-900">{mapData.length}</span>개 마커 표시
                </p>
            )}

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
                  <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                  >
                    다시 시도
                  </button>
                </div>
            )}

            {!loading && !error && (
                <>
                  {/* ── 지도 뷰 ── */}
                  {viewMode === 'map' && (
                      <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: '620px', position: 'relative' }}>
                        <button
                            onClick={handleRecenter}
                            title="내 위치로 이동"
                            style={{
                              position: 'absolute', bottom: 16, right: 16, zIndex: 20,
                              width: 42, height: 42, borderRadius: '50%',
                              background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)',
                              border: 'none', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
                              transition: 'transform 0.2s',
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
                              <button onClick={resetFilters} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
                                필터 초기화
                              </button>
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
                              <button onClick={resetFilters} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
                                필터 초기화
                              </button>
                            </div>
                        ) : (
                            <>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {pagedEvents.map((event) => {
                                  const accessible    = hasBarrierFreeInfo(event)
                                  const categoryLabel = CATEGORY_MAP[event.cat1 ?? ''] ?? '문화행사'
                                  const isGuideDog    = event.overview?.includes('시각장애인') || event.title.includes('배리어프리')

                                  return (
                                      <div
                                          key={event.contentid}
                                          onClick={() => handleEventClick(event.contentid)}
                                          className="group bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-pointer hover:border-orange-200 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300"
                                      >
                                        {/* 이미지 */}
                                        <div className="relative h-52 bg-gray-100 overflow-hidden">
                                          <LazyImage
                                              src={event.firstimage || DEFAULT_IMAGE}
                                              alt={event.title}
                                              wrapperClassName="w-full h-full"
                                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                              onError={(e) => { ;(e.target as HTMLImageElement).src = DEFAULT_IMAGE }}
                                          />
                                          <span className="absolute top-3 left-3 px-2.5 py-1 bg-black/55 text-white text-[10px] font-bold rounded-full backdrop-blur-sm">
                                            {categoryLabel}
                                          </span>
                                          {accessible && (
                                              <span className="absolute top-3 right-3 px-2.5 py-1 bg-orange-50 text-orange-700 text-[10px] font-bold rounded-full border border-orange-200">
                                                ♿ 배리어프리
                                              </span>
                                          )}
                                        </div>

                                        {/* 내용 */}
                                        <div className="p-5">
                                          <h3 className="font-bold text-gray-900 text-sm mb-1.5 line-clamp-1">
                                            {event.title}
                                          </h3>
                                          <p className="text-xs text-gray-400 flex items-center gap-1 line-clamp-1">
                                            <MapPin className="w-3 h-3 flex-shrink-0" />
                                            {event.addr1 || '주소 정보 없음'}
                                          </p>

                                          {isGuideDog && (
                                              <div className="mt-3">
                                                <IconLabel type="guideDog" />
                                              </div>
                                          )}
                                        </div>
                                      </div>
                                  )
                                })}
                              </div>

                              {renderPagination()}
                            </>
                        )}
                      </>
                  )}
                </>
            )}
          </div>
        </div>
      </div>
  )
}