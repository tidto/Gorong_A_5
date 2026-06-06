import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import MapView from '../components/MapView'
import LazyImage from '../components/common/LazyImage'
import Card from '../components/Card'
import { useAuth } from '../contexts/AuthContext'
import axiosInstance from '../api/axiosInstance'
import { Search, Trophy, CloudSun, Target, ChevronLeft, ChevronRight } from 'lucide-react'

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

function useCarousel(items: any[], perPage: number) {
    const [page, setPage] = useState(0)
    const totalPages = Math.max(1, Math.ceil(items.length / perPage))
    const prev = () => setPage(p => Math.max(0, p - 1))
    const next = () => setPage(p => Math.min(totalPages - 1, p + 1))
    const visible = items.slice(page * perPage, page * perPage + perPage)
    return { page, totalPages, prev, next, visible, canPrev: page > 0, canNext: page < totalPages - 1 }
}

function ArrowBtn({ dir, onClick, disabled }: { dir: 'left' | 'right'; onClick: () => void; disabled: boolean }) {
    const [hov, setHov] = useState(false)
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                width: 38, height: 38, borderRadius: '50%',
                border: 'none',
                background: disabled ? '#f5f5f5' : hov ? '#f97316' : '#fff',
                color: disabled ? '#ccc' : hov ? '#fff' : '#555',
                cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .2s ease',
                flexShrink: 0,
                boxShadow: disabled ? 'none' : hov
                    ? '0 4px 14px rgba(249,115,22,.35)'
                    : '0 2px 10px rgba(0,0,0,.1)',
            }}
        >
            {dir === 'left' ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}
        </button>
    )
}

function EventCard({ event, rank, onClick }: { event: any; rank?: number; onClick: () => void }) {
    const [hov, setHov] = useState(false)
    const img = event.image || '/images/default-event.png'

    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                background: '#fff',
                borderRadius: 18,
                overflow: 'hidden',
                cursor: 'pointer',
                boxShadow: hov
                    ? '0 16px 40px rgba(0,0,0,.13)'
                    : '0 2px 12px rgba(0,0,0,.06)',
                transform: hov ? 'translateY(-6px)' : 'translateY(0)',
                transition: 'box-shadow .28s ease, transform .28s ease',
                position: 'relative',
            }}
        >
            <div style={{ position: 'relative', height: 170, overflow: 'hidden', background: '#f0f0f0' }}>
                <LazyImage
                    src={img}
                    alt={event.title}
                    wrapperClassName="w-full h-full"
                    style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                        transform: hov ? 'scale(1.07)' : 'scale(1)',
                        transition: 'transform .38s ease',
                        display: 'block',
                    }}
                    onError={e => { (e.target as HTMLImageElement).src = '/images/default-event.png' }}
                />
                {rank !== undefined && (
                    <div style={{
                        position: 'absolute', top: 12, left: 12,
                        width: 32, height: 32, borderRadius: 9,
                        background: 'rgba(0,0,0,.55)',
                        backdropFilter: 'blur(6px)',
                        color: '#fff', fontWeight: 800, fontSize: 14,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        {rank}
                    </div>
                )}
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,.22) 0%, transparent 55%)',
                    opacity: hov ? 1 : 0,
                    transition: 'opacity .28s ease',
                }} />
            </div>
            <div style={{ padding: '14px 16px 18px' }}>
                <p style={{
                    margin: 0, fontSize: 14, fontWeight: 700,
                    color: '#111', lineHeight: 1.45,
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                    minHeight: 41,
                }}>
                    {event.title}
                </p>
                <p style={{
                    margin: '7px 0 0', fontSize: 12, color: '#999',
                    display: 'flex', alignItems: 'center', gap: 4,
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                }}>
                    <span style={{ flexShrink: 0 }}>📍</span>
                    {event.addr1 || event.address || '위치 정보 없음'}
                </p>
            </div>
        </div>
    )
}

function SectionHeader({
                           icon, title, badge, subtitle,
                           canPrev, canNext, onPrev, onNext, page, totalPages,
                       }: {
    icon: React.ReactNode; title: string; badge?: string; subtitle?: string;
    canPrev: boolean; canNext: boolean; onPrev: () => void; onNext: () => void;
    page: number; totalPages: number;
}) {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 22 }}>
            <div>
                <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: '#111', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {icon}{title}
                    {badge && <span style={{ color: '#f97316' }}>{badge}</span>}
                </h2>
                {subtitle && (
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: '#aaa', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <CloudSun size={13} color="#f97316" />{subtitle}
                    </p>
                )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 2, flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: '#bbb', fontWeight: 500 }}>{page + 1} / {totalPages}</span>
                <ArrowBtn dir="left"  onClick={onPrev} disabled={!canPrev} />
                <ArrowBtn dir="right" onClick={onNext} disabled={!canNext} />
            </div>
        </div>
    )
}

export default function Home() {
    const navigate = useNavigate()
    const auth     = useAuth()

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
                { timeout: 5000 }
            )
        } else { setUserLocation(DEFAULT_LOCATION); setMapCenter(DEFAULT_LOCATION) }
    }, [auth.user])

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

    useEffect(() => {
        const fetchAll = async () => {
            setIsLoading(true)
            const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'
            try {
                const r = await fetch(`${base}/public/map`)
                if (!r.ok) throw new Error()
                const data = await r.json()
                const mapped = Array.isArray(data) ? data.map(item => ({
                    ...item,
                    id:    item.contentid?.toString() || item.id?.toString(),
                    mapx:  item.mapx  || item.mapX,
                    mapy:  item.mapy  || item.mapY,
                    addr1: item.addr1 || item.address,
                    image: item.firstimage || item.firstImage || '/images/default-event.png',
                })) : []
                setEvents(mapped)
                if (mapped.length) setTopEvents(mapped.slice(0, 10))
            } catch { setEvents([]); setTopEvents([]) }
            finally  { setIsLoading(false) }
        }
        fetchAll()
    }, [])

    useEffect(() => {
        if (!auth.loggedIn) { setBanInfo(null); return }
        axiosInstance.get('/v1/users/me/ban')
            .then(r => setBanInfo(r.data?.banned ? r.data.ban : null))
            .catch(() => setBanInfo(null))
    }, [auth.loggedIn])

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

    const weatherText = useMemo(() => {
        const m: Record<string, string> = {
            Clear:  '☀️ 맑고 선선한 오늘, 야외 축제나 야외 활동',
            Rain:   '🌧️ 비가 내리는 오늘, 포근한 실내 전시회나 문화 공간',
            Clouds: '☁️ 흐린 하늘인 오늘, 부담 없이 걷기 좋은 행사',
            Snow:   '❄️ 하얀 눈이 내리는 오늘, 감성 가득한 실내 문화 행사',
        }
        return `${m[weatherState] || '☀️ 오늘 날씨에 딱 맞는'} 추천 카드를 조합해 보았어요.`
    }, [weatherState])

    return (
        <>
            <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .s-anim { animation: fadeUp .4s ease both; }
        .s-anim:nth-child(2) { animation-delay: .07s; }
        .s-anim:nth-child(3) { animation-delay: .14s; }
        .s-anim:nth-child(4) { animation-delay: .21s; }

        .search-wrap-inner { transition: box-shadow .2s ease; }
        .search-wrap-inner.focused {
          box-shadow: 0 0 0 3px rgba(249,115,22,.18) !important;
        }

        .map-exp-btn {
          background: rgba(255,255,255,.92);
          backdrop-filter: blur(6px);
          border: none;
          border-radius: 22px;
          padding: 7px 16px;
          font-size: 12px; font-weight: 700;
          color: #444; cursor: pointer;
          box-shadow: 0 2px 10px rgba(0,0,0,.1);
          transition: background .2s, color .2s, transform .15s;
        }
        .map-exp-btn:hover { background: #fff; color: #f97316; transform: scale(1.03); }

        .recenter-btn {
          position: absolute; bottom: 16px; right: 16px; z-index: 20;
          width: 42px; height: 42px; border-radius: 50%;
          background: rgba(255,255,255,.92); backdrop-filter: blur(6px);
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 16px rgba(0,0,0,.14);
          transition: transform .2s, background .2s;
        }
        .recenter-btn:hover { transform: scale(1.1); background: #fff7ed; }

        .dot-track { display: flex; justify-content: center; gap: 5px; margin-top: 18px; }
        .dot { height: 5px; border-radius: 3px; background: #e0e0e0; transition: all .25s ease; }
        .dot.on  { width: 20px; background: #f97316; }
        .dot.off { width: 5px; }
      `}</style>

            {/* 제재 오버레이 */}
            {banInfo && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 200,
                    background: 'rgba(255,255,255,.8)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
                }}>
                    <div style={{
                        width: '100%', maxWidth: 500,
                        background: '#fff', borderRadius: 22,
                        padding: 36,
                        boxShadow: '0 24px 64px rgba(0,0,0,.16)',
                    }}>
                        <h2 style={{ margin: 0, color: '#dc2626', fontSize: 21, fontWeight: 800 }}>서비스 이용 제한 중</h2>
                        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {[`신고 누적: ${banInfo.reportCount ?? 0}회`, `사유: ${banInfo.banReason}`, `반론 상태: ${banInfo.appealStatus}`].map(t => (
                                <p key={t} style={{ margin: 0, fontSize: 14, color: '#555' }}>{t}</p>
                            ))}
                            {banInfo.appealStatus === 'RESOLVED' && banInfo.banStatus === 'ACTIVE' && banInfo.appealReviewNote && (
                                <p style={{ margin: 0, fontSize: 14, color: '#991b1b', fontWeight: 600 }}>
                                    소명 기각 사유: {banInfo.appealReviewNote}
                                </p>
                            )}
                        </div>
                        {banInfo.appealStatus === 'NONE' ? (
                            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <textarea
                    value={appealText}
                    onChange={e => setAppealText(e.target.value)}
                    rows={4}
                    style={{ width: '100%', borderRadius: 12, border: 'none', background: '#f7f7f7', padding: '11px 14px', fontSize: 14, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                    placeholder="반론은 1회만 제출할 수 있습니다."
                />
                                <button
                                    onClick={handleSubmitAppeal}
                                    disabled={!appealText.trim() || isAppealSubmitting}
                                    style={{
                                        background: '#111', color: '#fff', border: 'none',
                                        borderRadius: 12, padding: '11px 20px',
                                        fontSize: 14, fontWeight: 700, cursor: 'pointer',
                                        opacity: (!appealText.trim() || isAppealSubmitting) ? .45 : 1,
                                        transition: 'opacity .2s',
                                    }}
                                >
                                    반론 제출
                                </button>
                            </div>
                        ) : (
                            <p style={{ marginTop: 14, fontSize: 13, color: '#aaa' }}>반론이 이미 제출되어 추가 제출이 불가합니다.</p>
                        )}
                    </div>
                </div>
            )}

            <div style={{
                maxWidth: 1140, margin: '0 auto',
                padding: '36px 24px 72px',
                opacity: banInfo ? .25 : 1,
                pointerEvents: banInfo ? 'none' : 'auto',
            }}>

                {/* ── 히어로 ── */}
                <section className="s-anim" style={{
                    background: '#fafafa',
                    borderRadius: 28,
                    padding: '40px 44px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 32, marginBottom: 52,
                    boxShadow: '0 2px 24px rgba(0,0,0,.06)',
                }}>
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 700, color: '#f97316', letterSpacing: '.8px', textTransform: 'uppercase' }}>
                            대구 · 경북 로컬 문화 가이드
                        </p>
                        <h1 style={{ margin: '0 0 26px', fontSize: 30, fontWeight: 900, color: '#111', lineHeight: 1.2 }}>
                            안녕, {auth.user?.nickname || 'Go냥이'}! 👋
                        </h1>

                        {/* 검색창 — 테두리 없이 그림자만 */}
                        <div
                            className={`search-wrap-inner ${searchFocused ? 'focused' : ''}`}
                            style={{
                                display: 'flex', alignItems: 'stretch',
                                background: '#fff', borderRadius: 14, overflow: 'hidden',
                                maxWidth: 460,
                                boxShadow: '0 4px 20px rgba(0,0,0,.09)',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px', color: '#bbb', flexShrink: 0 }}>
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
                                style={{
                                    flex: 1, border: 'none', outline: 'none',
                                    fontSize: 14, padding: '14px 4px', color: '#111',
                                    background: 'transparent',
                                }}
                            />
                            <button
                                onClick={handleSearch}
                                style={{
                                    background: '#f97316', color: '#fff', border: 'none',
                                    padding: '0 22px', fontSize: 13, fontWeight: 700,
                                    cursor: 'pointer', flexShrink: 0,
                                    transition: 'background .2s',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#ea580c')}
                                onMouseLeave={e => (e.currentTarget.style.background = '#f97316')}
                            >
                                검색
                            </button>
                        </div>

                        {searchQuery && (
                            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                    fontSize: 12, fontWeight: 600, color: '#c2410c',
                    background: '#fff7ed', borderRadius: 20, padding: '4px 13px',
                }}>
                  🔍 "{searchQuery}" — {displayEvents.length}개 결과
                </span>
                                <button
                                    onClick={() => { setSearchQuery(''); setSearchInput('') }}
                                    style={{ background: 'none', border: 'none', fontSize: 12, color: '#bbb', cursor: 'pointer', padding: 0 }}
                                >
                                    초기화
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* ── 지도 ── */}
                <section className="s-anim" style={{ marginBottom: 60 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                        <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: '#111', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: '#f97316' }}></span>
                            {searchQuery ? `"${searchQuery}" 검색 결과` : '대구/경북 주변 행사'}
                            <span style={{ fontSize: 13, fontWeight: 500, color: '#bbb', marginLeft: 2 }}>
                {displayEvents.length}개
              </span>
                        </h2>
                    </div>

                    <div style={{
                        position: 'relative',
                        height: mapExpanded ? 580 : 400,
                        borderRadius: 22, overflow: 'hidden',
                        boxShadow: '0 4px 28px rgba(0,0,0,.1)',
                        transition: 'height .35s ease',
                    }}>
                        <MapView data={displayEvents} onDetailClick={handleNav} userLocation={mapCenter} />

                        {/* 지도 우상단 — 토글 버튼 */}
                        <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 20 }}>
                            <button className="map-exp-btn" onClick={() => setMapExpanded(v => !v)}>
                                {mapExpanded ? '지도 줄이기' : '지도 크게 보기'}
                            </button>
                        </div>

                        <button className="recenter-btn" onClick={handleRecenter} title="내 위치로 이동">
                            <Target size={19} color="#f97316" />
                        </button>

                        {isLoading && (
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: 'rgba(255,255,255,.7)', backdropFilter: 'blur(2px)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, color: '#f97316', fontSize: 14,
                            }}>
                                데이터 로딩 중...
                            </div>
                        )}
                    </div>
                </section>

                {/* ── 인기 행사 TOP 10 ── */}
                {topEvents.length > 0 && (
                    <section className="s-anim" style={{ marginBottom: 60 }}>
                        <SectionHeader
                            //icon={<Trophy size={21} color="#f59e0b" />}
                            title="지금 가장 핫한 인기 행사"
                            badge=" TOP 10"
                            canPrev={topCarousel.canPrev} canNext={topCarousel.canNext}
                            onPrev={topCarousel.prev} onNext={topCarousel.next}
                            page={topCarousel.page} totalPages={topCarousel.totalPages}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }}>
                            {topCarousel.visible.map((ev, i) => (
                                <EventCard
                                    key={`top-${ev.id}`}
                                    event={ev}
                                    rank={topCarousel.page * 3 + i + 1}
                                    onClick={() => handleNav(ev.id)}
                                />
                            ))}
                        </div>
                        <div className="dot-track">
                            {Array.from({ length: topCarousel.totalPages }).map((_, i) => (
                                <span key={i} className={`dot ${i === topCarousel.page ? 'on' : 'off'}`} />
                            ))}
                        </div>
                    </section>
                )}

                {/* ── 맞춤 추천 ── */}
                {recommendedEvents.length > 0 && (
                    <section className="s-anim">
                        <SectionHeader
                            icon={<span style={{ fontSize: 20 }}></span>}
                            title={`${auth.user?.nickname || 'Go냥이'}님을 위한 맞춤 추천`}
                            subtitle={weatherText}
                            canPrev={recCarousel.canPrev} canNext={recCarousel.canNext}
                            onPrev={recCarousel.prev} onNext={recCarousel.next}
                            page={recCarousel.page} totalPages={recCarousel.totalPages}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }}>
                            {recCarousel.visible.map(ev => (
                                <EventCard key={`rec-${ev.id}`} event={ev} onClick={() => handleNav(ev.id)} />
                            ))}
                        </div>
                        <div className="dot-track">
                            {Array.from({ length: recCarousel.totalPages }).map((_, i) => (
                                <span key={i} className={`dot ${i === recCarousel.page ? 'on' : 'off'}`} />
                            ))}
                        </div>
                    </section>
                )}

            </div>
        </>
    )
}