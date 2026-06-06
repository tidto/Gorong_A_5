import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import MapView from '../components/MapView'
import LazyImage from '../components/common/LazyImage'
import { useAuth } from '../contexts/AuthContext'
import axiosInstance from '../api/axiosInstance'
import { Search, Target, ChevronLeft, ChevronRight, CloudSun, MapPin, CalendarDays, X } from 'lucide-react'

// ─── 상수 ─────────────────────────────────────────────────────────
const CATEGORY_MAP: Record<string, string> = {
    NA: 'A01', VE: 'A02', LS: 'A03', SH: 'A04', FD: 'A05', C01: 'C01',
}
const RECOMMEND_BY_WEATHER: Record<string, string[]> = {
    Clear: ['A03', 'A04'], Clouds: ['A03', 'A04'],
    Rain: ['A01', 'A02'],  Snow: ['A01', 'A02'],
}
const RECOMMEND_BY_TIME: Record<'DAY' | 'NIGHT', string[]> = {
    DAY: ['A03', 'A04', 'A05'], NIGHT: ['A01', 'A03'],
}
const REGION_BOUNDARY = { LAT_MIN: 34.0, LAT_MAX: 38.5, LNG_MIN: 126.0, LNG_MAX: 131.0 }
const DEFAULT_LOCATION = { lat: 35.8956, lng: 128.6224 }

const WEATHER_ICON: Record<string, string> = {
    Clear: '☀️', Clouds: '☁️', Rain: '🌧️', Snow: '❄️',
}
const WEATHER_TEXT: Record<string, string> = {
    Clear: '맑고 선선한 오늘',
    Clouds: '흐린 하늘인 오늘',
    Rain: '비가 내리는 오늘',
    Snow: '눈이 내리는 오늘',
}

// ─── 유틸 훅 ──────────────────────────────────────────────────────
function useCarousel(items: any[], perPage: number) {
    const [page, setPage] = useState(0)
    const totalPages = Math.max(1, Math.ceil(items.length / perPage))

    // items가 새로 로드되면 page를 0으로 리셋
    const prevLenRef = React.useRef(items.length)
    if (prevLenRef.current !== items.length) {
        prevLenRef.current = items.length
        if (page !== 0) setPage(0)
    }

    // page가 범위를 벗어난 경우 보정
    const safePage = Math.min(page, totalPages - 1)

    const prev = () => setPage(p => Math.max(0, p - 1))
    const next = () => setPage(p => Math.min(totalPages - 1, p + 1))
    const visible = items.slice(safePage * perPage, safePage * perPage + perPage)
    return { page: safePage, totalPages, prev, next, visible, canPrev: safePage > 0, canNext: safePage < totalPages - 1 }
}

// ─── 서브 컴포넌트 ────────────────────────────────────────────────

function CarouselNav({
                         page, totalPages, canPrev, canNext, onPrev, onNext,
                     }: {
    page: number; totalPages: number
    canPrev: boolean; canNext: boolean
    onPrev: () => void; onNext: () => void
}) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-xs text-gray-300 font-medium tabular-nums">{page + 1} / {totalPages}</span>
            <button
                onClick={onPrev} disabled={!canPrev}
                className="w-9 h-9 rounded-full flex items-center justify-center border-none
                           bg-white shadow-sm disabled:opacity-30 disabled:cursor-not-allowed
                           hover:bg-orange-500 hover:text-white hover:shadow-md
                           transition-all duration-200 text-gray-500"
            >
                <ChevronLeft size={16} />
            </button>
            <button
                onClick={onNext} disabled={!canNext}
                className="w-9 h-9 rounded-full flex items-center justify-center border-none
                           bg-white shadow-sm disabled:opacity-30 disabled:cursor-not-allowed
                           hover:bg-orange-500 hover:text-white hover:shadow-md
                           transition-all duration-200 text-gray-500"
            >
                <ChevronRight size={16} />
            </button>
        </div>
    )
}

function DotTrack({ total, current }: { total: number; current: number }) {
    return (
        <div className="flex justify-center gap-1.5 mt-5">
            {Array.from({ length: total }).map((_, i) => (
                <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === current ? 'w-5 bg-orange-500' : 'w-1.5 bg-gray-200'
                    }`}
                />
            ))}
        </div>
    )
}

function CategoryBadge({ cat }: { cat?: string }) {
    if (!cat) return null
    const map: Record<string, { label: string; color: string }> = {
        A01: { label: '자연', color: 'bg-emerald-50 text-emerald-600' },
        A02: { label: '문화', color: 'bg-purple-50 text-purple-600' },
        A03: { label: '레저', color: 'bg-blue-50 text-blue-600' },
        A04: { label: '쇼핑', color: 'bg-pink-50 text-pink-600' },
        A05: { label: '음식', color: 'bg-yellow-50 text-yellow-700' },
        C01: { label: '추천', color: 'bg-orange-50 text-orange-600' },
    }
    const prefix = (cat || '').toUpperCase().slice(0, 3)
    const info = map[prefix]
    if (!info) return null
    return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${info.color}`}>
            {info.label}
        </span>
    )
}

function EventCard({ event, rank, onClick }: { event: any; rank?: number; onClick: () => void }) {
    const img = event.image || event.firstimage || ''
    const cat = event.cat1 || event.tourCategoryCode || ''

    return (
        <article
            onClick={onClick}
            className="group bg-white rounded-2xl overflow-hidden cursor-pointer
                       border border-gray-100 hover:border-orange-200
                       shadow-sm hover:shadow-xl hover:-translate-y-1.5
                       transition-all duration-300"
        >
            {/* 이미지 */}
            <div className="relative h-44 overflow-hidden bg-gray-100">
                {img ? (
                    <LazyImage
                        src={img}
                        alt={event.title}
                        wrapperClassName="w-full h-full"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        className="group-hover:scale-105 transition-transform duration-500"
                        onError={(e: any) => { e.target.style.display = 'none' }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
                        <span className="text-4xl opacity-40">🎪</span>
                    </div>
                )}
                {/* 그라데이션 오버레이 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* 순위 뱃지 */}
                {rank !== undefined && (
                    <div className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-black/60 backdrop-blur-sm
                                    flex items-center justify-center text-white font-black text-sm">
                        {rank}
                    </div>
                )}

                {/* 카테고리 뱃지 */}
                <div className="absolute top-3 right-3">
                    <CategoryBadge cat={cat} />
                </div>
            </div>

            {/* 텍스트 */}
            <div className="p-4">
                <p className="font-bold text-[14px] text-gray-900 leading-snug line-clamp-2 min-h-[40px]">
                    {event.title}
                </p>
                <p className="mt-2 text-[12px] text-gray-400 flex items-center gap-1 truncate">
                    <MapPin size={11} className="shrink-0 text-orange-400" />
                    {event.addr1 || event.address || '위치 정보 없음'}
                </p>
                {(event.eventStartDate || event.eventEndDate) && (
                    <p className="mt-1 text-[11px] text-gray-400 flex items-center gap-1">
                        <CalendarDays size={11} className="shrink-0 text-orange-400" />
                        {event.eventStartDate ?? '?'} ~ {event.eventEndDate ?? '?'}
                    </p>
                )}
            </div>
        </article>
    )
}

// ─── 메인 페이지 ──────────────────────────────────────────────────
export default function Home() {
    const navigate = useNavigate()
    const auth = useAuth()

    const [events,     setEvents]     = useState<any[]>([])
    const [topEvents,  setTopEvents]  = useState<any[]>([])
    const [isLoading,  setIsLoading]  = useState(true)
    const [searchQuery,  setSearchQuery]  = useState('')
    const [searchInput,  setSearchInput]  = useState('')
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [mapCenter,    setMapCenter]    = useState<{ lat: number; lng: number }>(DEFAULT_LOCATION)
    const [banInfo,      setBanInfo]      = useState<any | null>(null)
    const [appealText,   setAppealText]   = useState('')
    const [isAppealSubmitting, setIsAppealSubmitting] = useState(false)
    const [weatherState, setWeatherState] = useState<string>('Clear')
    const [timeState,    setTimeState]    = useState<'DAY' | 'NIGHT'>('DAY')
    const [mapExpanded,  setMapExpanded]  = useState(false)
    const [searchFocused, setSearchFocused] = useState(false)

    const handleSearch = useCallback(() => setSearchQuery(searchInput.trim()), [searchInput])
    const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearch() }
    const handleClearSearch = () => { setSearchQuery(''); setSearchInput('') }

    // 위치 초기화
    useEffect(() => {
        if (!auth.user) { setUserLocation(null); return }
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => { const l = { lat: pos.coords.latitude, lng: pos.coords.longitude }; setUserLocation(l); setMapCenter(l) },
                async () => {
                    try {
                        const d = await (await fetch('https://ipapi.co/json/')).json()
                        if (d.region === 'Seoul' || !d.latitude) { setUserLocation(DEFAULT_LOCATION); setMapCenter(DEFAULT_LOCATION) }
                        else { const l = { lat: d.latitude, lng: d.longitude }; setUserLocation(l); setMapCenter(l) }
                    } catch { setUserLocation(DEFAULT_LOCATION); setMapCenter(DEFAULT_LOCATION) }
                },
                { timeout: 5000 },
            )
        } else { setUserLocation(DEFAULT_LOCATION); setMapCenter(DEFAULT_LOCATION) }
    }, [auth.user])

    // 날씨/시간
    useEffect(() => {
        const h = new Date().getHours()
        setTimeState(h >= 18 || h < 6 ? 'NIGHT' : 'DAY')
        const key = import.meta.env.VITE_WEATHER_API_KEY
        if (!key) return
        const lat = userLocation?.lat || DEFAULT_LOCATION.lat
        const lng = userLocation?.lng || DEFAULT_LOCATION.lng
        fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${key}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.weather?.[0]) setWeatherState(d.weather[0].main) })
            .catch(() => {})
    }, [userLocation])

    // 행사 목록 로드
    useEffect(() => {
        const fetchAll = async () => {
            setIsLoading(true)
            const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'
            try {
                // 일반 행사 목록 + 인기 TOP10 병렬 요청
                const [allRes, popularRes] = await Promise.all([
                    fetch(`${base}/public/map`),
                    fetch(`${base}/public/map/popular?limit=10`),
                ])
                if (!allRes.ok) throw new Error()

                const allData  = await allRes.json()
                const popData  = popularRes.ok ? await popularRes.json() : []

                const normalize = (item: any) => ({
                    ...item,
                    id:    item.contentid?.toString() || item.id?.toString(),
                    mapx:  item.mapx  || item.mapX,
                    mapy:  item.mapy  || item.mapY,
                    addr1: item.addr1 || item.address,
                    image: item.firstimage || item.firstImage || '',
                })

                const mapped = Array.isArray(allData) ? allData.map(normalize) : []
                setEvents(mapped)

                // 인기 TOP10: 참여 수 기반 API 결과 사용, 실패 시 전체 목록 앞 10개로 fallback
                if (Array.isArray(popData) && popData.length > 0) {
                    setTopEvents(popData.map(normalize))
                } else if (mapped.length) {
                    setTopEvents(mapped.slice(0, 10))
                }
            } catch { setEvents([]); setTopEvents([]) }
            finally  { setIsLoading(false) }
        }
        fetchAll()
    }, [])

    // 이용 제한 정보
    useEffect(() => {
        if (!auth.loggedIn) { setBanInfo(null); return }
        axiosInstance.get('/v1/users/me/ban')
            .then(r => setBanInfo(r.data?.banned ? r.data.ban : null))
            .catch(() => setBanInfo(null))
    }, [auth.loggedIn])

    // 필터링된 행사
    const displayEvents = useMemo(() => events.filter(ev => {
        const lat = parseFloat(ev.mapy ?? ''), lng = parseFloat(ev.mapx ?? '')
        if (isNaN(lat) || isNaN(lng)) return false
        const inside = lat >= REGION_BOUNDARY.LAT_MIN && lat <= REGION_BOUNDARY.LAT_MAX &&
            lng >= REGION_BOUNDARY.LNG_MIN && lng <= REGION_BOUNDARY.LNG_MAX
        if (!inside) return false
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return ev.title.toLowerCase().includes(q) || (ev.addr1 || '').toLowerCase().includes(q)
    }), [events, searchQuery])

    // 맞춤 추천
    const recommendedEvents = useMemo(() => {
        const wt = RECOMMEND_BY_WEATHER[weatherState] || []
        const tt = RECOMMEND_BY_TIME[timeState] || []
        const ic = (auth.user?.interests || []).map((i: string) => CATEGORY_MAP[i]).filter(Boolean)
        return [...displayEvents]
            .map(ev => {
                let s = 0
                const c = (ev.cat1 || ev.tourCategoryCode || ev.cat3 || '').toUpperCase()
                if (ic.some((x: string) => c.startsWith(x))) s += 3
                if (wt.some(x => c.startsWith(x))) s += 2
                if (tt.some(x => c.startsWith(x))) s += 1
                return { ...ev, score: s }
            })
            .sort((a, b) => b.score !== a.score ? b.score - a.score : Math.random() - .5)
            .slice(0, 9)
    }, [displayEvents, auth.user, weatherState, timeState])

    const topCarousel = useCarousel(topEvents, 3)
    const recCarousel = useCarousel(recommendedEvents, 3)

    const handleNav = useCallback((id: string) => {
        if (banInfo || !id) return
        navigate(`/events/${id}`)
    }, [navigate, banInfo])

    const handleRecenter = useCallback(() => {
        setMapCenter({ ...(userLocation || DEFAULT_LOCATION) })
    }, [userLocation])

    const handleSubmitAppeal = async () => {
        if (!appealText.trim()) return
        setIsAppealSubmitting(true)
        try {
            const r = await axiosInstance.post('/v1/users/me/appeal', { appealText: appealText.trim() })
            setBanInfo(r.data); setAppealText('')
        } finally { setIsAppealSubmitting(false) }
    }

    const weatherIcon = WEATHER_ICON[weatherState] || '☀️'
    const weatherText = WEATHER_TEXT[weatherState] || '오늘 날씨에 딱 맞는'

    return (
        <>
            {/* 이용 제한 오버레이 */}
            {banInfo && (
                <div className="fixed inset-0 z-[200] bg-white/80 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl">
                        <h2 className="text-xl font-black text-red-600">서비스 이용 제한 중</h2>
                        <div className="mt-4 space-y-1.5">
                            {[`신고 누적: ${banInfo.reportCount ?? 0}회`, `사유: ${banInfo.banReason}`, `반론 상태: ${banInfo.appealStatus}`].map(t => (
                                <p key={t} className="text-sm text-gray-600">{t}</p>
                            ))}
                            {banInfo.appealStatus === 'RESOLVED' && banInfo.banStatus === 'ACTIVE' && banInfo.appealReviewNote && (
                                <p className="text-sm text-red-700 font-semibold">소명 기각 사유: {banInfo.appealReviewNote}</p>
                            )}
                        </div>
                        {banInfo.appealStatus === 'NONE' ? (
                            <div className="mt-5 space-y-3">
                                <textarea
                                    value={appealText}
                                    onChange={e => setAppealText(e.target.value)}
                                    rows={4}
                                    className="w-full rounded-xl bg-gray-50 p-3 text-sm resize-none outline-none border-none"
                                    placeholder="반론은 1회만 제출할 수 있습니다."
                                />
                                <button
                                    onClick={handleSubmitAppeal}
                                    disabled={!appealText.trim() || isAppealSubmitting}
                                    className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-bold
                                               disabled:opacity-40 hover:bg-gray-700 transition-colors"
                                >
                                    반론 제출
                                </button>
                            </div>
                        ) : (
                            <p className="mt-4 text-xs text-gray-400">반론이 이미 제출되어 추가 제출이 불가합니다.</p>
                        )}
                    </div>
                </div>
            )}

            <div className={`max-w-6xl mx-auto px-6 py-10 pb-20 space-y-16 ${banInfo ? 'opacity-25 pointer-events-none' : ''}`}>

                {/* ── 히어로 ─────────────────────────────────────── */}
                <section className="bg-gradient-to-br from-orange-50 via-white to-amber-50
                                    rounded-3xl p-10 flex flex-col md:flex-row items-center
                                    justify-between gap-10 shadow-sm border border-orange-100/60
                                    animate-[fadeUp_.4s_ease_both]">
                    <div className="flex-1">
                        <p className="text-[11px] font-bold text-orange-500 tracking-widest uppercase mb-2">
                            대구 · 경북 로컬 문화 가이드
                        </p>
                        <h1 className="text-3xl font-black text-gray-900 leading-tight mb-6">
                            안녕, {auth.user?.nickname || 'Go냥이'}! 👋
                        </h1>

                        {/* 검색창 */}
                        <div className={`flex items-stretch bg-white rounded-2xl overflow-hidden max-w-md
                                         shadow-md transition-shadow duration-200
                                         ${searchFocused ? 'ring-2 ring-orange-400/40 shadow-orange-100' : ''}`}>
                            <div className="flex items-center px-4 text-gray-300 shrink-0">
                                <Search size={17} />
                            </div>
                            <input
                                type="text"
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                                placeholder="대구/경북 행사를 검색해보세요"
                                className="flex-1 border-none outline-none text-sm py-4 text-gray-800 bg-transparent placeholder-gray-300"
                            />
                            {searchInput && (
                                <button onClick={() => setSearchInput('')}
                                        className="flex items-center px-3 text-gray-300 hover:text-gray-500 transition-colors">
                                    <X size={15} />
                                </button>
                            )}
                            <button
                                onClick={handleSearch}
                                className="bg-orange-500 hover:bg-orange-600 text-white px-6 text-sm font-bold shrink-0 transition-colors"
                            >
                                검색
                            </button>
                        </div>

                        {/* 검색 결과 태그 */}
                        {searchQuery && (
                            <div className="mt-3 flex items-center gap-2">
                                <span className="text-xs font-semibold text-orange-700 bg-orange-50 rounded-full px-3 py-1">
                                    🔍 "{searchQuery}" — {displayEvents.length}개 결과
                                </span>
                                <button onClick={handleClearSearch}
                                        className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                                    초기화
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 히어로 우측 — 날씨 카드 */}
                    <div className="shrink-0">
                        <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100 min-w-[180px]">
                            <p className="text-2xl mb-1">{weatherIcon}</p>
                            <p className="text-sm font-bold text-gray-700">{weatherText}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {timeState === 'NIGHT' ? '🌙 야간 추천 활성화' : '🌤 주간 추천 활성화'}
                            </p>
                        </div>
                    </div>
                </section>

                {/* ── 지도 ───────────────────────────────────────── */}
                <section className="animate-[fadeUp_.4s_.07s_ease_both]">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                <span className="text-orange-500">📍</span>
                                {searchQuery ? `"${searchQuery}" 검색 결과` : '대구/경북 주변 행사'}
                                <span className="text-sm font-medium text-gray-400">{displayEvents.length}개</span>
                            </h2>
                            <p className="text-xs text-gray-400 mt-1">마커를 클릭하면 행사 상세로 이동합니다</p>
                        </div>
                        <button
                            onClick={() => setMapExpanded(v => !v)}
                            className="text-xs font-bold text-gray-500 bg-white border border-gray-200
                                       rounded-xl px-4 py-2 hover:text-orange-500 hover:border-orange-300
                                       transition-all shadow-sm"
                        >
                            {mapExpanded ? '지도 줄이기' : '지도 크게 보기'}
                        </button>
                    </div>

                    <div
                        className="relative rounded-2xl overflow-hidden shadow-lg transition-all duration-500"
                        style={{ height: mapExpanded ? 580 : 400 }}
                    >
                        <MapView data={displayEvents} onDetailClick={handleNav} userLocation={mapCenter} />

                        {/* 내 위치로 */}
                        <button
                            onClick={handleRecenter}
                            title="내 위치로 이동"
                            className="absolute bottom-4 right-4 z-20 w-11 h-11 rounded-full
                                       bg-white/90 backdrop-blur-sm shadow-lg
                                       flex items-center justify-center
                                       hover:scale-110 hover:bg-orange-50 transition-all"
                        >
                            <Target size={19} className="text-orange-500" />
                        </button>

                        {isLoading && (
                            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm
                                            flex items-center justify-center
                                            text-sm font-bold text-orange-500">
                                데이터 로딩 중...
                            </div>
                        )}
                    </div>
                </section>

                {/* ── 인기 행사 TOP 10 ────────────────────────────── */}
                {topEvents.length > 0 && (
                    <section className="animate-[fadeUp_.4s_.14s_ease_both]">
                        <div className="flex items-start justify-between gap-4 mb-6">
                            <div>
                                <h2 className="text-xl font-black text-gray-900">
                                    지금 가장 인기 있는 행사
                                    <span className="text-orange-500 ml-2">TOP 10</span>
                                </h2>
                                <p className="text-xs text-gray-400 mt-1">참여 신청이 가장 많은 행사를 모아봤어요</p>
                            </div>
                            <CarouselNav
                                page={topCarousel.page}
                                totalPages={topCarousel.totalPages}
                                canPrev={topCarousel.canPrev}
                                canNext={topCarousel.canNext}
                                onPrev={topCarousel.prev}
                                onNext={topCarousel.next}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                            {topCarousel.visible.map((ev, i) => (
                                <EventCard
                                    key={`top-${ev.id}`}
                                    event={ev}
                                    rank={topCarousel.page * 3 + i + 1}
                                    onClick={() => handleNav(ev.id)}
                                />
                            ))}
                        </div>
                        <DotTrack total={topCarousel.totalPages} current={topCarousel.page} />
                    </section>
                )}

                {/* ── 맞춤 추천 ───────────────────────────────────── */}
                {recommendedEvents.length > 0 && (
                    <section className="animate-[fadeUp_.4s_.21s_ease_both]">
                        <div className="flex items-start justify-between gap-4 mb-6">
                            <div>
                                <h2 className="text-xl font-black text-gray-900">
                                    <span className="mr-1">✨</span>
                                    {auth.user?.nickname || 'Go냥이'}님을 위한 맞춤 추천
                                </h2>
                                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                    <CloudSun size={12} className="text-orange-400" />
                                    {weatherIcon} {weatherText}, 딱 맞는 행사 카드를 조합해 보았어요.
                                </p>
                            </div>
                            <CarouselNav
                                page={recCarousel.page}
                                totalPages={recCarousel.totalPages}
                                canPrev={recCarousel.canPrev}
                                canNext={recCarousel.canNext}
                                onPrev={recCarousel.prev}
                                onNext={recCarousel.next}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                            {recCarousel.visible.map(ev => (
                                <EventCard key={`rec-${ev.id}`} event={ev} onClick={() => handleNav(ev.id)} />
                            ))}
                        </div>
                        <DotTrack total={recCarousel.totalPages} current={recCarousel.page} />
                    </section>
                )}

            </div>

            <style>{`
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(14px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </>
    )
}