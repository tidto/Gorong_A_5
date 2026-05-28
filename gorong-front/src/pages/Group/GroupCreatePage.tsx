// 경로: gorong-front/src/pages/Group/GroupCreatePage.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../contexts/AuthContext';

const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_API_KEY || '';
const TOUR_API_KEY  = import.meta.env.VITE_TOUR_API_KEY  || '';
const API_BASE_URL  = import.meta.env.VITE_API_BASE_URL  || 'http://localhost:8080/api';

// ─── 타입 ─────────────────────────────────────────────────────
interface TourEvent {
    contentid: string;
    title: string;
    eventstartdate: string;
    eventenddate: string;
    addr1: string;
    firstimage: string;
    mapx?: string;
    mapy?: string;
    mapX?: string;
    mapY?: string;
}

interface DbEvent {
    id: string;
    title: string;
    addr1: string;
    mapx: string;
    mapy: string;
    image: string;
}

interface KakaoPlace {
    place_name: string;
    address_name: string;
    road_address_name: string;
    x: string;
    y: string;
}

interface MapCenter {
    lat: number;
    lng: number;
    title: string;
    address?: string;
}

declare global { interface Window { kakao: any } }

const toEventCenter = (event: { title: string; addr1?: string; mapx?: string; mapy?: string; mapX?: string; mapY?: string }): MapCenter | null => {
    const lng = Number(event.mapx ?? event.mapX);
    const lat = Number(event.mapy ?? event.mapY);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return {
        lat,
        lng,
        title: event.title,
        address: event.addr1,
    };
};

// ═══════════════════════════════════════════════════════════════
const GroupCreatePage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    // ─── 폼 데이터 ──────────────────────────────────────────────
    const [formData, setFormData] = useState({
        title: '', event: '', location: '', content: '',
        maxCapacity: 4, meetingDate: '', meetingTime: '', condition: '',
    });

    // ─── 해시태그 ────────────────────────────────────────────────
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');

    // ─── 행사 모달 ───────────────────────────────────────────────
    const [showEventModal, setShowEventModal] = useState(false);
    const [eventTab, setEventTab] = useState<'db' | 'tour'>('db');
    const [dbEvents, setDbEvents] = useState<DbEvent[]>([]);
    const [dbLoading, setDbLoading] = useState(false);
    const [eventSearch, setEventSearch] = useState('');
    // TourAPI
    const [eventKeyword, setEventKeyword] = useState('');
    const [tourEvents, setTourEvents] = useState<TourEvent[]>([]);
    const [tourLoading, setTourLoading] = useState(false);
    const [tourError, setTourError] = useState('');

    // ─── 카카오 지도 ─────────────────────────────────────────────
    const [showMapModal, setShowMapModal] = useState(false);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [placeKeyword, setPlaceKeyword] = useState('');
    const [placeResults, setPlaceResults] = useState<KakaoPlace[]>([]);
    const [selectedPlace, setSelectedPlace] = useState<KakaoPlace | null>(null);
    const [userBaseAddress, setUserBaseAddress] = useState('');   // 회원가입 주소
    const [selectedEventCenter, setSelectedEventCenter] = useState<MapCenter | null>(null);
    const mapRef = useRef<HTMLDivElement>(null);
    const kakaoMapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);

    // ─── 유저 거주 주소 로드 ──────────────────────────────────────
    useEffect(() => {
        axiosInstance.get('/v1/users/me')
            .then(res => {
                const addr = res.data?.baseAddress || '';
                setUserBaseAddress(addr);
            })
            .catch(() => {});
    }, []);

    // ─── DB 행사 로드 ─────────────────────────────────────────────
    useEffect(() => {
        if (!showEventModal) return;
        setDbLoading(true);
        fetch(`${API_BASE_URL}/public/map`)
            .then(r => r.json())
            .then(data => {
                const mapped = (Array.isArray(data) ? data : []).map((item: any) => ({
                    id: item.contentid?.toString() || item.id?.toString() || '',
                    title: item.title || '',
                    addr1: item.addr1 || item.address || '',
                    mapx: item.mapx || item.mapX || '',
                    mapy: item.mapy || item.mapY || '',
                    image: item.firstimage || item.firstImage || '',
                }));
                setDbEvents(mapped);
            })
            .catch(() => setDbEvents([]))
            .finally(() => setDbLoading(false));
    }, [showEventModal]);

    // ─── 카카오 SDK 로드 ──────────────────────────────────────────
    useEffect(() => {
        if (window.kakao?.maps) { setMapLoaded(true); return; }
        const script = document.createElement('script');
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&libraries=services&autoload=false`;
        script.onload = () => window.kakao.maps.load(() => setMapLoaded(true));
        document.head.appendChild(script);
    }, []);

    // ─── 지도 초기화 ─────────────────────────────────────────────
    useEffect(() => {
        if (!showMapModal || !mapLoaded || !mapRef.current) return;
        const timer = setTimeout(() => {
            if (!mapRef.current) return;

            // 기본 중심: 서울 → 유저 주소가 있으면 지오코딩으로 덮어씀
            const defaultCenter = selectedEventCenter
                ? new window.kakao.maps.LatLng(selectedEventCenter.lat, selectedEventCenter.lng)
                : new window.kakao.maps.LatLng(37.5665, 126.9780);
            const map = new window.kakao.maps.Map(mapRef.current, { center: defaultCenter, level: selectedEventCenter ? 4 : 5 });
            kakaoMapRef.current = map;

            // ✅ 회원가입 주소가 있으면 지오코딩 → 지도 중심 이동
            if (selectedEventCenter) {
                const eventPosition = new window.kakao.maps.LatLng(selectedEventCenter.lat, selectedEventCenter.lng);
                map.setCenter(eventPosition);
                map.setLevel(4);
            } else if (userBaseAddress) {
                const geocoder = new window.kakao.maps.services.Geocoder();
                geocoder.addressSearch(userBaseAddress, (result: any, status: any) => {
                    if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
                        const latlng = new window.kakao.maps.LatLng(result[0].y, result[0].x);
                        map.setCenter(latlng);
                        map.setLevel(4);
                    }
                });
            }

            // 지도 클릭 → 역지오코딩으로 주소 추출
            window.kakao.maps.event.addListener(map, 'click', (mouseEvent: any) => {
                const latlng = mouseEvent.latLng;
                placeMarker(latlng, map);
                const geocoder = new window.kakao.maps.services.Geocoder();
                geocoder.coord2Address(latlng.getLng(), latlng.getLat(), (result: any, status: any) => {
                    if (status === window.kakao.maps.services.Status.OK) {
                        const addr = result[0]?.road_address?.address_name || result[0]?.address?.address_name || '';
                        setSelectedPlace({
                            place_name: addr, address_name: addr,
                            road_address_name: result[0]?.road_address?.address_name || '',
                            x: String(latlng.getLng()), y: String(latlng.getLat()),
                        });
                    }
                });
            });
        }, 100);
        return () => clearTimeout(timer);
    }, [showMapModal, mapLoaded, userBaseAddress, selectedEventCenter]);

    const placeMarker = (position: any, map: any) => {
        if (markerRef.current) markerRef.current.setMap(null);
        const marker = new window.kakao.maps.Marker({ position });
        marker.setMap(map);
        markerRef.current = marker;
        map.panTo(position);
    };

    // ─── 카카오 장소 검색 ─────────────────────────────────────────
    const searchPlace = useCallback(() => {
        if (!placeKeyword.trim() || !mapLoaded) return;
        const ps = new window.kakao.maps.services.Places();
        const options = selectedEventCenter
            ? {
                location: new window.kakao.maps.LatLng(selectedEventCenter.lat, selectedEventCenter.lng),
                radius: 3000,
            }
            : undefined;

        ps.keywordSearch(placeKeyword, (data: any, status: any) => {
            setPlaceResults(status === window.kakao.maps.services.Status.OK ? data.slice(0, 8) : []);
        }, options);
    }, [placeKeyword, mapLoaded, selectedEventCenter]);

    const handlePlaceSelect = (place: KakaoPlace) => {
        setSelectedPlace(place);
        if (kakaoMapRef.current && mapLoaded) {
            const latlng = new window.kakao.maps.LatLng(Number(place.y), Number(place.x));
            placeMarker(latlng, kakaoMapRef.current);
        }
        setPlaceResults([]);
        setPlaceKeyword(place.place_name);
    };

    const confirmPlace = () => {
        if (!selectedPlace) return;
        setFormData(prev => ({
            ...prev,
            location: selectedPlace.road_address_name || selectedPlace.address_name || selectedPlace.place_name,
        }));
        setShowMapModal(false);
        setPlaceResults([]);
        setPlaceKeyword('');
    };

    // ─── TourAPI 검색 ─────────────────────────────────────────────
    const searchTourEvents = async () => {
        if (!eventKeyword.trim()) return;
        setTourLoading(true); setTourError(''); setTourEvents([]);
        try {
            const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const url = `https://apis.data.go.kr/B551011/KorService1/searchFestival1`
                + `?serviceKey=${TOUR_API_KEY}`
                + `&numOfRows=20&pageNo=1&MobileOS=ETC&MobileApp=GoRong&_type=json`
                + `&eventStartDate=${today}&keyword=${encodeURIComponent(eventKeyword)}`;
            const res = await fetch(url);
            const json = await res.json();
            const items = json?.response?.body?.items?.item;
            if (!items) { setTourError('검색 결과가 없어요.'); return; }
            setTourEvents(Array.isArray(items) ? items : [items]);
        } catch {
            setTourError('행사 정보를 불러오지 못했어요.');
        } finally {
            setTourLoading(false);
        }
    };

    // ─── 행사 선택 ────────────────────────────────────────────────
    const handleDbEventSelect = (ev: DbEvent) => {
        setFormData(prev => ({ ...prev, event: ev.title }));
        setSelectedEventCenter(toEventCenter(ev));
        setPlaceResults([]);
        setSelectedPlace(null);
        setPlaceKeyword(ev.addr1 || ev.title);
        setShowEventModal(false);
        setEventSearch('');
    };

    const handleTourEventSelect = (ev: TourEvent) => {
        setFormData(prev => ({ ...prev, event: ev.title }));
        setSelectedEventCenter(toEventCenter(ev));
        setPlaceResults([]);
        setSelectedPlace(null);
        setPlaceKeyword(ev.addr1 || ev.title);
        setShowEventModal(false);
        setTourEvents([]); setEventKeyword('');
    };

    // ─── 해시태그 ────────────────────────────────────────────────
    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if ((e.key === 'Enter' || e.key === ' ') && tagInput.trim()) {
            e.preventDefault();
            const raw = tagInput.trim().replace(/^#/, '');
            if (raw && !tags.includes(raw)) {
                const next = [...tags, raw];
                setTags(next);
                setFormData(prev => ({ ...prev, condition: next.map(t => `#${t}`).join(' ') }));
            }
            setTagInput('');
        } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
            const next = tags.slice(0, -1);
            setTags(next);
            setFormData(prev => ({ ...prev, condition: next.map(t => `#${t}`).join(' ') }));
        }
    };

    const removeTag = (tag: string) => {
        const next = tags.filter(t => t !== tag);
        setTags(next);
        setFormData(prev => ({ ...prev, condition: next.map(t => `#${t}`).join(' ') }));
    };

    // ─── 폼 ──────────────────────────────────────────────────────
    const handleChange = (e: any) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        try {
            await axiosInstance.post('/groups', formData);
            alert('모집글이 성공적으로 등록되었습니다! 🐈');
            navigate('/group');
        } catch (err) {
            console.error(err);
            alert('등록 실패! 백엔드 서버 상태를 확인해주세요.');
        }
    };

    const fmtDate = (d: string) => d ? `${d.slice(0,4)}.${d.slice(4,6)}.${d.slice(6,8)}` : '';

    // DB 행사 필터링 (검색어)
    const filteredDbEvents = dbEvents.filter(ev =>
        !eventSearch || ev.title.toLowerCase().includes(eventSearch.toLowerCase()) || ev.addr1.toLowerCase().includes(eventSearch.toLowerCase())
    );

    // ═══════════════════════════════════════════════════════════════
    return (
        <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Pretendard, sans-serif', padding: '40px 20px 80px' }}>
            <div style={{ maxWidth: '860px', margin: '0 auto', backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

                {/* 헤더 */}
                <div style={{ background: 'linear-gradient(135deg, #ff8a3d 0%, #ff6b1a 100%)', padding: '28px 36px', color: 'white' }}>
                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>👥 모집글 작성</h2>
                    <p style={{ margin: '6px 0 0', fontSize: '13px', opacity: 0.85 }}>함께할 동행자를 모집해보세요</p>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '40px 36px' }}>

                    {/* 제목 */}
                    <Field label="제목">
                        <input name="title" placeholder="모집글 제목을 입력해주세요" onChange={handleChange} required style={inputStyle} />
                    </Field>

                    {/* 참여할 행사 */}
                    <Field label="참여할 행사" hint="고롱 DB 행사 또는 TourAPI에서 검색해 선택하세요">
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input readOnly placeholder="행사를 검색해서 선택해주세요" value={formData.event}
                                   style={{ ...inputStyle, flex: 1, cursor: 'pointer', backgroundColor: '#fafafa' }}
                                   onClick={() => setShowEventModal(true)} />
                            <button type="button" onClick={() => setShowEventModal(true)} style={orangeBtn}>🔍 행사 선택</button>
                        </div>
                    </Field>

                    {/* 모임 장소 */}
                    <Field
                        label="모임 장소 (상세)"
                        hint={
                            selectedEventCenter
                                ? `선택한 행사 주변: ${selectedEventCenter.address || selectedEventCenter.title}`
                                : userBaseAddress
                                    ? `기본 위치: ${userBaseAddress}`
                                    : '지도에서 클릭하거나 장소를 검색해 핀을 꽂아보세요'
                        }
                    >
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input readOnly placeholder="지도에서 장소를 선택해주세요" value={formData.location}
                                   style={{ ...inputStyle, flex: 1, cursor: 'pointer', backgroundColor: '#fafafa' }}
                                   onClick={() => setShowMapModal(true)} />
                            <button type="button" onClick={() => setShowMapModal(true)} style={orangeBtn}>📍 지도 열기</button>
                        </div>
                    </Field>

                    {/* 설명 */}
                    <Field label="설명">
            <textarea name="content" placeholder="모집에 대한 자세한 설명을 입력하세요" onChange={handleChange} required
                      style={{ ...inputStyle, height: '120px', resize: 'none' } as any} />
                    </Field>

                    {/* 인원 / 날짜 / 시간 */}
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '28px' }}>
                        <Field label="최대 인원" style={{ flex: 1, marginBottom: 0 }}>
                            <input type="number" name="maxCapacity" value={formData.maxCapacity} min="2" max="20" onChange={handleChange} style={inputStyle} />
                        </Field>
                        <Field label="모임 날짜" style={{ flex: 1, marginBottom: 0 }}>
                            <input type="date" name="meetingDate" onChange={handleChange} style={inputStyle} />
                        </Field>
                        <Field label="집합 시간" style={{ flex: 1, marginBottom: 0 }}>
                            <input type="time" name="meetingTime" onChange={handleChange} style={inputStyle} />
                        </Field>
                    </div>

                    {/* 참여 조건 - 해시태그 */}
                    <Field label="참여 조건" hint="입력 후 Space 또는 Enter를 누르면 태그가 추가돼요">
                        <div
                            style={{ minHeight: '54px', padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', backgroundColor: 'white', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', cursor: 'text' }}
                            onClick={() => document.getElementById('tag-input')?.focus()}
                        >
                            {tags.map(tag => (
                                <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', backgroundColor: '#fff4ed', color: '#ff8a3d', border: '1.5px solid #fbd5b5', borderRadius: '20px', padding: '4px 12px', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                  #{tag}
                                    <span onClick={e => { e.stopPropagation(); removeTag(tag); }} style={{ cursor: 'pointer', fontSize: '14px', lineHeight: 1, color: '#ff8a3d', marginLeft: '2px' }}>×</span>
                </span>
                            ))}
                            <input id="tag-input" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown}
                                   placeholder={tags.length === 0 ? '#비흡연자  #20대  #여성만  (Space / Enter로 추가)' : ''}
                                   style={{ border: 'none', outline: 'none', fontSize: '14px', minWidth: '180px', flex: 1, padding: '4px 4px', color: '#1e293b', backgroundColor: 'transparent' }} />
                        </div>
                        {tags.length > 0 && <div style={{ marginTop: '6px', fontSize: '12px', color: '#94a3b8' }}>저장값: {formData.condition}</div>}
                    </Field>

                    <button type="submit" style={{ width: '100%', padding: '18px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #ff8a3d 0%, #ff6b1a 100%)', color: 'white', fontWeight: '800', fontSize: '17px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(255,138,61,0.35)', marginTop: '8px' }}>
                        등록하기 🐈
                    </button>
                </form>
            </div>

            {/* ════════════ 모달: 행사 선택 ════════════ */}
            {showEventModal && (
                <ModalOverlay onClose={() => { setShowEventModal(false); setEventSearch(''); setTourEvents([]); }}>
                    <div style={{ width: '580px', maxWidth: '95vw', backgroundColor: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>

                        {/* 모달 헤더 */}
                        <div style={{ background: 'linear-gradient(135deg, #ff8a3d 0%, #ff6b1a 100%)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                            <div>
                                <div style={{ color: 'white', fontWeight: '800', fontSize: '17px' }}>🎟️ 행사 선택</div>
                                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginTop: '2px' }}>고롱 DB 행사 또는 TourAPI에서 검색</div>
                            </div>
                            <button onClick={() => setShowEventModal(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer' }}>닫기</button>
                        </div>

                        {/* 탭 */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                            {(['db', 'tour'] as const).map(tab => (
                                <button key={tab} onClick={() => setEventTab(tab)}
                                        style={{ flex: 1, padding: '14px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '14px', borderBottom: eventTab === tab ? '2.5px solid #ff8a3d' : '2.5px solid transparent', color: eventTab === tab ? '#ff8a3d' : '#94a3b8', backgroundColor: 'white', transition: 'all 0.15s' }}>
                                    {tab === 'db' ? '📋 고롱 행사 목록' : '🔍 TourAPI 검색'}
                                </button>
                            ))}
                        </div>

                        {/* ── DB 행사 탭 ── */}
                        {eventTab === 'db' && (
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                                <div style={{ padding: '16px 20px 8px', flexShrink: 0 }}>
                                    <input value={eventSearch} onChange={e => setEventSearch(e.target.value)}
                                           placeholder="행사명 또는 주소로 필터링"
                                           style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} autoFocus />
                                </div>
                                <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
                                    {dbLoading && <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>행사 목록 불러오는 중... ⏳</div>}
                                    {!dbLoading && filteredDbEvents.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '14px' }}>검색 결과가 없어요.</div>
                                    )}
                                    {filteredDbEvents.map(ev => (
                                        <div key={ev.id} onClick={() => handleDbEventSelect(ev)}
                                             style={{ padding: '12px', borderRadius: '12px', cursor: 'pointer', border: '1.5px solid #f1f5f9', marginBottom: '8px', display: 'flex', gap: '12px', alignItems: 'center', transition: 'all 0.15s' }}
                                             onMouseEnter={e => (e.currentTarget.style.borderColor = '#ff8a3d')}
                                             onMouseLeave={e => (e.currentTarget.style.borderColor = '#f1f5f9')}>
                                            {ev.image
                                                ? <img src={ev.image} alt={ev.title} style={{ width: '52px', height: '52px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                                                : <div style={{ width: '52px', height: '52px', borderRadius: '8px', backgroundColor: '#fff4ed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>🎪</div>
                                            }
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>📍 {ev.addr1 || '장소 정보 없음'}</div>
                                            </div>
                                            <div style={{ color: '#ff8a3d', fontSize: '18px', flexShrink: 0 }}>›</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── TourAPI 탭 ── */}
                        {eventTab === 'tour' && (
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                                <div style={{ padding: '16px 20px 8px', display: 'flex', gap: '10px', flexShrink: 0 }}>
                                    <input value={eventKeyword} onChange={e => setEventKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchTourEvents()}
                                           placeholder="행사명 또는 지역 검색 (예: 서울, 재즈)"
                                           style={{ ...inputStyle, flex: 1 }} autoFocus />
                                    <button type="button" onClick={searchTourEvents} style={orangeBtn}>검색</button>
                                </div>
                                <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
                                    {tourLoading && <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>불러오는 중... ⏳</div>}
                                    {tourError && <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444', fontSize: '14px' }}>{tourError}</div>}
                                    {!tourLoading && !tourError && tourEvents.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '14px' }}>키워드를 입력하고 검색해보세요 🔍</div>
                                    )}
                                    {tourEvents.map(ev => (
                                        <div key={ev.contentid} onClick={() => handleTourEventSelect(ev)}
                                             style={{ padding: '12px', borderRadius: '12px', cursor: 'pointer', border: '1.5px solid #f1f5f9', marginBottom: '8px', display: 'flex', gap: '12px', alignItems: 'flex-start', transition: 'all 0.15s' }}
                                             onMouseEnter={e => (e.currentTarget.style.borderColor = '#ff8a3d')}
                                             onMouseLeave={e => (e.currentTarget.style.borderColor = '#f1f5f9')}>
                                            {ev.firstimage
                                                ? <img src={ev.firstimage} alt={ev.title} style={{ width: '52px', height: '52px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                                                : <div style={{ width: '52px', height: '52px', borderRadius: '8px', backgroundColor: '#fff4ed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>🎪</div>
                                            }
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b', marginBottom: '3px' }}>{ev.title}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>📍 {ev.addr1 || '장소 정보 없음'}</div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>📅 {fmtDate(ev.eventstartdate)} ~ {fmtDate(ev.eventenddate)}</div>
                                            </div>
                                            <div style={{ color: '#ff8a3d', fontSize: '18px', flexShrink: 0 }}>›</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </ModalOverlay>
            )}

            {/* ════════════ 모달: 카카오 지도 ════════════ */}
            {showMapModal && (
                <ModalOverlay onClose={() => { setShowMapModal(false); setPlaceResults([]); }}>
                    <div style={{ width: '680px', maxWidth: '97vw', backgroundColor: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>

                        <div style={{ background: 'linear-gradient(135deg, #ff8a3d 0%, #ff6b1a 100%)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ color: 'white', fontWeight: '800', fontSize: '17px' }}>📍 모임 장소 선택</div>
                                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginTop: '3px' }}>
                                    {selectedEventCenter
                                        ? `선택한 행사 주변: ${selectedEventCenter.address || selectedEventCenter.title}`
                                        : userBaseAddress
                                            ? `기본 위치: ${userBaseAddress}`
                                            : '장소를 검색하거나 지도를 클릭해 핀을 꽂으세요'}
                                </div>
                            </div>
                            <button onClick={() => { setShowMapModal(false); setPlaceResults([]); }}
                                    style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer' }}>
                                닫기
                            </button>
                        </div>

                        <div style={{ padding: '16px 20px 12px', display: 'flex', gap: '10px' }}>
                            <input value={placeKeyword} onChange={e => setPlaceKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchPlace()}
                                   placeholder="장소명 검색 (예: 올림픽공원, 홍대입구역)"
                                   style={{ ...inputStyle, flex: 1 }} autoFocus />
                            <button type="button" onClick={searchPlace} style={orangeBtn}>검색</button>
                        </div>

                        {placeResults.length > 0 && (
                            <div style={{ maxHeight: '180px', overflowY: 'auto', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                                {placeResults.map((place, i) => (
                                    <div key={i} onClick={() => handlePlaceSelect(place)}
                                         style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                         onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#fff4ed')}
                                         onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'white')}>
                                        <div>
                                            <div style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>{place.place_name}</div>
                                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{place.road_address_name || place.address_name}</div>
                                        </div>
                                        <div style={{ color: '#ff8a3d', fontSize: '18px' }}>›</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!mapLoaded && <div style={{ height: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>지도를 불러오는 중...</div>}
                        <div ref={mapRef} style={{ width: '100%', height: '360px', display: mapLoaded ? 'block' : 'none' }} />

                        <div style={{ padding: '16px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{ flex: 1, fontSize: '14px', color: selectedPlace ? '#1e293b' : '#94a3b8', fontWeight: selectedPlace ? '600' : '400' }}>
                                {selectedPlace ? `📍 ${selectedPlace.place_name || selectedPlace.road_address_name}` : '지도를 클릭하거나 장소를 검색해 선택하세요'}
                            </div>
                            <button type="button" onClick={confirmPlace} disabled={!selectedPlace}
                                    style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '14px', cursor: selectedPlace ? 'pointer' : 'default', backgroundColor: selectedPlace ? '#ff8a3d' : '#e2e8f0', color: selectedPlace ? 'white' : '#94a3b8', transition: 'all 0.15s' }}>
                                이 장소로 선택
                            </button>
                        </div>
                    </div>
                </ModalOverlay>
            )}
        </div>
    );
};

// ─── 공통 스타일 ──────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 16px', borderRadius: '10px',
    border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '14px',
    color: '#1e293b', boxSizing: 'border-box', transition: 'border-color 0.15s',
};
const orangeBtn: React.CSSProperties = {
    padding: '13px 20px', borderRadius: '10px', border: 'none',
    backgroundColor: '#ff8a3d', color: 'white', fontWeight: '700',
    fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
};
const Field = ({ label, hint, children, style }: {
    label: string; hint?: string; children: React.ReactNode; style?: React.CSSProperties;
}) => (
    <div style={{ marginBottom: '28px', ...style }}>
        <label style={{ display: 'block', fontWeight: '700', fontSize: '14px', marginBottom: hint ? '4px' : '10px', color: '#1e293b' }}>{label}</label>
        {hint && <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#94a3b8' }}>{hint}</p>}
        {children}
    </div>
);
const ModalOverlay = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
        <div onClick={e => e.stopPropagation()}>{children}</div>
    </div>
);

export default GroupCreatePage;
