import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import MapView from '../components/MapView'
import LazyImage from '../components/common/LazyImage'
import { useAuth } from '../contexts/AuthContext'
import axiosInstance from '../api/axiosInstance'
import {
    Search, Target, ChevronLeft, ChevronRight,
    CloudSun, MapPin, CalendarDays, X,
    TrendingUp, Sparkles, Map, ArrowRight,
    Mountain, Theater, ShoppingBag, UtensilsCrossed, Tent,
} from 'lucide-react'

// ─── 상수 ─────────────────────────────────────────────────────────
const CATEGORY_MAP: Record<string, string> = {
    NA: 'A01', VE: 'A02', LS: 'A03', SH: 'A04', FD: 'A05', C01: 'C01',
}
const RECOMMEND_BY_WEATHER: Record<string, string[]> = {
    Clear: ['A03', 'A04'], Clouds: ['A03', 'A04'],
    Rain: ['A01', 'A02'], Snow: ['A01', 'A02'],
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
    Clear: '맑고 화창한 날씨',
    Clouds: '흐린 하늘의 날씨',
    Rain: '비가 내리는 날씨',
    Snow: '눈이 내리는 날씨',
}

const CATEGORY_TABS = [
    { id: 'all',  label: '전체', icon: null },
    { id: 'A01',  label: '자연', icon: Mountain },
    { id: 'A02',  label: '문화', icon: Theater },
    { id: 'A03',  label: '레저', icon: Tent },
    { id: 'A04',  label: '쇼핑', icon: ShoppingBag },
    { id: 'A05',  label: '음식', icon: UtensilsCrossed },
]

// ─── 유틸 훅 ──────────────────────────────────────────────────────
function useCarousel(items: any[], perPage: number) {
    const [page, setPage] = useState(0)
    const totalPages = Math.max(1, Math.ceil(items.length / perPage))
    const prevLenRef = React.useRef(items.length)
    if (prevLenRef.current !== items.length) {
        prevLenRef.current = items.length
        if (page !== 0) setPage(0)
    }
    const safePage = Math.min(page, totalPages - 1)
    const prev = () => setPage(p => Math.max(0, p - 1))
    const next = () => setPage(p => Math.min(totalPages - 1, p + 1))
    const visible = items.slice(safePage * perPage, safePage * perPage + perPage)
    return { page: safePage, totalPages, prev, next, visible, canPrev: safePage > 0, canNext: safePage < totalPages - 1 }
}

// ─── 서브 컴포넌트 ────────────────────────────────────────────────

// 캐러셀 버튼
function CarouselBtn({ dir, disabled, onClick }: { dir: 'prev' | 'next'; disabled: boolean; onClick: () => void }) {
    const [hov, setHov] = useState(false)
    return (
        <button onClick={onClick} disabled={disabled}
                onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
                style={{
                    width: 36, height: 36, borderRadius: '50%', border: '1.5px solid #e0e0e0',
                    background: disabled ? '#fafafa' : hov ? '#fb923c' : '#fff',
                    color: disabled ? '#ccc' : hov ? '#fff' : '#555',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.18s', boxShadow: disabled ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
                }}>
            {dir === 'prev' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
    )
}

// 섹션 헤더
function SectionHeader({ icon: Icon, title, subtitle }: {
    icon?: any; title: React.ReactNode; subtitle?: string
}) {
    return (
        <div style={{ marginBottom: 20 }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 20, fontWeight: 800,
                color: '#1a1a1a', margin: 0, letterSpacing: '-0.02em' }}>
                {Icon && <Icon size={20} color="#fb923c" />}
                {title}
            </h2>
            {subtitle && <p style={{ fontSize: 13, color: '#aaa', marginTop: 5, fontWeight: 400, marginBottom: 0 }}>{subtitle}</p>}
        </div>
    )
}

// 카테고리 뱃지
function CategoryBadge({ cat }: { cat?: string }) {
    if (!cat) return null
    const map: Record<string, { label: string; bg: string; text: string }> = {
        A01: { label: '자연', bg: '#e8f5e9', text: '#2e7d32' },
        A02: { label: '문화', bg: '#ede7f6', text: '#5e35b1' },
        A03: { label: '레저', bg: '#e3f2fd', text: '#1565c0' },
        A04: { label: '쇼핑', bg: '#fce4ec', text: '#c62828' },
        A05: { label: '음식', bg: '#fff8e1', text: '#e65100' },
        C01: { label: '추천', bg: '#fff3e0', text: '#e65100' },
    }
    const prefix = (cat || '').toUpperCase().slice(0, 3)
    const info = map[prefix]
    if (!info) return null
    return (
        <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
            background: info.bg, color: info.text, letterSpacing: '0.02em',
        }}>
            {info.label}
        </span>
    )
}

// ── TOP10 가로형 리스트 카드 ───────────────────────────────────────
function TopEventCard({ event, rank, onClick }: { event: any; rank: number; onClick: () => void }) {
    const img = event.image || event.firstimage || ''
    const cat = event.cat1 || event.tourCategoryCode || ''
    const [hovered, setHovered] = useState(false)

    const rankColor =
        rank === 1 ? '#f59e0b' :
            rank === 2 ? '#9ca3af' :
                rank === 3 ? '#b45309' : '#d1d5db'

    return (
        <article
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px',
                background: hovered ? '#fff7ed' : '#fff',
                borderRadius: 14,
                border: hovered ? '1.5px solid #fb923c' : '1.5px solid #f0f0f0',
                boxShadow: hovered ? '0 6px 20px rgba(251,146,60,0.12)' : '0 2px 8px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                transform: hovered ? 'translateY(-2px)' : 'none',
            }}
        >
            {/* 순위 */}
            <span style={{
                fontSize: rank <= 3 ? 22 : 18,
                fontWeight: 900,
                color: rankColor,
                width: 28,
                minWidth: 28,
                textAlign: 'center',
                fontFamily: '"Playfair Display", Georgia, serif',
                lineHeight: 1,
            }}>
                {rank}
            </span>

            {/* 썸네일 */}
            <div style={{ width: 56, height: 56, minWidth: 56, borderRadius: 12, overflow: 'hidden', background: '#f5f5f5' }}>
                {img ? (
                    <LazyImage
                        src={img}
                        alt={event.title}
                        wrapperClassName="w-full h-full"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                            transform: hovered ? 'scale(1.08)' : 'scale(1)', transition: 'transform 0.35s ease' }}
                        onError={(e: any) => { e.target.style.display = 'none' }}
                    />
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 20 }}>🎪</div>
                )}
            </div>

            {/* 텍스트 */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ marginBottom: 4 }}>
                    <CategoryBadge cat={cat} />
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.4, margin: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {event.title}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <MapPin size={10} color="#fb923c" />
                    <span style={{ fontSize: 11, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {event.addr1 || event.address || '위치 정보 없음'}
                    </span>
                </div>
                {(event.eventStartDate || event.eventEndDate) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <CalendarDays size={10} color="#fb923c" />
                        <span style={{ fontSize: 10, color: '#bbb' }}>
                            {event.eventStartDate ?? '?'} ~ {event.eventEndDate ?? '?'}
                        </span>
                    </div>
                )}
            </div>

            <ChevronRight size={14} color={hovered ? '#fb923c' : '#d1d5db'} style={{ flexShrink: 0, transition: 'color 0.2s' }} />
        </article>
    )
}

// ── 맞춤 추천 정사각형 카드 ───────────────────────────────────────
function RecommendCard({ event, onClick }: { event: any; onClick: () => void }) {
    const img = event.image || event.firstimage || ''
    const cat = event.cat1 || event.tourCategoryCode || ''
    const [hovered, setHovered] = useState(false)

    return (
        <article
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: '#fff',
                borderRadius: 14,
                overflow: 'hidden',
                cursor: 'pointer',
                border: hovered ? '1.5px solid #fb923c' : '1.5px solid #f0f0f0',
                boxShadow: hovered ? '0 10px 28px rgba(251,146,60,0.14)' : '0 2px 8px rgba(0,0,0,0.05)',
                transition: 'all 0.22s ease',
                transform: hovered ? 'translateY(-3px)' : 'none',
            }}
        >
            {/* 정사각 이미지 */}
            <div style={{ position: 'relative', paddingTop: '100%', background: '#f5f5f5', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0 }}>
                    {img ? (
                        <LazyImage
                            src={img}
                            alt={event.title}
                            wrapperClassName="w-full h-full"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                                transform: hovered ? 'scale(1.06)' : 'scale(1)', transition: 'transform 0.5s ease' }}
                            onError={(e: any) => { e.target.style.display = 'none' }}
                        />
                    ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', fontSize: 32 }}>🎪</div>
                    )}
                    {/* 하단 그라데이션 */}
                    <div style={{ position: 'absolute', inset: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 55%)',
                        opacity: hovered ? 1 : 0.6, transition: 'opacity 0.3s' }} />
                    {/* 카테고리 */}
                    <div style={{ position: 'absolute', bottom: 8, left: 8 }}>
                        <CategoryBadge cat={cat} />
                    </div>
                </div>
            </div>

            {/* 텍스트 */}
            <div style={{ padding: '10px 12px' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.45, margin: 0,
                    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                    {event.title}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 6 }}>
                    <MapPin size={9} color="#fb923c" />
                    <span style={{ fontSize: 10, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {event.addr1 || event.address || '위치 정보 없음'}
                    </span>
                </div>
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
    const [searchQuery,   setSearchQuery]   = useState('')
    const [searchInput,   setSearchInput]   = useState('')
    const [userLocation,  setUserLocation]  = useState<{ lat: number; lng: number } | null>(null)
    const [mapCenter,     setMapCenter]     = useState<{ lat: number; lng: number }>(DEFAULT_LOCATION)
    const [banInfo,       setBanInfo]       = useState<any | null>(null)
    const [appealText,    setAppealText]    = useState('')
    const [isAppealSubmitting, setIsAppealSubmitting] = useState(false)
    const [weatherState,  setWeatherState]  = useState<string>('Clear')
    const [timeState,     setTimeState]     = useState<'DAY' | 'NIGHT'>('DAY')
    const [mapExpanded,   setMapExpanded]   = useState(false)
    const [searchFocused, setSearchFocused] = useState(false)
    const [activeCategory, setActiveCategory] = useState('all')
    const [searchPopupOpen, setSearchPopupOpen] = useState(false)
    const [popupRect, setPopupRect] = useState<{ top: number; left: number; width: number } | null>(null)
    const searchWrapRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    const handleSearch    = useCallback(() => {
        const q = searchInput.trim()
        if (!q) return
        setSearchQuery(q)
        setSearchPopupOpen(false)
        searchInputRef.current?.blur()
    }, [searchInput])
    const handleKeyDown   = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch()
        if (e.key === 'Escape') setSearchPopupOpen(false)
    }
    const handleClearSearch = () => { setSearchQuery(''); setSearchInput(''); setSearchPopupOpen(false) }

    // 팝업 rect 계산
    const updatePopupRect = useCallback(() => {
        if (searchWrapRef.current) {
            const r = searchWrapRef.current.getBoundingClientRect()
            setPopupRect({ top: r.bottom, left: r.left, width: r.width })
        }
    }, [])

    // 외부 클릭으로 팝업 닫기
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
                setSearchPopupOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // 팝업 열릴 때 위치 계산
    useEffect(() => {
        if (searchPopupOpen) updatePopupRect()
    }, [searchPopupOpen, updatePopupRect])

    // 스크롤 시 팝업 닫기 (팝업 내부 스크롤은 제외)
    useEffect(() => {
        if (!searchPopupOpen) return
        const handler = (e: Event) => {
            // 팝업 내부 스크롤이면 무시
            const popup = document.getElementById('search-popup-dropdown')
            if (popup && popup.contains(e.target as Node)) return
            setSearchPopupOpen(false)
        }
        window.addEventListener('scroll', handler, true)
        window.addEventListener('resize', () => setSearchPopupOpen(false))
        return () => {
            window.removeEventListener('scroll', handler, true)
            window.removeEventListener('resize', () => setSearchPopupOpen(false))
        }
    }, [searchPopupOpen])

    // 팝업용 실시간 검색 결과 (최대 8개)
    const popupResults = useMemo(() => {
        const q = searchInput.trim().toLowerCase()
        if (!q) return []
        return events
            .filter(ev => {
                const lat = parseFloat(ev.mapy ?? ''), lng = parseFloat(ev.mapx ?? '')
                if (isNaN(lat) || isNaN(lng)) return false
                return (
                    lat >= REGION_BOUNDARY.LAT_MIN && lat <= REGION_BOUNDARY.LAT_MAX &&
                    lng >= REGION_BOUNDARY.LNG_MIN && lng <= REGION_BOUNDARY.LNG_MAX &&
                    (ev.title.toLowerCase().includes(q) || (ev.addr1 || '').toLowerCase().includes(q))
                )
            })
            .slice(0, 8)
    }, [searchInput, events])

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
                const [allRes, popularRes] = await Promise.all([
                    fetch(`${base}/public/map`),
                    fetch(`${base}/public/map/popular?limit=10`),
                ])
                if (!allRes.ok) throw new Error()
                const allData = await allRes.json()
                const popData = popularRes.ok ? await popularRes.json() : []
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

    // 이용 제한
    useEffect(() => {
        if (!auth.loggedIn) { setBanInfo(null); return }
        axiosInstance.get('/v1/users/me/ban')
            .then(r => setBanInfo(r.data?.banned ? r.data.ban : null))
            .catch(() => setBanInfo(null))
    }, [auth.loggedIn])

    // 필터링
    const displayEvents = useMemo(() => events.filter(ev => {
        const lat = parseFloat(ev.mapy ?? ''), lng = parseFloat(ev.mapx ?? '')
        if (isNaN(lat) || isNaN(lng)) return false
        const inside = lat >= REGION_BOUNDARY.LAT_MIN && lat <= REGION_BOUNDARY.LAT_MAX &&
            lng >= REGION_BOUNDARY.LNG_MIN && lng <= REGION_BOUNDARY.LNG_MAX
        if (!inside) return false
        if (activeCategory !== 'all') {
            const c = (ev.cat1 || ev.tourCategoryCode || ev.cat3 || '').toUpperCase()
            if (!c.startsWith(activeCategory)) return false
        }
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return ev.title.toLowerCase().includes(q) || (ev.addr1 || '').toLowerCase().includes(q)
    }), [events, searchQuery, activeCategory])

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
            .slice(0, 12)
    }, [displayEvents, auth.user, weatherState, timeState])

    const topCarousel = useCarousel(topEvents, 5)
    const recCarousel = useCarousel(recommendedEvents, 6)

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
            {/* ── 검색 팝업 (fixed — overflow: hidden 영향 없음) ── */}
            {searchPopupOpen && popupRect && (
                <div id="search-popup-dropdown" style={{
                    position: 'fixed',
                    top: popupRect.top,
                    left: popupRect.left,
                    width: popupRect.width,
                    zIndex: 9999,
                    background: '#fff',
                    borderRadius: '0 0 20px 20px',
                    boxShadow: '0 16px 40px rgba(0,0,0,0.22)',
                    border: '2px solid #fb923c',
                    borderTop: '1.5px solid #f0f0f0',
                    overflow: 'hidden',
                    maxHeight: 440,
                    overflowY: 'auto',
                }}>
                    {popupResults.length > 0 ? (
                        <>
                            {/* 헤더 */}
                            <div style={{ padding: '10px 20px 8px', borderBottom: '1px solid #f5f5f5',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 12, color: '#aaa', fontWeight: 600 }}>
                                    "{searchInput.trim()}" 검색 결과 {popupResults.length}개
                                </span>
                                <button
                                    onMouseDown={e => { e.preventDefault(); handleSearch() }}
                                    style={{ fontSize: 12, color: '#fb923c', fontWeight: 700,
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
                                    전체보기 <ArrowRight size={12} />
                                </button>
                            </div>

                            {/* 결과 리스트 */}
                            {popupResults.map((ev, idx) => {
                                const img = ev.image || ev.firstimage || ''
                                const cat = ev.cat1 || ev.tourCategoryCode || ''
                                const q = searchInput.trim()
                                const titleLower = ev.title.toLowerCase()
                                const matchIdx = titleLower.indexOf(q.toLowerCase())
                                return (
                                    <button
                                        key={ev.id || idx}
                                        onMouseDown={e => { e.preventDefault(); handleNav(ev.id); setSearchPopupOpen(false) }}
                                        style={{
                                            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '10px 20px', background: 'none', border: 'none',
                                            borderBottom: idx < popupResults.length - 1 ? '1px solid #f9f9f9' : 'none',
                                            cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                                            transition: 'background 0.12s',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#fff7ed')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                    >
                                        {/* 썸네일 */}
                                        <div style={{ width: 44, height: 44, minWidth: 44, borderRadius: 10,
                                            overflow: 'hidden', background: '#f5f5f5', flexShrink: 0 }}>
                                            {img
                                                ? <img src={img} alt={ev.title}
                                                       style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                                       onError={(e: any) => { e.target.style.display = 'none' }} />
                                                : <div style={{ width: '100%', height: '100%', display: 'flex',
                                                    alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎪</div>
                                            }
                                        </div>
                                        {/* 텍스트 */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', margin: '0 0 3px',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {matchIdx === -1 ? ev.title : (
                                                    <>
                                                        {ev.title.slice(0, matchIdx)}
                                                        <mark style={{ background: '#ffedd5', color: '#ea580c',
                                                            borderRadius: 3, padding: '0 2px' }}>
                                                            {ev.title.slice(matchIdx, matchIdx + q.length)}
                                                        </mark>
                                                        {ev.title.slice(matchIdx + q.length)}
                                                    </>
                                                )}
                                            </p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <CategoryBadge cat={cat} />
                                                <span style={{ fontSize: 11, color: '#bbb', display: 'flex',
                                                    alignItems: 'center', gap: 3, overflow: 'hidden',
                                                    textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    <MapPin size={9} color="#fb923c" />
                                                    {ev.addr1 || ev.address || '위치 정보 없음'}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight size={13} color="#d1d5db" style={{ flexShrink: 0 }} />
                                    </button>
                                )
                            })}

                            {/* 전체 검색 버튼 */}
                            <button
                                onMouseDown={e => { e.preventDefault(); handleSearch() }}
                                style={{
                                    width: '100%', padding: '12px 20px',
                                    background: '#fff7ed', border: 'none', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    fontSize: 13, fontWeight: 700, color: '#fb923c', fontFamily: 'inherit',
                                    borderTop: '1px solid #f0f0f0', transition: 'background 0.12s',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#ffedd5')}
                                onMouseLeave={e => (e.currentTarget.style.background = '#fff7ed')}
                            >
                                <Search size={14} />
                                "{searchInput.trim()}" 전체 결과 보기
                            </button>
                        </>
                    ) : (
                        /* 결과 없음 */
                        <div style={{ padding: '28px 20px', textAlign: 'center' }}>
                            <p style={{ fontSize: 28, margin: '0 0 8px' }}>🔍</p>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' }}>
                                "{searchInput.trim()}"에 대한 결과가 없어요
                            </p>
                            <p style={{ fontSize: 12, color: '#aaa', margin: 0 }}>
                                다른 키워드나 지역명으로 검색해보세요
                            </p>
                        </div>
                    )}
                </div>
            )}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=Noto+Sans+KR:wght@400;500;600;700;800;900&display=swap');

                * { box-sizing: border-box; }

                .gorong-home {
                    font-family: 'Noto Sans KR', -apple-system, sans-serif;
                    background: #f7f7f5;
                    min-height: 100vh;
                }

                .hero-search-input::placeholder { color: #bbb; }
                .hero-search-input:focus { outline: none; }

                .cat-tab {
                    padding: 8px 18px;
                    border-radius: 24px;
                    border: 1.5px solid #e8e8e8;
                    background: #fff;
                    font-size: 13px;
                    font-weight: 600;
                    color: #666;
                    cursor: pointer;
                    transition: all 0.18s;
                    display: flex; align-items: center; gap: 6px;
                    white-space: nowrap;
                    font-family: inherit;
                }
                .cat-tab:hover { border-color: #fb923c; color: #fb923c; }
                .cat-tab.active { background: #fb923c; border-color: #fb923c; color: #fff; }

                .cat-scroll::-webkit-scrollbar { display: none; }
                .cat-scroll { -ms-overflow-style: none; scrollbar-width: none; }

                .rec-grid {
                    display: grid;
                    grid-template-columns: repeat(6, 1fr);
                    gap: 12px;
                }
                @media (max-width: 1024px) { .rec-grid { grid-template-columns: repeat(4, 1fr); } }
                @media (max-width: 768px)  { .rec-grid { grid-template-columns: repeat(3, 1fr); } }
                @media (max-width: 480px)  { .rec-grid { grid-template-columns: repeat(2, 1fr); } }

                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .fade-up-1 { animation: fadeUp 0.45s ease both; }
                .fade-up-2 { animation: fadeUp 0.45s 0.08s ease both; }
                .fade-up-3 { animation: fadeUp 0.45s 0.16s ease both; }
                .fade-up-4 { animation: fadeUp 0.45s 0.24s ease both; }
            `}</style>

            {/* 이용 제한 오버레이 */}
            {banInfo && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(255,255,255,0.85)',
                    backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <div style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 20, padding: 36,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid #fee2e2' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fef2f2',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚠️</div>
                            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#dc2626', margin: 0 }}>서비스 이용 제한 중</h2>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                            {[`신고 누적: ${banInfo.reportCount ?? 0}회`, `사유: ${banInfo.banReason}`, `반론 상태: ${banInfo.appealStatus}`].map(t => (
                                <p key={t} style={{ fontSize: 14, color: '#555', margin: 0, padding: '10px 14px',
                                    background: '#fafafa', borderRadius: 10 }}>{t}</p>
                            ))}
                            {banInfo.appealStatus === 'RESOLVED' && banInfo.banStatus === 'ACTIVE' && banInfo.appealReviewNote && (
                                <p style={{ fontSize: 14, color: '#b91c1c', fontWeight: 600, margin: 0 }}>소명 기각 사유: {banInfo.appealReviewNote}</p>
                            )}
                        </div>
                        {banInfo.appealStatus === 'NONE' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <textarea value={appealText} onChange={e => setAppealText(e.target.value)} rows={4}
                                          style={{ width: '100%', borderRadius: 12, background: '#f9fafb', padding: 14,
                                              fontSize: 14, resize: 'none', outline: 'none', border: '1.5px solid #e5e7eb',
                                              fontFamily: 'inherit' }}
                                          placeholder="반론은 1회만 제출할 수 있습니다." />
                                <button onClick={handleSubmitAppeal} disabled={!appealText.trim() || isAppealSubmitting}
                                        style={{ width: '100%', background: '#1a1a1a', color: '#fff', borderRadius: 12,
                                            padding: '14px 0', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
                                            opacity: (!appealText.trim() || isAppealSubmitting) ? 0.4 : 1, fontFamily: 'inherit' }}>
                                    반론 제출
                                </button>
                            </div>
                        ) : (
                            <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>반론이 이미 제출되어 추가 제출이 불가합니다.</p>
                        )}
                    </div>
                </div>
            )}

            <div className="gorong-home" style={{ opacity: banInfo ? 0.2 : 1, pointerEvents: banInfo ? 'none' : 'auto' }}>

                {/* ══════════════════════════════════════════════════
                    히어로 — 주황 그라데이션 배너
                ══════════════════════════════════════════════════ */}
                <section className="fade-up-1" style={{
                    background: 'linear-gradient(160deg, #92400e 0%, #ea580c 40%, #fb923c 100%)',
                    padding: '72px 0 80px',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {/* 배경 장식 */}
                    <div style={{ position: 'absolute', top: -80, right: -80, width: 400, height: 400,
                        borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', bottom: -60, left: -60, width: 300, height: 300,
                        borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

                    <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px', textAlign: 'center', position: 'relative' }}>
                        {/* 서브 태그 */}
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: 'rgba(255,255,255,0.12)', borderRadius: 24, padding: '6px 16px', marginBottom: 24 }}>
                            <span style={{ fontSize: 14 }}>🐾</span>
                            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 600, letterSpacing: '0.02em' }}>
                                대구 · 경북 로컬 문화 가이드
                            </span>
                        </div>

                        {/* 메인 헤딩 */}
                        <h1 style={{
                            fontFamily: '"Playfair Display", "Noto Sans KR", serif',
                            fontSize: 'clamp(32px, 5vw, 52px)',
                            fontWeight: 900,
                            color: '#fff',
                            lineHeight: 1.2,
                            margin: '0 0 16px',
                            letterSpacing: '-0.03em',
                        }}>
                            대구·경북의 모든 문화,<br />
                            <span style={{ color: '#ffedd5' }}>고롱</span>에서 찾아보세요
                        </h1>

                        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 36, fontWeight: 400, lineHeight: 1.6 }}>
                            {auth.user
                                ? `어서오세요, ${auth.user.nickname || 'Go냥이'}님! 오늘도 좋은 하루 되세요 👋`
                                : '행사, 체험, 맛집까지 지역 문화의 모든 것'}
                        </p>

                        {/* 검색창 */}
                        <div ref={searchWrapRef} style={{ maxWidth: 600, margin: '0 auto' }}>
                            <div style={{
                                display: 'flex',
                                background: '#fff',
                                borderRadius: 50,
                                overflow: 'hidden',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                                border: searchFocused ? '2px solid #fb923c' : '2px solid transparent',
                                transition: 'border-color 0.2s',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 22, color: '#aaa' }}>
                                    <Search size={18} />
                                </div>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchInput}
                                    onChange={e => {
                                        setSearchInput(e.target.value)
                                        setSearchPopupOpen(e.target.value.trim().length > 0)
                                        if (e.target.value.trim().length > 0) updatePopupRect()
                                    }}
                                    onKeyDown={handleKeyDown}
                                    onFocus={() => {
                                        setSearchFocused(true)
                                        if (searchInput.trim().length > 0) {
                                            setSearchPopupOpen(true)
                                            updatePopupRect()
                                        }
                                    }}
                                    onBlur={() => setSearchFocused(false)}
                                    placeholder="행사명, 지역 검색..."
                                    className="hero-search-input"
                                    style={{ flex: 1, border: 'none', outline: 'none', padding: '18px 12px',
                                        fontSize: 15, color: '#1a1a1a', background: 'transparent', fontFamily: 'inherit' }}
                                />
                                {searchInput && (
                                    <button onClick={() => { setSearchInput(''); setSearchPopupOpen(false) }}
                                            style={{ display: 'flex', alignItems: 'center', paddingRight: 12, color: '#ccc',
                                                background: 'none', border: 'none', cursor: 'pointer' }}>
                                        <X size={15} />
                                    </button>
                                )}
                                <button onClick={handleSearch} style={{
                                    background: '#fb923c', color: '#fff', border: 'none', borderRadius: '0 50px 50px 0',
                                    padding: '0 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                                    transition: 'background 0.18s', fontFamily: 'inherit',
                                }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#ea580c')}
                                        onMouseLeave={e => (e.currentTarget.style.background = '#fb923c')}
                                >
                                    검색
                                </button>
                            </div>
                        </div>

                        {/* 검색 결과 */}
                        {searchQuery && (
                            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.12)',
                                    borderRadius: 20, padding: '5px 14px', fontWeight: 600 }}>
                                    🔍 "{searchQuery}" — {displayEvents.length}개 결과
                                </span>
                                <button onClick={handleClearSearch} style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)',
                                    background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                                    초기화
                                </button>
                            </div>
                        )}

                        {/* 날씨/시간 뱃지 */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 24 }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                                background: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: '6px 14px' }}>
                                <span style={{ fontSize: 15 }}>{weatherIcon}</span>
                                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{weatherText}</span>
                            </div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                                background: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: '6px 14px' }}>
                                <span style={{ fontSize: 13 }}>{timeState === 'NIGHT' ? '🌙' : '🌤'}</span>
                                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                                    {timeState === 'NIGHT' ? '야간 추천 활성화' : '주간 추천 활성화'}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── 카테고리 탭 (스티키) ─────────────────────────── */}
                <div className="fade-up-2" style={{ background: '#fff', borderBottom: '1px solid #eee', position: 'sticky', top: 0, zIndex: 40 }}>
                    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
                        <div className="cat-scroll" style={{ display: 'flex', gap: 8, padding: '12px 0', overflowX: 'auto' }}>
                            {CATEGORY_TABS.map(tab => {
                                const Icon = tab.icon
                                return (
                                    <button key={tab.id} onClick={() => setActiveCategory(tab.id)}
                                            className={`cat-tab ${activeCategory === tab.id ? 'active' : ''}`}>
                                        {Icon && <Icon size={13} />}
                                        {tab.label}
                                    </button>
                                )
                            })}
                            <div style={{ marginLeft: 'auto', paddingLeft: 16 }}>
                                <span style={{ fontSize: 13, color: '#aaa', whiteSpace: 'nowrap', lineHeight: '36px' }}>
                                    총 <strong style={{ color: '#1a1a1a' }}>{displayEvents.length}</strong>개
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── 본문 ─────────────────────────────────────────── */}
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px 80px' }}>

                    {/* ══════════════════════════════════════════════
                        TOP10 (좌) + 지도 (우) — 2단 레이아웃
                    ══════════════════════════════════════════════ */}
                    <div className="fade-up-2" style={{
                        display: 'grid',
                        gridTemplateColumns: topEvents.length > 0 ? '1fr 420px' : '1fr',
                        gap: 32,
                        marginBottom: 56,
                        alignItems: 'start',
                    }}>

                        {/* ── 인기 TOP 10 리스트 ────────────────── */}
                        {topEvents.length > 0 && (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                                    <SectionHeader
                                        icon={TrendingUp}
                                        title={<>지금 가장 인기 있는 행사 <span style={{ color: '#fb923c' }}>TOP 10</span></>}
                                        subtitle="참여 신청이 가장 많은 행사를 모아봤어요"
                                    />
                                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, paddingTop: 4 }}>
                                        <CarouselBtn dir="prev" disabled={!topCarousel.canPrev} onClick={topCarousel.prev} />
                                        <CarouselBtn dir="next" disabled={!topCarousel.canNext} onClick={topCarousel.next} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {topCarousel.visible.map((ev, i) => (
                                        <TopEventCard
                                            key={`top-${ev.id}`}
                                            event={ev}
                                            rank={topCarousel.page * 5 + i + 1}
                                            onClick={() => handleNav(ev.id)}
                                        />
                                    ))}
                                </div>

                                {/* 도트 인디케이터 */}
                                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
                                    {Array.from({ length: topCarousel.totalPages }).map((_, i) => (
                                        <div key={i} style={{ width: i === topCarousel.page ? 20 : 6, height: 6,
                                            borderRadius: 3, background: i === topCarousel.page ? '#fb923c' : '#e0e0e0',
                                            transition: 'all 0.3s' }} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── 지도 ──────────────────────────────── */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                                <SectionHeader
                                    icon={MapPin}
                                    title={searchQuery ? `"${searchQuery}" 위치` : '대구/경북 주변 행사'}
                                    subtitle="마커를 클릭하면 상세 정보로 이동합니다"
                                />
                                <button onClick={() => setMapExpanded(v => !v)} style={{
                                    fontSize: 12, fontWeight: 700, color: '#666', background: '#fff',
                                    border: '1.5px solid #e0e0e0', borderRadius: 20, padding: '6px 14px',
                                    cursor: 'pointer', transition: 'all 0.18s', whiteSpace: 'nowrap', fontFamily: 'inherit',
                                    flexShrink: 0, marginTop: 4,
                                }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#fb923c'; (e.currentTarget as HTMLButtonElement).style.color = '#fb923c' }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e0e0e0'; (e.currentTarget as HTMLButtonElement).style.color = '#666' }}
                                >
                                    {mapExpanded ? '줄이기' : '크게보기'}
                                </button>
                            </div>

                            <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden',
                                height: mapExpanded ? 520 : (topEvents.length > 0 ? 460 : 400),
                                transition: 'height 0.5s ease',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)', border: '1px solid #e8e8e8' }}>
                                <MapView data={displayEvents} onDetailClick={handleNav} userLocation={mapCenter} />
                                <button onClick={handleRecenter} title="내 위치로 이동"
                                        style={{ position: 'absolute', bottom: 14, right: 14, zIndex: 20, width: 40, height: 40,
                                            borderRadius: '50%', background: 'rgba(255,255,255,0.96)', border: 'none',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: '0 2px 10px rgba(0,0,0,0.15)', cursor: 'pointer', transition: 'all 0.18s' }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff7ed' }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.96)' }}
                                >
                                    <Target size={18} color="#fb923c" />
                                </button>
                                {isLoading && (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 14, fontWeight: 700, color: '#fb923c' }}>
                                        데이터 로딩 중...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ══════════════════════════════════════════════
                        맞춤 추천 — 6열 정사각 그리드
                    ══════════════════════════════════════════════ */}
                    {recommendedEvents.length > 0 && (
                        <section className="fade-up-3" style={{ marginBottom: 56 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                                <SectionHeader
                                    icon={Sparkles}
                                    title={<>{auth.user?.nickname || 'Go냥이'}님을 위한 맞춤 추천</>}
                                    subtitle={`${weatherIcon} ${weatherText} · ${timeState === 'NIGHT' ? '🌙 야간' : '🌤 주간'} 기반으로 선별했어요`}
                                />
                                <div style={{ display: 'flex', gap: 6, flexShrink: 0, paddingTop: 4 }}>
                                    <CarouselBtn dir="prev" disabled={!recCarousel.canPrev} onClick={recCarousel.prev} />
                                    <CarouselBtn dir="next" disabled={!recCarousel.canNext} onClick={recCarousel.next} />
                                </div>
                            </div>

                            <div className="rec-grid">
                                {recCarousel.visible.map(ev => (
                                    <RecommendCard key={`rec-${ev.id}`} event={ev} onClick={() => handleNav(ev.id)} />
                                ))}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
                                {Array.from({ length: recCarousel.totalPages }).map((_, i) => (
                                    <div key={i} style={{ width: i === recCarousel.page ? 20 : 6, height: 6,
                                        borderRadius: 3, background: i === recCarousel.page ? '#fb923c' : '#e0e0e0',
                                        transition: 'all 0.3s' }} />
                                ))}
                            </div>
                        </section>
                    )}

                </div>
            </div>
        </>
    )
}