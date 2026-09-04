// 경로: src/pages/Group/GroupEditPage.tsx
// CreatePage의 모든 기능(행사선택·카카오지도·해시태그) + 기존값 로드 + 웹 레이아웃
// UI: GroupCreatePage(gcp-* 클래스) 디자인 시스템에 맞춰 통일

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';

const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_API_KEY || '';
const TOUR_API_KEY  = import.meta.env.VITE_TOUR_API_KEY  || '';
const API_BASE_URL  = import.meta.env.VITE_API_BASE_URL  || 'http://localhost:8080/api';

// ─── 커스텀 날짜 피커 ─────────────────────────────────────────────
const DAYS_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토'];

interface DatePickerProps { value: string; onChange: (val: string) => void; hasError?: boolean; }

const CustomDatePicker = ({ value, onChange, hasError }: DatePickerProps) => {
    const today = new Date();
    const [open, setOpen] = useState(false);
    const [viewYear, setViewYear] = useState(() => value ? parseInt(value.slice(0,4)) : today.getFullYear());
    const [viewMonth, setViewMonth] = useState(() => value ? parseInt(value.slice(5,7)) - 1 : today.getMonth());
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const selectedDay = value && value.slice(0,7) === `${viewYear}-${String(viewMonth+1).padStart(2,'0')}` ? parseInt(value.slice(8,10)) : null;

    const selectDate = (day: number) => {
        const mm = String(viewMonth + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        onChange(`${viewYear}-${mm}-${dd}`);
        setOpen(false);
    };
    const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); };
    const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); };

    const displayValue = value ? `${value.slice(0,4)}년 ${parseInt(value.slice(5,7))}월 ${parseInt(value.slice(8,10))}일` : '';
    const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button type="button" onClick={() => setOpen(o => !o)}
                    className={`gcp-input gcp-picker-trigger${hasError ? ' error' : ''}`}>
                <span className="gcp-picker-icon">📅</span>
                <span style={{ flex: 1, color: displayValue ? '#1a1816' : '#c0bcb5' }}>{displayValue || '날짜를 선택해주세요'}</span>
                <span className="gcp-picker-arrow">{open ? '▴' : '▾'}</span>
            </button>
            {open && (
                <div className="gcp-calendar-popup">
                    <div className="gcp-cal-header">
                        <button type="button" className="gcp-cal-nav" onClick={prevMonth}>‹</button>
                        <span className="gcp-cal-title">{viewYear}년 {MONTHS[viewMonth]}</span>
                        <button type="button" className="gcp-cal-nav" onClick={nextMonth}>›</button>
                    </div>
                    <div className="gcp-cal-grid">
                        {DAYS_OF_WEEK.map((d, i) => (
                            <div key={d} className="gcp-cal-dow" style={{ color: i===0?'#ef4444':i===6?'#3b82f6':'#9e9b95' }}>{d}</div>
                        ))}
                        {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
                        {Array.from({ length: daysInMonth }, (_, i) => i+1).map(day => {
                            const mm = String(viewMonth+1).padStart(2,'0');
                            const dd = String(day).padStart(2,'0');
                            const dateStr = `${viewYear}-${mm}-${dd}`;
                            const isToday = dateStr === todayStr;
                            const isSelected = day === selectedDay;
                            const dow = (firstDayOfWeek + day - 1) % 7;
                            return (
                                <button key={day} type="button" onClick={() => selectDate(day)}
                                        className={`gcp-cal-day${isSelected?' selected':''}${isToday&&!isSelected?' today':''}`}
                                        style={{ color: isSelected ? undefined : dow===0?'#ef4444':dow===6?'#3b82f6':undefined }}>
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                    <div className="gcp-cal-footer">
                        <button type="button" className="gcp-cal-today-btn"
                                onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); selectDate(today.getDate()); }}>
                            오늘
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── 커스텀 시간 피커 ─────────────────────────────────────────────
interface TimePickerProps { value: string; onChange: (val: string) => void; hasError?: boolean; }

const CustomTimePicker = ({ value, onChange, hasError }: TimePickerProps) => {
    const [open, setOpen] = useState(false);
    const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({ left: 0 });
    const ref = useRef<HTMLDivElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    const parseTime = (v: string) => {
        if (!v) return { hour: 12, minute: 0, isPm: false };
        const [h, m] = v.split(':').map(Number);
        return { hour: h===0?12:h>12?h-12:h, minute: m, isPm: h>=12 };
    };
    const { hour, minute, isPm } = parseTime(value);

    const buildValue = (h: number, m: number, pm: boolean) => {
        const h24 = h % 12 + (pm ? 12 : 0);
        return `${String(h24).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    };

    useEffect(() => {
        const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (!open || !popupRef.current) return;
        const popup = popupRef.current.getBoundingClientRect();
        if (popup.right > window.innerWidth - 8) {
            setPopupStyle({ right: 0, left: 'auto' });
        } else {
            setPopupStyle({ left: 0 });
        }
    }, [open]);

    const HOURS = [12,1,2,3,4,5,6,7,8,9,10,11];
    const MINUTES = [0,10,20,30,40,50];
    const displayValue = value ? `${isPm?'오후':'오전'} ${hour}:${String(minute).padStart(2,'0')}` : '';

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button type="button" onClick={() => setOpen(o => !o)}
                    className={`gcp-input gcp-picker-trigger${hasError ? ' error' : ''}`}>
                <span className="gcp-picker-icon">🕐</span>
                <span style={{ flex: 1, color: displayValue ? '#1a1816' : '#c0bcb5' }}>{displayValue || '시간을 선택해주세요'}</span>
                <span className="gcp-picker-arrow">{open ? '▴' : '▾'}</span>
            </button>
            {open && (
                <div ref={popupRef} className="gcp-timepicker-popup" style={popupStyle}>
                    <div className="gcp-time-ampm-row">
                        <button type="button" className={`gcp-ampm-btn${!isPm?' active':''}`} onClick={() => onChange(buildValue(hour, minute, false))}>오전</button>
                        <button type="button" className={`gcp-ampm-btn${isPm?' active':''}`} onClick={() => onChange(buildValue(hour, minute, true))}>오후</button>
                    </div>
                    <div className="gcp-time-section-label">시</div>
                    <div className="gcp-time-grid">
                        {HOURS.map(h => (
                            <button key={h} type="button"
                                    className={`gcp-time-cell${value&&hour===h?' selected':''}`}
                                    onClick={() => onChange(buildValue(h, minute, isPm))}>
                                {h}
                            </button>
                        ))}
                    </div>
                    <div className="gcp-time-section-label" style={{ marginTop: '10px' }}>분</div>
                    <div className="gcp-time-grid" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
                        {MINUTES.map(m => (
                            <button key={m} type="button"
                                    className={`gcp-time-cell${value&&minute===m?' selected':''}`}
                                    onClick={() => { onChange(buildValue(hour, m, isPm)); setOpen(false); }}>
                                {String(m).padStart(2,'0')}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── 타입 ──────────────────────────────────────────────────────
interface TourEvent {
    contentid: string; title: string;
    eventstartdate: string; eventenddate: string;
    addr1: string; firstimage: string;
    mapx?: string; mapy?: string; mapX?: string; mapY?: string;
}
interface DbEvent {
    id: string; title: string; addr1: string;
    mapx: string; mapy: string; image: string;
}
interface KakaoPlace {
    place_name: string; address_name: string;
    road_address_name: string; x: string; y: string;
}
interface MapCenter { lat: number; lng: number; title: string; address?: string; }

declare global { interface Window { kakao: any } }

const toEventCenter = (event: { title: string; addr1?: string; mapx?: string; mapy?: string; mapX?: string; mapY?: string }): MapCenter | null => {
    const lng = Number(event.mapx ?? event.mapX);
    const lat = Number(event.mapy ?? event.mapY);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, title: event.title, address: event.addr1 };
};

// ═══════════════════════════════════════════════════════════════
const GroupEditPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // ─── 폼 상태 ───────────────────────────────────────────────
    const [formData, setFormData] = useState({
        title: '', event: '', eventContentId: '', location: '',
        content: '', maxCapacity: 4, meetingDate: '', meetingTime: '', condition: '',
    });
    const [tags, setTags]           = useState<string[]>([]);
    const [tagInput, setTagInput]   = useState('');
    const [dateError, setDateError] = useState(false);
    const [timeError, setTimeError] = useState(false);
    const [loading, setLoading]     = useState(true);

    // ─── 행사 모달 ─────────────────────────────────────────────
    const [showEventModal, setShowEventModal]   = useState(false);
    const [eventTab, setEventTab]               = useState<'db' | 'tour'>('db');
    const [dbEvents, setDbEvents]               = useState<DbEvent[]>([]);
    const [dbLoading, setDbLoading]             = useState(false);
    const [eventSearch, setEventSearch]         = useState('');
    const [eventKeyword, setEventKeyword]       = useState('');
    const [tourEvents, setTourEvents]           = useState<TourEvent[]>([]);
    const [tourLoading, setTourLoading]         = useState(false);
    const [tourError, setTourError]             = useState('');

    // ─── 카카오 지도 ───────────────────────────────────────────
    const [showMapModal, setShowMapModal]               = useState(false);
    const [mapLoaded, setMapLoaded]                     = useState(false);
    const [placeKeyword, setPlaceKeyword]               = useState('');
    const [placeResults, setPlaceResults]               = useState<KakaoPlace[]>([]);
    const [selectedPlace, setSelectedPlace]             = useState<KakaoPlace | null>(null);
    const [userBaseAddress, setUserBaseAddress]         = useState('');
    const [selectedEventCenter, setSelectedEventCenter] = useState<MapCenter | null>(null);
    const mapRef        = useRef<HTMLDivElement>(null);
    const kakaoMapRef   = useRef<any>(null);
    const markerRef     = useRef<any>(null);

    // ─── 기존 데이터 로드 ──────────────────────────────────────
    useEffect(() => {
        if (!id) return;
        setLoading(true);
        axiosInstance.get(`/groups/${id}`)
            .then(res => {
                const d = res.data;
                setFormData({
                    title:          d.title          || '',
                    event:          d.event          || '',
                    eventContentId: d.eventContentId || '',
                    location:       d.location       || '',
                    content:        d.content        || '',
                    maxCapacity:    d.maxCapacity     ?? 4,
                    meetingDate:    d.meetingDate     || '',
                    meetingTime:    d.meetingTime     || '',
                    condition:      d.condition       || '',
                });
                if (d.condition) {
                    const parsed = d.condition
                        .split(/\s+/)
                        .map((t: string) => t.replace(/^#/, '').trim())
                        .filter(Boolean);
                    setTags(parsed);
                }
            })
            .catch(() => {
                alert('글 정보를 불러올 수 없습니다.');
                navigate('/group');
            })
            .finally(() => setLoading(false));
    }, [id, navigate]);

    // ─── 유저 기본 주소 로드 ───────────────────────────────────
    useEffect(() => {
        axiosInstance.get('/v1/users/me')
            .then(res => setUserBaseAddress(res.data?.baseAddress || ''))
            .catch(() => {});
    }, []);

    // ─── DB 행사 로드 ──────────────────────────────────────────
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

    // ─── 카카오 SDK 로드 ──────────────────────────────────────
    useEffect(() => {
        if (window.kakao?.maps) { setMapLoaded(true); return; }
        const script = document.createElement('script');
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&libraries=services&autoload=false`;
        script.onload = () => window.kakao.maps.load(() => setMapLoaded(true));
        document.head.appendChild(script);
    }, []);

    // ─── 지도 초기화 ──────────────────────────────────────────
    useEffect(() => {
        if (!showMapModal || !mapLoaded || !mapRef.current) return;
        const timer = setTimeout(() => {
            if (!mapRef.current) return;
            const defaultCenter = selectedEventCenter
                ? new window.kakao.maps.LatLng(selectedEventCenter.lat, selectedEventCenter.lng)
                : new window.kakao.maps.LatLng(37.5665, 126.9780);
            const map = new window.kakao.maps.Map(mapRef.current, { center: defaultCenter, level: 5 });
            kakaoMapRef.current = map;

            if (selectedEventCenter) {
                map.setCenter(new window.kakao.maps.LatLng(selectedEventCenter.lat, selectedEventCenter.lng));
                map.setLevel(4);
            } else if (userBaseAddress) {
                const geocoder = new window.kakao.maps.services.Geocoder();
                geocoder.addressSearch(userBaseAddress, (result: any, status: any) => {
                    if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
                        map.setCenter(new window.kakao.maps.LatLng(result[0].y, result[0].x));
                        map.setLevel(4);
                    }
                });
            }

            window.kakao.maps.event.addListener(map, 'click', (mouseEvent: any) => {
                const latlng = mouseEvent.latLng;
                placeMarker(latlng, map);
                new window.kakao.maps.services.Geocoder().coord2Address(
                    latlng.getLng(), latlng.getLat(), (result: any, status: any) => {
                        if (status === window.kakao.maps.services.Status.OK) {
                            const addr = result[0]?.road_address?.address_name || result[0]?.address?.address_name || '';
                            setSelectedPlace({ place_name: addr, address_name: addr, road_address_name: result[0]?.road_address?.address_name || '', x: String(latlng.getLng()), y: String(latlng.getLat()) });
                        }
                    }
                );
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

    // ─── 장소 검색 ────────────────────────────────────────────
    const searchPlace = useCallback(() => {
        if (!placeKeyword.trim() || !mapLoaded) return;
        const ps = new window.kakao.maps.services.Places();
        const options = selectedEventCenter
            ? { location: new window.kakao.maps.LatLng(selectedEventCenter.lat, selectedEventCenter.lng), radius: 3000 }
            : undefined;
        ps.keywordSearch(placeKeyword, (data: any, status: any) => {
            setPlaceResults(status === window.kakao.maps.services.Status.OK ? data.slice(0, 8) : []);
        }, options);
    }, [placeKeyword, mapLoaded, selectedEventCenter]);

    const handlePlaceSelect = (place: KakaoPlace) => {
        setSelectedPlace(place);
        if (kakaoMapRef.current && mapLoaded) {
            placeMarker(new window.kakao.maps.LatLng(Number(place.y), Number(place.x)), kakaoMapRef.current);
        }
        setPlaceResults([]);
        setPlaceKeyword(place.place_name);
    };

    const confirmPlace = () => {
        if (!selectedPlace) return;
        setFormData(prev => ({ ...prev, location: selectedPlace.road_address_name || selectedPlace.address_name || selectedPlace.place_name }));
        setShowMapModal(false);
        setPlaceResults([]);
        setPlaceKeyword('');
    };

    // ─── TourAPI 검색 ─────────────────────────────────────────
    const searchTourEvents = async () => {
        if (!eventKeyword.trim()) return;
        setTourLoading(true); setTourError(''); setTourEvents([]);
        try {
            const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const url = `https://apis.data.go.kr/B551011/KorService1/searchFestival1`
                + `?serviceKey=${TOUR_API_KEY}&numOfRows=20&pageNo=1&MobileOS=ETC&MobileApp=GoRong&_type=json`
                + `&eventStartDate=${today}&keyword=${encodeURIComponent(eventKeyword)}`;
            const json = await (await fetch(url)).json();
            const items = json?.response?.body?.items?.item;
            if (!items) { setTourError('검색 결과가 없어요.'); return; }
            setTourEvents(Array.isArray(items) ? items : [items]);
        } catch { setTourError('행사 정보를 불러오지 못했어요.'); }
        finally { setTourLoading(false); }
    };

    // ─── 행사 선택 ────────────────────────────────────────────
    const handleDbEventSelect = (ev: DbEvent) => {
        setFormData(prev => ({ ...prev, event: ev.title, eventContentId: ev.id?.toString() || '' }));
        setSelectedEventCenter(toEventCenter(ev));
        setSelectedPlace(null);
        setPlaceKeyword(ev.addr1 || ev.title);
        setShowEventModal(false); setEventSearch('');
    };
    const handleTourEventSelect = (ev: TourEvent) => {
        setFormData(prev => ({ ...prev, event: ev.title, eventContentId: ev.contentid?.toString() || '' }));
        setSelectedEventCenter(toEventCenter(ev));
        setSelectedPlace(null);
        setPlaceKeyword(ev.addr1 || ev.title);
        setShowEventModal(false); setTourEvents([]); setEventKeyword('');
    };

    // ─── 해시태그 ─────────────────────────────────────────────
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

    // ─── 폼 ───────────────────────────────────────────────────
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const missingDate = !formData.meetingDate;
        const missingTime = !formData.meetingTime;
        setDateError(missingDate);
        setTimeError(missingTime);
        if (missingDate || missingTime) {
            alert('모임 날짜와 집합 시간은 필수 입력 항목입니다.');
            return;
        }
        try {
            await axiosInstance.put(`/groups/${id}`, formData);
            alert('수정이 완료되었습니다! ✨');
            navigate(`/groups/${id}`);
        } catch {
            alert('수정 중 오류가 발생했습니다.');
        }
    };

    const fmtDate = (d: string) => d ? `${d.slice(0,4)}.${d.slice(4,6)}.${d.slice(6,8)}` : '';
    const filteredDbEvents = dbEvents.filter(ev =>
        !eventSearch || ev.title.toLowerCase().includes(eventSearch.toLowerCase()) || ev.addr1.toLowerCase().includes(eventSearch.toLowerCase())
    );

    // ─── 로딩 ─────────────────────────────────────────────────
    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', fontFamily: 'Noto Sans KR, sans-serif' }}>
                <div style={{ textAlign: 'center', color: '#b0aca5' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                    <p style={{ fontSize: '15px' }}>불러오는 중...</p>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════
    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap');

                .gcp-root {
                    background: #f5f4f0;
                    min-height: 100vh;
                    font-family: 'Noto Sans KR', sans-serif;
                    padding: 48px 24px 80px;
                }

                /* ── 상단 헤드 영역 ── */
                .gcp-head {
                    max-width: 1100px;
                    margin: 0 auto 36px;
                    display: flex;
                    align-items: flex-end;
                    justify-content: space-between;
                    gap: 16px;
                }
                .gcp-head-left {}
                .gcp-breadcrumb {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 13px;
                    color: #9e9b95;
                    margin-bottom: 10px;
                }
                .gcp-breadcrumb span { cursor: default; }
                .gcp-breadcrumb a {
                    color: #9e9b95;
                    text-decoration: none;
                    cursor: pointer;
                    transition: color 0.15s;
                }
                .gcp-breadcrumb a:hover { color: #e06c2a; }
                .gcp-breadcrumb-sep { font-size: 11px; }
                .gcp-title {
                    font-size: 30px;
                    font-weight: 800;
                    color: #1a1816;
                    letter-spacing: -0.5px;
                    margin: 0;
                }
                .gcp-title-accent { color: #e06c2a; }
                .gcp-subtitle {
                    margin: 6px 0 0;
                    font-size: 14px;
                    color: #8a877f;
                }
                .gcp-back-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 10px 18px;
                    border-radius: 8px;
                    border: 1.5px solid #ddd9d2;
                    background: white;
                    color: #5a564f;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.15s;
                    font-family: inherit;
                }
                .gcp-back-btn:hover {
                    border-color: #e06c2a;
                    color: #e06c2a;
                    background: #fff9f5;
                }

                /* ── 2컬럼 레이아웃 ── */
                .gcp-layout {
                    max-width: 1100px;
                    margin: 0 auto;
                    display: grid;
                    grid-template-columns: 1fr 340px;
                    gap: 24px;
                    align-items: start;
                }

                /* ── 폼 카드 ── */
                .gcp-main-card {
                    background: white;
                    border-radius: 16px;
                    border: 1px solid #e8e4dd;
                    overflow: hidden;
                }

                /* ── 사이드바 ── */
                .gcp-sidebar {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    position: sticky;
                    top: 24px;
                }
                .gcp-sidebar-card {
                    background: white;
                    border-radius: 16px;
                    border: 1px solid #e8e4dd;
                    padding: 24px;
                }
                .gcp-sidebar-card-title {
                    font-size: 13px;
                    font-weight: 700;
                    color: #8a877f;
                    text-transform: uppercase;
                    letter-spacing: 0.8px;
                    margin: 0 0 16px;
                }
                .gcp-preview-title {
                    font-size: 17px;
                    font-weight: 700;
                    color: #1a1816;
                    min-height: 24px;
                    word-break: break-all;
                }
                .gcp-preview-title.placeholder { color: #c5c1bb; font-weight: 400; }
                .gcp-preview-row {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    margin-top: 12px;
                    font-size: 13px;
                    color: #5a564f;
                }
                .gcp-preview-icon { font-size: 15px; flex-shrink: 0; margin-top: 1px; }
                .gcp-tags-preview {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    margin-top: 14px;
                }
                .gcp-tag-chip {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 10px;
                    border-radius: 20px;
                    background: #fff4ec;
                    color: #e06c2a;
                    font-size: 12px;
                    font-weight: 600;
                    border: 1px solid #fad4b8;
                }

                /* ── 섹션 구분 ── */
                .gcp-section {
                    padding: 32px 36px;
                    border-bottom: 1px solid #f0ece6;
                }
                .gcp-section:last-of-type { border-bottom: none; }
                .gcp-section-label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 11px;
                    font-weight: 700;
                    color: #e06c2a;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 20px;
                }
                .gcp-section-label-line {
                    flex: 1;
                    height: 1px;
                    background: #f0ece6;
                }

                /* ── 필드 ── */
                .gcp-field { margin-bottom: 20px; }
                .gcp-field:last-child { margin-bottom: 0; }
                .gcp-label {
                    display: block;
                    font-size: 13px;
                    font-weight: 600;
                    color: #3a3730;
                    margin-bottom: 8px;
                }
                .gcp-label-required {
                    color: #e06c2a;
                    margin-left: 3px;
                }
                .gcp-hint {
                    font-size: 12px;
                    color: #9e9b95;
                    margin: -4px 0 8px;
                }
                .gcp-input {
                    width: 100%;
                    padding: 11px 14px;
                    border-radius: 8px;
                    border: 1.5px solid #e0dbd3;
                    outline: none;
                    font-size: 14px;
                    color: #1a1816;
                    box-sizing: border-box;
                    transition: border-color 0.15s, box-shadow 0.15s;
                    background: white;
                    font-family: 'Noto Sans KR', sans-serif;
                }
                .gcp-input:focus {
                    border-color: #e06c2a;
                    box-shadow: 0 0 0 3px rgba(224,108,42,0.1);
                }
                .gcp-input::placeholder { color: #c0bcb5; }
                .gcp-input.error {
                    border-color: #ef4444;
                    background: #fef9f9;
                }
                .gcp-input.error:focus {
                    box-shadow: 0 0 0 3px rgba(239,68,68,0.1);
                }
                .gcp-input-readonly {
                    background: #fafaf8;
                    cursor: pointer;
                }
                .gcp-input-readonly:hover {
                    border-color: #c8c3bb;
                }
                .gcp-error-msg {
                    margin: 5px 0 0;
                    font-size: 12px;
                    color: #ef4444;
                    font-weight: 600;
                }
                .gcp-textarea {
                    width: 100%;
                    padding: 12px 14px;
                    border-radius: 8px;
                    border: 1.5px solid #e0dbd3;
                    outline: none;
                    font-size: 14px;
                    color: #1a1816;
                    box-sizing: border-box;
                    transition: border-color 0.15s, box-shadow 0.15s;
                    background: white;
                    font-family: 'Noto Sans KR', sans-serif;
                    resize: vertical;
                    min-height: 120px;
                }
                .gcp-textarea:focus {
                    border-color: #e06c2a;
                    box-shadow: 0 0 0 3px rgba(224,108,42,0.1);
                }
                .gcp-textarea::placeholder { color: #c0bcb5; }

                /* ── 행 그리드 ── */
                .gcp-row-3 {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 16px;
                }
                .gcp-row-2 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }

                /* ── 인풋+버튼 묶음 ── */
                .gcp-input-group {
                    display: flex;
                    gap: 8px;
                }
                .gcp-input-group .gcp-input { flex: 1; }
                .gcp-select-btn {
                    padding: 11px 16px;
                    border-radius: 8px;
                    border: 1.5px solid #e06c2a;
                    background: white;
                    color: #e06c2a;
                    font-weight: 700;
                    font-size: 13px;
                    cursor: pointer;
                    white-space: nowrap;
                    flex-shrink: 0;
                    transition: all 0.15s;
                    font-family: 'Noto Sans KR', sans-serif;
                }
                .gcp-select-btn:hover {
                    background: #e06c2a;
                    color: white;
                }

                /* ── 해시태그 영역 ── */
                .gcp-tag-box {
                    min-height: 46px;
                    padding: 6px 10px;
                    border-radius: 8px;
                    border: 1.5px solid #e0dbd3;
                    background: white;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    align-items: center;
                    cursor: text;
                    transition: border-color 0.15s, box-shadow 0.15s;
                }
                .gcp-tag-box:focus-within {
                    border-color: #e06c2a;
                    box-shadow: 0 0 0 3px rgba(224,108,42,0.1);
                }
                .gcp-tag-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    background: #fff4ec;
                    color: #e06c2a;
                    border: 1px solid #fad4b8;
                    border-radius: 20px;
                    padding: 3px 10px;
                    font-size: 13px;
                    font-weight: 600;
                    white-space: nowrap;
                }
                .gcp-tag-remove {
                    cursor: pointer;
                    font-size: 15px;
                    line-height: 1;
                    color: #e06c2a;
                    opacity: 0.7;
                    transition: opacity 0.1s;
                    background: none;
                    border: none;
                    padding: 0;
                    display: flex;
                    align-items: center;
                }
                .gcp-tag-remove:hover { opacity: 1; }
                .gcp-tag-input {
                    border: none;
                    outline: none;
                    font-size: 13px;
                    min-width: 160px;
                    flex: 1;
                    padding: 3px 4px;
                    color: #1a1816;
                    background: transparent;
                    font-family: 'Noto Sans KR', sans-serif;
                }
                .gcp-tag-input::placeholder { color: #c0bcb5; }

                /* ── 제출 버튼 영역 ── */
                .gcp-submit-area {
                    padding: 28px 36px;
                    background: #fafaf8;
                    border-top: 1px solid #f0ece6;
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }
                .gcp-submit-btn {
                    flex: 1;
                    padding: 15px;
                    border-radius: 10px;
                    border: none;
                    background: #e06c2a;
                    color: white;
                    font-weight: 800;
                    font-size: 16px;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-family: 'Noto Sans KR', sans-serif;
                    letter-spacing: -0.2px;
                }
                .gcp-submit-btn:hover {
                    background: #c95e22;
                    transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(224,108,42,0.35);
                }
                .gcp-submit-btn:active { transform: translateY(0); }
                .gcp-cancel-btn {
                    padding: 15px 24px;
                    border-radius: 10px;
                    border: 1.5px solid #ddd9d2;
                    background: white;
                    color: #8a877f;
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.15s;
                    font-family: 'Noto Sans KR', sans-serif;
                }
                .gcp-cancel-btn:hover {
                    border-color: #b8b3ac;
                    color: #5a564f;
                }

                /* ── 행사 선택 완료 뱃지 ── */
                .gcp-selected-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px;
                    border-radius: 20px;
                    background: #e8f5e9;
                    color: #2e7d32;
                    font-size: 12px;
                    font-weight: 600;
                    border: 1px solid #c8e6c9;
                    margin-top: 8px;
                }
                .gcp-clear-btn {
                    background: none;
                    border: none;
                    color: #9e9b95;
                    font-size: 12px;
                    cursor: pointer;
                    padding: 0;
                    margin-top: 6px;
                    font-family: 'Noto Sans KR', sans-serif;
                }
                .gcp-clear-btn:hover { color: #e06c2a; }

                /* ── 모달 오버레이 ── */
                .gcp-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15,12,9,0.55);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    padding: 24px;
                    backdrop-filter: blur(2px);
                }
                .gcp-modal {
                    background: white;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 24px 64px rgba(0,0,0,0.2);
                    display: flex;
                    flex-direction: column;
                }
                .gcp-modal-head {
                    padding: 20px 24px;
                    border-bottom: 1px solid #f0ece6;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-shrink: 0;
                }
                .gcp-modal-head-title {
                    font-size: 17px;
                    font-weight: 700;
                    color: #1a1816;
                    margin: 0;
                }
                .gcp-modal-head-sub {
                    font-size: 12px;
                    color: #9e9b95;
                    margin: 3px 0 0;
                }
                .gcp-modal-close {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    border: 1.5px solid #e8e4dd;
                    background: white;
                    color: #8a877f;
                    font-size: 18px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.15s;
                    line-height: 1;
                }
                .gcp-modal-close:hover {
                    border-color: #e06c2a;
                    color: #e06c2a;
                    background: #fff9f5;
                }

                /* ── 탭 ── */
                .gcp-tabs {
                    display: flex;
                    border-bottom: 1px solid #f0ece6;
                    flex-shrink: 0;
                }
                .gcp-tab {
                    flex: 1;
                    padding: 13px;
                    border: none;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 13px;
                    background: white;
                    color: #9e9b95;
                    border-bottom: 2px solid transparent;
                    transition: all 0.15s;
                    font-family: 'Noto Sans KR', sans-serif;
                }
                .gcp-tab.active {
                    color: #e06c2a;
                    border-bottom-color: #e06c2a;
                }
                .gcp-tab:hover:not(.active) { background: #fafaf8; color: #5a564f; }

                /* ── 모달 검색 ── */
                .gcp-modal-search {
                    padding: 14px 20px;
                    border-bottom: 1px solid #f0ece6;
                    display: flex;
                    gap: 8px;
                    flex-shrink: 0;
                }
                .gcp-modal-input {
                    flex: 1;
                    padding: 9px 13px;
                    border-radius: 7px;
                    border: 1.5px solid #e0dbd3;
                    outline: none;
                    font-size: 13px;
                    color: #1a1816;
                    transition: border-color 0.15s;
                    font-family: 'Noto Sans KR', sans-serif;
                }
                .gcp-modal-input:focus { border-color: #e06c2a; }
                .gcp-modal-input::placeholder { color: #c0bcb5; }
                .gcp-modal-search-btn {
                    padding: 9px 16px;
                    border-radius: 7px;
                    border: none;
                    background: #e06c2a;
                    color: white;
                    font-weight: 700;
                    font-size: 13px;
                    cursor: pointer;
                    font-family: 'Noto Sans KR', sans-serif;
                    transition: background 0.15s;
                }
                .gcp-modal-search-btn:hover { background: #c95e22; }

                /* ── 이벤트 리스트 ── */
                .gcp-event-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 12px 20px 16px;
                }
                .gcp-event-item {
                    padding: 12px;
                    border-radius: 10px;
                    cursor: pointer;
                    border: 1.5px solid #f0ece6;
                    margin-bottom: 8px;
                    display: flex;
                    gap: 12px;
                    align-items: flex-start;
                    transition: all 0.15s;
                }
                .gcp-event-item:hover {
                    border-color: #e06c2a;
                    background: #fff9f5;
                }
                .gcp-event-thumb {
                    width: 52px;
                    height: 52px;
                    border-radius: 8px;
                    object-fit: cover;
                    flex-shrink: 0;
                }
                .gcp-event-thumb-placeholder {
                    width: 52px;
                    height: 52px;
                    border-radius: 8px;
                    background: #fff4ec;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 22px;
                    flex-shrink: 0;
                }
                .gcp-event-name {
                    font-weight: 700;
                    font-size: 14px;
                    color: #1a1816;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .gcp-event-addr {
                    font-size: 12px;
                    color: #8a877f;
                    margin-top: 2px;
                }
                .gcp-event-date {
                    font-size: 11px;
                    color: #b0aca5;
                    margin-top: 2px;
                }
                .gcp-event-arrow {
                    color: #e06c2a;
                    font-size: 18px;
                    flex-shrink: 0;
                    margin-top: 14px;
                }
                .gcp-list-empty {
                    text-align: center;
                    padding: 48px 24px;
                    color: #b0aca5;
                    font-size: 14px;
                }

                /* ── 지도 모달 하단 ── */
                .gcp-map-footer {
                    padding: 14px 20px;
                    border-top: 1px solid #f0ece6;
                    display: flex;
                    gap: 12px;
                    align-items: center;
                    flex-shrink: 0;
                }
                .gcp-map-selected-info {
                    flex: 1;
                    font-size: 13px;
                    color: #5a564f;
                    font-weight: 600;
                }
                .gcp-map-selected-info.placeholder {
                    color: #b0aca5;
                    font-weight: 400;
                }
                .gcp-map-confirm-btn {
                    padding: 10px 20px;
                    border-radius: 8px;
                    border: none;
                    font-weight: 700;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.15s;
                    font-family: 'Noto Sans KR', sans-serif;
                }
                .gcp-map-confirm-btn.active {
                    background: #e06c2a;
                    color: white;
                }
                .gcp-map-confirm-btn.active:hover { background: #c95e22; }
                .gcp-map-confirm-btn.disabled {
                    background: #f0ece6;
                    color: #b0aca5;
                    cursor: default;
                }

                /* ── 커스텀 피커 트리거 버튼 ── */
                .gcp-picker-trigger {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    text-align: left;
                    background: white;
                }
                .gcp-picker-trigger:hover { border-color: #c8c3bb; }
                .gcp-picker-icon { font-size: 15px; flex-shrink: 0; }
                .gcp-picker-arrow { color: #b0aca5; font-size: 11px; flex-shrink: 0; }

                /* ── 달력 팝업 ── */
                .gcp-calendar-popup {
                    position: absolute;
                    top: calc(100% + 6px);
                    left: 0;
                    z-index: 1000;
                    background: white;
                    border-radius: 12px;
                    border: 1.5px solid #e8e4dd;
                    box-shadow: 0 12px 40px rgba(0,0,0,0.13);
                    width: 280px;
                    overflow: hidden;
                }
                .gcp-cal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 14px 16px 10px;
                    border-bottom: 1px solid #f0ece6;
                }
                .gcp-cal-title { font-weight: 700; font-size: 14px; color: #1a1816; }
                .gcp-cal-nav {
                    width: 28px; height: 28px; border-radius: 6px;
                    border: 1.5px solid #e8e4dd; background: white; color: #5a564f;
                    font-size: 16px; cursor: pointer; display: flex; align-items: center;
                    justify-content: center; transition: all 0.12s; line-height: 1;
                }
                .gcp-cal-nav:hover { border-color: #e06c2a; color: #e06c2a; background: #fff9f5; }
                .gcp-cal-grid {
                    display: grid; grid-template-columns: repeat(7, 1fr);
                    padding: 10px 10px 6px; gap: 2px;
                }
                .gcp-cal-dow { text-align: center; font-size: 11px; font-weight: 700; padding: 4px 0 6px; }
                .gcp-cal-day {
                    aspect-ratio: 1; border-radius: 6px; border: none; background: none;
                    font-size: 13px; color: #3a3730; cursor: pointer; transition: all 0.1s;
                    font-family: 'Noto Sans KR', sans-serif; display: flex; align-items: center; justify-content: center;
                }
                .gcp-cal-day:hover:not(.selected) { background: #fff4ec; color: #e06c2a; }
                .gcp-cal-day.today { background: #f0ece6; font-weight: 700; }
                .gcp-cal-day.selected { background: #e06c2a; color: white !important; font-weight: 700; border-radius: 8px; }
                .gcp-cal-footer { padding: 8px 10px 10px; border-top: 1px solid #f0ece6; text-align: center; }
                .gcp-cal-today-btn {
                    padding: 6px 18px; border-radius: 20px; border: 1.5px solid #e06c2a;
                    background: none; color: #e06c2a; font-size: 12px; font-weight: 700;
                    cursor: pointer; font-family: 'Noto Sans KR', sans-serif; transition: all 0.12s;
                }
                .gcp-cal-today-btn:hover { background: #e06c2a; color: white; }

                /* ── 시간 피커 팝업 ── */
                .gcp-timepicker-popup {
                    position: absolute; top: calc(100% + 6px); z-index: 1000;
                    background: white; border-radius: 12px; border: 1.5px solid #e8e4dd;
                    box-shadow: 0 12px 40px rgba(0,0,0,0.13); width: 260px; padding: 14px;
                }
                .gcp-time-ampm-row { display: flex; gap: 6px; margin-bottom: 14px; }
                .gcp-ampm-btn {
                    flex: 1; padding: 8px; border-radius: 8px; border: 1.5px solid #e8e4dd;
                    background: white; color: #8a877f; font-size: 13px; font-weight: 600;
                    cursor: pointer; transition: all 0.12s; font-family: 'Noto Sans KR', sans-serif;
                }
                .gcp-ampm-btn.active { background: #e06c2a; border-color: #e06c2a; color: white; }
                .gcp-ampm-btn:not(.active):hover { border-color: #e06c2a; color: #e06c2a; }
                .gcp-time-section-label { font-size: 11px; font-weight: 700; color: #9e9b95; letter-spacing: 0.5px; margin-bottom: 6px; text-transform: uppercase; }
                .gcp-time-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
                .gcp-time-cell {
                    padding: 7px 4px; border-radius: 7px; border: 1.5px solid transparent;
                    background: #fafaf8; color: #3a3730; font-size: 13px; font-weight: 600;
                    cursor: pointer; transition: all 0.1s; font-family: 'Noto Sans KR', sans-serif; text-align: center;
                }
                .gcp-time-cell:hover:not(.selected) { border-color: #e06c2a; color: #e06c2a; background: #fff9f5; }
                .gcp-time-cell.selected { background: #e06c2a; color: white; border-color: #e06c2a; }

                /* ── 반응형 ── */
                @media (max-width: 900px) {
                    .gcp-layout { grid-template-columns: 1fr; }
                    .gcp-sidebar { position: static; }
                    .gcp-row-3 { grid-template-columns: 1fr 1fr; }
                }
                @media (max-width: 640px) {
                    .gcp-root { padding: 24px 16px 60px; }
                    .gcp-section { padding: 24px 20px; }
                    .gcp-submit-area { padding: 20px; }
                    .gcp-row-3 { grid-template-columns: 1fr; }
                    .gcp-row-2 { grid-template-columns: 1fr; }
                    .gcp-head { flex-direction: column; align-items: flex-start; }
                }
            `}</style>

            <div className="gcp-root">

                {/* ── 상단 헤더 ── */}
                <div className="gcp-head">
                    <div className="gcp-head-left">
                        <nav className="gcp-breadcrumb">
                            <a onClick={() => navigate('/')}>홈</a>
                            <span className="gcp-breadcrumb-sep">›</span>
                            <a onClick={() => navigate('/group')}>모임 목록</a>
                            <span className="gcp-breadcrumb-sep">›</span>
                            <span>모집글 수정</span>
                        </nav>
                        <h1 className="gcp-title">
                            모집글 <span className="gcp-title-accent">수정하기</span>
                        </h1>
                        <p className="gcp-subtitle">정보를 업데이트하고 더 많은 동행자를 모아보세요 ✏️</p>
                    </div>
                    <button className="gcp-back-btn" onClick={() => navigate(-1)}>
                        ← 돌아가기
                    </button>
                </div>

                {/* ── 2컬럼 레이아웃 ── */}
                <div className="gcp-layout">

                    {/* ═══ 왼쪽: 메인 폼 카드 ═══ */}
                    <div className="gcp-main-card">
                        <form onSubmit={handleSubmit}>

                            {/* 섹션 1: 기본 정보 */}
                            <div className="gcp-section">
                                <div className="gcp-section-label">
                                    <span>01</span>
                                    <span>기본 정보</span>
                                    <div className="gcp-section-label-line" />
                                </div>

                                {/* 제목 */}
                                <div className="gcp-field">
                                    <label className="gcp-label">
                                        모집 제목 <span className="gcp-label-required">*</span>
                                    </label>
                                    <input
                                        name="title"
                                        value={formData.title}
                                        placeholder="예: 올림픽공원 재즈 페스티벌 같이 가요 🎷"
                                        onChange={handleChange}
                                        required
                                        className="gcp-input"
                                    />
                                </div>

                                {/* 설명 */}
                                <div className="gcp-field">
                                    <label className="gcp-label">모임 소개</label>
                                    <textarea
                                        name="content"
                                        value={formData.content}
                                        placeholder="어떤 모임인지 자세히 설명해주세요. 분위기, 주의사항, 일정 등을 적어보세요."
                                        onChange={handleChange}
                                        required
                                        className="gcp-textarea"
                                    />
                                </div>
                            </div>

                            {/* 섹션 2: 행사 & 장소 */}
                            <div className="gcp-section">
                                <div className="gcp-section-label">
                                    <span>02</span>
                                    <span>행사 및 장소</span>
                                    <div className="gcp-section-label-line" />
                                </div>

                                {/* 참여할 행사 */}
                                <div className="gcp-field">
                                    <label className="gcp-label">참여할 행사</label>
                                    <p className="gcp-hint">고롱 DB 행사 또는 TourAPI에서 검색해 선택하세요</p>
                                    <div className="gcp-input-group">
                                        <input
                                            readOnly
                                            placeholder="행사를 검색해서 선택해주세요"
                                            value={formData.event}
                                            className="gcp-input gcp-input-readonly"
                                            onClick={() => setShowEventModal(true)}
                                        />
                                        <button type="button" onClick={() => setShowEventModal(true)} className="gcp-select-btn">
                                            🔍 행사 선택
                                        </button>
                                    </div>
                                    {formData.event && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                                            <span className="gcp-selected-badge">✓ {formData.event}</span>
                                            <button
                                                type="button"
                                                className="gcp-clear-btn"
                                                onClick={() => setFormData(prev => ({ ...prev, event: '', eventContentId: '' }))}
                                            >
                                                × 초기화
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* 모임 장소 */}
                                <div className="gcp-field">
                                    <label className="gcp-label">모임 장소 (상세)</label>
                                    <p className="gcp-hint">
                                        {selectedEventCenter
                                            ? `선택한 행사 주변: ${selectedEventCenter.address || selectedEventCenter.title}`
                                            : userBaseAddress
                                                ? `기본 위치: ${userBaseAddress}`
                                                : '지도에서 클릭하거나 장소를 검색해 핀을 꽂아보세요'}
                                    </p>
                                    <div className="gcp-input-group">
                                        <input
                                            readOnly
                                            placeholder="지도에서 장소를 선택해주세요"
                                            value={formData.location}
                                            className="gcp-input gcp-input-readonly"
                                            onClick={() => setShowMapModal(true)}
                                        />
                                        <button type="button" onClick={() => setShowMapModal(true)} className="gcp-select-btn">
                                            📍 지도 열기
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 섹션 3: 모임 일정 */}
                            <div className="gcp-section">
                                <div className="gcp-section-label">
                                    <span>03</span>
                                    <span>모임 일정 & 인원</span>
                                    <div className="gcp-section-label-line" />
                                </div>

                                <div className="gcp-row-3">
                                    {/* 최대 인원 */}
                                    <div className="gcp-field">
                                        <label className="gcp-label">최대 인원</label>
                                        <input
                                            type="number"
                                            name="maxCapacity"
                                            value={formData.maxCapacity}
                                            min="2"
                                            max="4"
                                            onChange={handleChange}
                                            className="gcp-input"
                                        />
                                    </div>

                                    {/* 모임 날짜 */}
                                    <div className="gcp-field">
                                        <label className="gcp-label">
                                            모임 날짜 <span className="gcp-label-required">*</span>
                                        </label>
                                        <CustomDatePicker
                                            value={formData.meetingDate}
                                            onChange={val => { setFormData(prev => ({ ...prev, meetingDate: val })); setDateError(false); }}
                                            hasError={dateError}
                                        />
                                        {dateError && <p className="gcp-error-msg">⚠ 날짜를 선택해주세요</p>}
                                    </div>

                                    {/* 집합 시간 */}
                                    <div className="gcp-field">
                                        <label className="gcp-label">
                                            집합 시간 <span className="gcp-label-required">*</span>
                                        </label>
                                        <CustomTimePicker
                                            value={formData.meetingTime}
                                            onChange={val => { setFormData(prev => ({ ...prev, meetingTime: val })); setTimeError(false); }}
                                            hasError={timeError}
                                        />
                                        {timeError && <p className="gcp-error-msg">⚠ 시간을 선택해주세요</p>}
                                    </div>
                                </div>
                            </div>

                            {/* 섹션 4: 참여 조건 */}
                            <div className="gcp-section">
                                <div className="gcp-section-label">
                                    <span>04</span>
                                    <span>참여 조건</span>
                                    <div className="gcp-section-label-line" />
                                </div>

                                <div className="gcp-field">
                                    <label className="gcp-label">태그</label>
                                    <p className="gcp-hint">입력 후 Space 또는 Enter를 누르면 태그가 추가돼요</p>
                                    <div
                                        className="gcp-tag-box"
                                        onClick={() => document.getElementById('gep-tag-input')?.focus()}
                                    >
                                        {tags.map(tag => (
                                            <span key={tag} className="gcp-tag-pill">
                                                #{tag}
                                                <button
                                                    type="button"
                                                    onClick={e => { e.stopPropagation(); removeTag(tag); }}
                                                    className="gcp-tag-remove"
                                                >×</button>
                                            </span>
                                        ))}
                                        <input
                                            id="gep-tag-input"
                                            value={tagInput}
                                            onChange={e => setTagInput(e.target.value)}
                                            onKeyDown={handleTagKeyDown}
                                            placeholder={tags.length === 0 ? '#비흡연자  #20대  #여성만  (Space / Enter로 추가)' : ''}
                                            className="gcp-tag-input"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 제출 버튼 */}
                            <div className="gcp-submit-area">
                                <button type="button" className="gcp-cancel-btn" onClick={() => navigate(-1)}>
                                    취소
                                </button>
                                <button type="submit" className="gcp-submit-btn">
                                    수정 완료 ✨
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* ═══ 오른쪽: 사이드바 ═══ */}
                    <div className="gcp-sidebar">

                        {/* 미리보기 카드 */}
                        <div className="gcp-sidebar-card">
                            <p className="gcp-sidebar-card-title">수정 내용 미리보기</p>
                            <div className={`gcp-preview-title${!formData.title ? ' placeholder' : ''}`}>
                                {formData.title || '모집 제목이 여기에 표시됩니다'}
                            </div>
                            {formData.event && (
                                <div className="gcp-preview-row">
                                    <span className="gcp-preview-icon">🎟️</span>
                                    <span>{formData.event}</span>
                                </div>
                            )}
                            {formData.location && (
                                <div className="gcp-preview-row">
                                    <span className="gcp-preview-icon">📍</span>
                                    <span>{formData.location}</span>
                                </div>
                            )}
                            {(formData.meetingDate || formData.meetingTime) && (
                                <div className="gcp-preview-row">
                                    <span className="gcp-preview-icon">📅</span>
                                    <span>
                                        {formData.meetingDate && formData.meetingDate.replace(/-/g, '.')}
                                        {formData.meetingDate && formData.meetingTime && ' · '}
                                        {formData.meetingTime}
                                    </span>
                                </div>
                            )}
                            <div className="gcp-preview-row">
                                <span className="gcp-preview-icon">👥</span>
                                <span>최대 {formData.maxCapacity}명</span>
                            </div>
                            {tags.length > 0 && (
                                <div className="gcp-tags-preview">
                                    {tags.map(tag => (
                                        <span key={tag} className="gcp-tag-chip">#{tag}</span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 수정 안내 카드 */}
                        <div className="gcp-sidebar-card">
                            <p className="gcp-sidebar-card-title">수정 안내</p>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', fontSize: '13px', color: '#5a564f', lineHeight: 1.5 }}>
                                <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fff4ec', color: '#e06c2a', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>1</span>
                                <span>행사나 장소를 바꾸면 지도 기준점도 함께 변경돼요</span>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', fontSize: '13px', color: '#5a564f', lineHeight: 1.5 }}>
                                <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fff4ec', color: '#e06c2a', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>2</span>
                                <span>태그는 기존 조건이 불러와져 있어요. 수정 후 저장하세요</span>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', fontSize: '13px', color: '#5a564f', lineHeight: 1.5 }}>
                                <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fff4ec', color: '#e06c2a', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>3</span>
                                <span>날짜·시간은 필수 항목이에요. 빠짐없이 입력해주세요</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ════════════ 모달: 행사 선택 ════════════ */}
            {showEventModal && (
                <div className="gcp-overlay" onClick={() => { setShowEventModal(false); setEventSearch(''); setTourEvents([]); }}>
                    <div
                        className="gcp-modal"
                        style={{ width: '580px', maxWidth: '95vw', maxHeight: '80vh' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="gcp-modal-head">
                            <div>
                                <p className="gcp-modal-head-title">🎟️ 행사 선택</p>
                                <p className="gcp-modal-head-sub">고롱 DB 행사 또는 TourAPI에서 검색</p>
                            </div>
                            <button className="gcp-modal-close" onClick={() => { setShowEventModal(false); setEventSearch(''); setTourEvents([]); }}>×</button>
                        </div>

                        <div className="gcp-tabs">
                            {(['db', 'tour'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setEventTab(tab)}
                                    className={`gcp-tab${eventTab === tab ? ' active' : ''}`}
                                >
                                    {tab === 'db' ? '📋 고롱 행사 목록' : '🔍 TourAPI 검색'}
                                </button>
                            ))}
                        </div>

                        {eventTab === 'db' && (
                            <>
                                <div className="gcp-modal-search">
                                    <input
                                        value={eventSearch}
                                        onChange={e => setEventSearch(e.target.value)}
                                        placeholder="행사명 또는 주소로 필터링"
                                        className="gcp-modal-input"
                                        autoFocus
                                    />
                                </div>
                                <div className="gcp-event-list">
                                    {dbLoading && <div className="gcp-list-empty">행사 목록 불러오는 중... ⏳</div>}
                                    {!dbLoading && filteredDbEvents.length === 0 && (
                                        <div className="gcp-list-empty">검색 결과가 없어요.</div>
                                    )}
                                    {filteredDbEvents.map(ev => (
                                        <div key={ev.id} className="gcp-event-item" onClick={() => handleDbEventSelect(ev)}>
                                            {ev.image
                                                ? <img src={ev.image} alt={ev.title} className="gcp-event-thumb" />
                                                : <div className="gcp-event-thumb-placeholder">🎪</div>
                                            }
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div className="gcp-event-name">{ev.title}</div>
                                                <div className="gcp-event-addr">📍 {ev.addr1 || '장소 정보 없음'}</div>
                                            </div>
                                            <span className="gcp-event-arrow">›</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {eventTab === 'tour' && (
                            <>
                                <div className="gcp-modal-search">
                                    <input
                                        value={eventKeyword}
                                        onChange={e => setEventKeyword(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && searchTourEvents()}
                                        placeholder="행사명 또는 지역 검색 (예: 서울, 재즈)"
                                        className="gcp-modal-input"
                                        autoFocus
                                    />
                                    <button type="button" onClick={searchTourEvents} className="gcp-modal-search-btn">검색</button>
                                </div>
                                <div className="gcp-event-list">
                                    {tourLoading && <div className="gcp-list-empty">불러오는 중... ⏳</div>}
                                    {tourError && <div className="gcp-list-empty" style={{ color: '#ef4444' }}>{tourError}</div>}
                                    {!tourLoading && !tourError && tourEvents.length === 0 && (
                                        <div className="gcp-list-empty">키워드를 입력하고 검색해보세요 🔍</div>
                                    )}
                                    {tourEvents.map(ev => (
                                        <div key={ev.contentid} className="gcp-event-item" onClick={() => handleTourEventSelect(ev)}>
                                            {ev.firstimage
                                                ? <img src={ev.firstimage} alt={ev.title} className="gcp-event-thumb" />
                                                : <div className="gcp-event-thumb-placeholder">🎪</div>
                                            }
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div className="gcp-event-name">{ev.title}</div>
                                                <div className="gcp-event-addr">📍 {ev.addr1 || '장소 정보 없음'}</div>
                                                <div className="gcp-event-date">📅 {fmtDate(ev.eventstartdate)} ~ {fmtDate(ev.eventenddate)}</div>
                                            </div>
                                            <span className="gcp-event-arrow">›</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ════════════ 모달: 카카오 지도 ════════════ */}
            {showMapModal && (
                <div className="gcp-overlay" onClick={() => { setShowMapModal(false); setPlaceResults([]); }}>
                    <div
                        className="gcp-modal"
                        style={{ width: '720px', maxWidth: '97vw' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="gcp-modal-head">
                            <div>
                                <p className="gcp-modal-head-title">📍 모임 장소 선택</p>
                                <p className="gcp-modal-head-sub">
                                    {selectedEventCenter
                                        ? `선택한 행사 주변: ${selectedEventCenter.address || selectedEventCenter.title}`
                                        : userBaseAddress
                                            ? `기본 위치: ${userBaseAddress}`
                                            : '장소를 검색하거나 지도를 클릭해 핀을 꽂으세요'}
                                </p>
                            </div>
                            <button className="gcp-modal-close" onClick={() => { setShowMapModal(false); setPlaceResults([]); }}>×</button>
                        </div>

                        <div className="gcp-modal-search">
                            <input
                                value={placeKeyword}
                                onChange={e => setPlaceKeyword(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && searchPlace()}
                                placeholder="장소명 검색 (예: 올림픽공원, 홍대입구역)"
                                className="gcp-modal-input"
                                autoFocus
                            />
                            <button type="button" onClick={searchPlace} className="gcp-modal-search-btn">검색</button>
                        </div>

                        {placeResults.length > 0 && (
                            <div style={{ maxHeight: '180px', overflowY: 'auto', borderBottom: '1px solid #f0ece6' }}>
                                {placeResults.map((place, i) => (
                                    <div
                                        key={i}
                                        onClick={() => handlePlaceSelect(place)}
                                        style={{ padding: '11px 20px', cursor: 'pointer', borderBottom: '1px solid #fafaf8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.1s' }}
                                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#fff9f5')}
                                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'white')}
                                    >
                                        <div>
                                            <div style={{ fontWeight: '600', fontSize: '14px', color: '#1a1816' }}>{place.place_name}</div>
                                            <div style={{ fontSize: '12px', color: '#9e9b95', marginTop: '2px' }}>{place.road_address_name || place.address_name}</div>
                                        </div>
                                        <span style={{ color: '#e06c2a', fontSize: '18px' }}>›</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!mapLoaded && (
                            <div style={{ height: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b0aca5' }}>
                                지도를 불러오는 중...
                            </div>
                        )}
                        <div ref={mapRef} style={{ width: '100%', height: '380px', display: mapLoaded ? 'block' : 'none' }} />

                        <div className="gcp-map-footer">
                            <div className={`gcp-map-selected-info${!selectedPlace ? ' placeholder' : ''}`}>
                                {selectedPlace ? `📍 ${selectedPlace.place_name || selectedPlace.road_address_name}` : '지도를 클릭하거나 장소를 검색해 선택하세요'}
                            </div>
                            <button
                                type="button"
                                onClick={confirmPlace}
                                disabled={!selectedPlace}
                                className={`gcp-map-confirm-btn ${selectedPlace ? 'active' : 'disabled'}`}
                            >
                                이 장소로 선택
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default GroupEditPage;