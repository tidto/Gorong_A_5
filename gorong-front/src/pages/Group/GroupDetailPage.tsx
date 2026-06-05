// 경로: src/pages/Group/GroupDetailPage.tsx

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { getMyMiniHomePage } from '../../api/minihome/miniHomeApi';
import { notifyMinihomeUnlocksSync } from '../../utils/minihome/core/minihomeUnlocksSync';
import { invalidateMiniHomeMeCache } from '../../utils/minihome/core/miniHomeMeCache';
import { useChatRoom } from '../../hooks/useChatRoom';
import GroupPublicChatSection from '../../components/GroupPublicChatSection'
import { useCatTowerPreview } from '../../contexts/CatTowerPreviewContext'

const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_API_KEY || '';

declare global { interface Window { kakao: any } }

interface GroupPost {
    id: number
    title: string
    content?: string
    location?: string
    maxCapacity?: number
    currentCapacity?: number
    status?: string
    event?: string
    meetingDate?: string
    meetingTime?: string
    condition?: string
    authorName?: string
    author?: { id?: number; email?: string }
}

interface UserRouteProfile {
    nickname?: string
    baseAddress?: string
    address?: string
    latitude?: number | string | null
    longitude?: number | string | null
}

const toValidNumber = (value: unknown) => {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) && num !== 0 ? num : null;
};

const escapeHtml = (v: string) =>
    v.replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/\"/g,'&quot;')
        .replace(/'/g,'&#39;');

const isDatePassed = (dateStr?: string): boolean => {
    if (!dateStr) return false;
    try {
        const meeting = new Date(dateStr);
        meeting.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return meeting < today;
    } catch { return false; }
};

export default function GroupDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { openCatTower } = useCatTowerPreview();

    const [post, setPost]               = useState<GroupPost | null>(null);
    const [isJoining, setIsJoining]     = useState(false);
    const [isJoined, setIsJoined]       = useState(false);
    // ✅ 인라인 미니맵 + 풀스크린 모달 상태 분리
    const [miniMapReady, setMiniMapReady]   = useState(false);
    const [miniMapError, setMiniMapError]   = useState('');
    const [miniMapLoading, setMiniMapLoading] = useState(false);
    const [showFullMap, setShowFullMap]     = useState(false);
    const [fullMapLoading, setFullMapLoading] = useState(false);
    const [fullMapError, setFullMapError]   = useState('');
    const [routeTarget, setRouteTarget]     = useState<{ lat: number; lng: number; name: string } | null>(null);
    const [userRouteProfile, setUserRouteProfile] = useState<UserRouteProfile | null>(null);

    // ✅ 인라인 미니맵용 ref, 풀스크린 맵용 ref 별도
    const miniMapContainerRef = useRef<HTMLDivElement>(null);
    const fullMapContainerRef = useRef<HTMLDivElement>(null);
    const miniMapMarkerRef    = useRef<any>(null);
    const fullMapMarkerRef    = useRef<any>(null);
    // 지오코딩 결과를 캐시해서 중복 요청 방지
    const resolvedPosRef      = useRef<any>(null);

    const { isMyGroup } = useChatRoom();

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, [id]);

    useEffect(() => {
        if (!id) return;
        // 그룹 상세 + 참여 여부를 동시에 요청 (순차→병렬 최적화)
        Promise.all([
            axiosInstance.get<GroupPost>(`/groups/${id}`),
            axiosInstance.get<number[]>('/groups/joined-ids'),
        ])
            .then(([postRes, idsRes]) => {
                setPost(postRes.data);
                setIsJoined(idsRes.data.includes(Number(id)));
            })
            .catch(() => navigate('/group', { replace: true }));
    }, [id, navigate]);

    useEffect(() => {
        axiosInstance.get<UserRouteProfile>('/v1/users/me')
            .then(res => setUserRouteProfile(res.data))
            .catch(() => setUserRouteProfile(null));
    }, []);

    const canEdit = post
        ? isMyGroup({ authorEmail: post.author?.email, authorName: post.authorName })
        : false;

    const handleLeave = useCallback(async () => {
        if (!window.confirm('정말 참여를 취소하시겠습니까?')) return;
        try {
            await axiosInstance.delete(`/groups/${id}/leave`);
            setIsJoined(false);
            setPost(prev => prev
                ? { ...prev, currentCapacity: Math.max(0, (prev.currentCapacity ?? 1) - 1) }
                : prev
            );
            if (post?.event) {
                try {
                    await axiosInstance.delete(`/event-participation/group/${id}`, {
                        params: { eventContentId: post.event },
                    });
                } catch { /* 이력 취소 실패는 무시 */ }
            }
        } catch (err: any) {
            const status = err?.response?.status;
            if (status === 401) alert('로그인이 필요합니다.');
            else alert('참여 취소 중 오류가 발생했습니다.');
        }
    }, [id, post]);

    const handleJoin = useCallback(async () => {
        try {
            setIsJoining(true);
            await axiosInstance.put(`/groups/${id}/join`);
            setIsJoined(true);
            setPost(prev => prev
                ? { ...prev, currentCapacity: (prev.currentCapacity ?? 0) + 1 }
                : prev
            );
            if (post?.event) {
                try {
                    await axiosInstance.post(`/event-participation/group/${id}`, {
                        eventContentId: post.event,
                        eventTitle: post.title,
                    });
                } catch { /* silent fail */ }
            }
            try {
                invalidateMiniHomeMeCache();
                await getMyMiniHomePage();
                notifyMinihomeUnlocksSync();
            } catch { /* 해금 동기화 실패는 참여 성공과 분리 */ }
        } catch (err: any) {
            const status = err?.response?.status;
            if (status === 401) alert('로그인이 필요합니다.');
            else alert('참여 신청 중 오류가 발생했습니다.');
        } finally {
            setIsJoining(false);
        }
    }, [id, post]);

    const handleDelete = useCallback(async () => {
        if (!canEdit) return;
        if (!window.confirm('정말 이 모집글을 삭제하시겠습니까?')) return;
        try {
            await axiosInstance.delete(`/groups/${id}`);
            navigate('/group', { replace: true });
        } catch {
            alert('삭제 중 오류가 발생했습니다.');
        }
    }, [id, canEdit, navigate]);

    const loadKakaoSdk = useCallback(() => {
        if (window.kakao?.maps?.services) return Promise.resolve();
        return new Promise<void>((resolve, reject) => {
            const existing = document.getElementById('kakao-sdk-detail') as HTMLScriptElement | null;
            if (existing) {
                window.kakao?.maps?.load ? window.kakao.maps.load(resolve)
                    : existing.addEventListener('load', () => window.kakao.maps.load(resolve), { once: true });
                return;
            }
            const s = document.createElement('script');
            s.id = 'kakao-sdk-detail';
            s.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false&libraries=services`;
            s.onload = () => window.kakao.maps.load(resolve);
            s.onerror = () => reject(new Error('kakao sdk load failed'));
            document.head.appendChild(s);
        });
    }, []);

    // ✅ 공통 지오코딩 (캐시)
    const resolvePosition = useCallback(async (loc: string) => {
        if (resolvedPosRef.current) return resolvedPosRef.current;
        await loadKakaoSdk();
        const geocoder = new window.kakao.maps.services.Geocoder();
        const places   = new window.kakao.maps.services.Places();
        const pos = await new Promise<any>((res, rej) => {
            geocoder.addressSearch(loc, (r: any, s: any) => {
                if (s === window.kakao.maps.services.Status.OK && r.length > 0)
                    return res(new window.kakao.maps.LatLng(+r[0].y, +r[0].x));
                places.keywordSearch(loc, (pr: any, ps: any) => {
                    ps === window.kakao.maps.services.Status.OK && pr.length > 0
                        ? res(new window.kakao.maps.LatLng(+pr[0].y, +pr[0].x))
                        : rej(new Error('not found'));
                });
            });
        });
        resolvedPosRef.current = pos;
        return pos;
    }, [loadKakaoSdk]);

    // ✅ 인라인 미니맵 렌더 (post.location 변경 시 자동 실행)
    useEffect(() => {
        if (!post?.location || !miniMapContainerRef.current) return;
        let cancelled = false;
        const loc = post.location.trim();

        const render = async () => {
            setMiniMapLoading(true);
            setMiniMapError('');
            try {
                const pos = await resolvePosition(loc);
                if (cancelled || !miniMapContainerRef.current) return;

                setRouteTarget({ lat: pos.getLat(), lng: pos.getLng(), name: post.title || loc });

                const map = new window.kakao.maps.Map(miniMapContainerRef.current, {
                    center: pos,
                    level: 3,
                    draggable: false,   // 미니맵은 인터랙션 제한
                    scrollwheel: false,
                    disableDoubleClickZoom: true,
                });
                if (miniMapMarkerRef.current) miniMapMarkerRef.current.setMap(null);
                miniMapMarkerRef.current = new window.kakao.maps.Marker({ position: pos, map });
                new window.kakao.maps.InfoWindow({
                    content: `<div style="padding:6px 10px;font-size:12px;font-weight:700;white-space:nowrap;">${escapeHtml(loc)}</div>`,
                }).open(map, miniMapMarkerRef.current);
                if (!cancelled) setMiniMapReady(true);
            } catch {
                if (!cancelled) setMiniMapError('위치를 지도에서 찾지 못했습니다.');
            } finally {
                if (!cancelled) setMiniMapLoading(false);
            }
        };

        render();
        return () => { cancelled = true; };
    }, [post?.location, resolvePosition, post?.title]);

    // ✅ 풀스크린 지도 모달 렌더
    useEffect(() => {
        if (!showFullMap || !post?.location || !fullMapContainerRef.current) return;
        let cancelled = false;
        const loc = post.location.trim();

        const render = async () => {
            setFullMapLoading(true);
            setFullMapError('');
            try {
                const pos = await resolvePosition(loc);
                if (cancelled || !fullMapContainerRef.current) return;

                const map = new window.kakao.maps.Map(fullMapContainerRef.current, { center: pos, level: 3 });
                if (fullMapMarkerRef.current) fullMapMarkerRef.current.setMap(null);
                fullMapMarkerRef.current = new window.kakao.maps.Marker({ position: pos, map });
                new window.kakao.maps.InfoWindow({
                    content: `<div style="padding:8px 12px;font-size:13px;font-weight:700;white-space:nowrap;">${escapeHtml(loc)}</div>`,
                }).open(map, fullMapMarkerRef.current);
            } catch {
                if (!cancelled) setFullMapError('위치를 지도에서 찾지 못했습니다.');
            } finally {
                if (!cancelled) setFullMapLoading(false);
            }
        };

        render();
        return () => { cancelled = true; };
    }, [showFullMap, post?.location, resolvePosition]);

    const handleOpenKakaoMapRoute = useCallback(async () => {
        if (!post?.location) return;

        if (!routeTarget) {
            window.open(`https://map.kakao.com/link/search/${encodeURIComponent(post.location)}`, '_blank');
            return;
        }

        const startAddress = (userRouteProfile?.baseAddress || userRouteProfile?.address || '').trim();
        const startLat = toValidNumber(userRouteProfile?.latitude);
        const startLng = toValidNumber(userRouteProfile?.longitude);
        let startTarget = startLat && startLng
            ? {
                lat: startLat,
                lng: startLng,
                name: userRouteProfile?.nickname ? `${userRouteProfile.nickname} 주소` : '내 주소',
            }
            : null;

        if (!startTarget && startAddress) {
            try {
                await loadKakaoSdk();
                const geocoder = new window.kakao.maps.services.Geocoder();
                startTarget = await new Promise<{ lat: number; lng: number; name: string } | null>((resolve) => {
                    geocoder.addressSearch(startAddress, (result: any, status: any) => {
                        if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
                            resolve({ lat: Number(result[0].y), lng: Number(result[0].x), name: '내 주소' });
                            return;
                        }
                        resolve(null);
                    });
                });
            } catch {
                startTarget = null;
            }
        }

        if (!startTarget) {
            alert('마이페이지에 저장된 주소를 찾을 수 없어 목적지만 길찾기로 열게요.');
            window.open(`https://map.kakao.com/link/to/${encodeURIComponent(routeTarget.name)},${routeTarget.lat},${routeTarget.lng}`, '_blank');
            return;
        }

        const url = `https://map.kakao.com/link/from/${encodeURIComponent(startTarget.name)},${startTarget.lat},${startTarget.lng}/to/${encodeURIComponent(routeTarget.name)},${routeTarget.lat},${routeTarget.lng}`;
        window.open(url, '_blank');
    }, [loadKakaoSdk, post?.location, routeTarget, userRouteProfile]);

    if (!post) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', fontFamily: 'Pretendard, sans-serif' }}>
                <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                    <p style={{ fontSize: '15px' }}>불러오는 중...</p>
                </div>
            </div>
        );
    }

    const current  = post.currentCapacity ?? 0;
    const max      = post.maxCapacity ?? 4;
    const isFull    = current >= max;
    const isPassed  = isDatePassed(post.meetingDate);
    const isClosed  = post.status === 'CLOSED' || isPassed;
    const pct      = Math.min(100, Math.round((current / max) * 100));

    const actionButtons = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {!canEdit && (
                isJoined ? (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => navigate(`/chat/${post.id}`)}
                            style={{ flex: 1, padding: '17px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', fontWeight: '800', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                            채팅방 입장하기
                        </button>
                        <button
                            onClick={handleLeave}
                            style={{ padding: '17px 20px', borderRadius: '14px', border: '2px solid #fee2e2', backgroundColor: 'white', color: '#ef4444', fontWeight: '800', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                            참여 취소
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleJoin}
                        disabled={isClosed || isFull || isJoining}
                        style={{ width: '100%', padding: '17px', borderRadius: '14px', border: 'none', background: isClosed || isJoining ? '#e2e8f0' : 'linear-gradient(135deg, #ff8a3d, #ff5e00)', color: isClosed || isJoining ? '#94a3b8' : 'white', fontWeight: '800', fontSize: '16px', cursor: isClosed || isJoining ? 'default' : 'pointer' }}
                    >
                        {isJoining ? '신청 중...' : isClosed ? '모집이 마감되었습니다' : isFull ? '정원이 모두 찼습니다' : '참여 신청하기'}
                    </button>
                )
            )}

            {canEdit && (
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => navigate(`/chat/${post.id}`)}
                        style={{ flex: 1, padding: '16px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', fontWeight: '800', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                        채팅방
                    </button>
                    <button
                        onClick={() => navigate(`/groups/edit/${post.id}`)}
                        style={{ flex: 1, padding: '16px', borderRadius: '14px', border: 'none', backgroundColor: '#f1f5f9', color: '#64748b', fontWeight: '800', fontSize: '15px', cursor: 'pointer' }}
                    >
                        수정
                    </button>
                    <button
                        onClick={handleDelete}
                        style={{ flex: 1, padding: '16px', borderRadius: '14px', border: 'none', backgroundColor: '#fee2e2', color: '#ef4444', fontWeight: '800', fontSize: '15px', cursor: 'pointer' }}
                    >
                        삭제
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Pretendard, sans-serif', paddingBottom: '80px', marginTop: '-64px' }}>

            {/* ── 히어로 헤더 ── */}
            <div style={{ background: 'linear-gradient(135deg, #ff8a3d 0%, #ff5e00 100%)', padding: '80px 20px 40px', position: 'relative' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <button
                        onClick={() => navigate('/group')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.18)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', marginBottom: '24px' }}
                    >
                        ← 목록으로
                    </button>

                    <div style={{ marginBottom: '12px' }}>
                        <span style={{
                            display: 'inline-block',
                            backgroundColor: isClosed ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.9)',
                            color: isClosed ? 'white' : '#ff8a3d',
                            padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '800',
                        }}>
                            {isClosed ? '모집완료' : post.status === 'IN_PROGRESS' ? '🟡 진행중' : '🟢 모집중'}
                        </span>
                        {canEdit && (
                            <span style={{ marginLeft: '8px', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                                내 글
                            </span>
                        )}
                    </div>

                    <h1 style={{ fontSize: '28px', fontWeight: '900', color: 'white', margin: '0 0 16px', lineHeight: '1.3' }}>
                        {post.title}
                    </h1>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '14px', color: 'rgba(255,255,255,0.88)' }}>
                        <span>
                            👤 호스트:{' '}
                            {post.author?.id ? (
                                <button
                                    type="button"
                                    onClick={() => post.author?.id && openCatTower(post.author.id)}
                                    style={{ border: 'none', background: 'transparent', padding: 0, color: 'white', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px' }}
                                >
                                    {post.authorName || '익명'}
                                </button>
                            ) : (
                                <strong style={{ color: 'white' }}>{post.authorName || '익명'}</strong>
                            )}
                        </span>
                        {post.event && <span>🎟️ {post.event}</span>}
                        {post.meetingDate && <span>📅 {post.meetingDate}</span>}
                    </div>
                </div>
            </div>

            {/* ── 2컬럼 메인 레이아웃 ── */}
            <div style={{
                maxWidth: '1200px',
                margin: '32px auto 0',
                padding: '0 20px',
                display: 'grid',
                gridTemplateColumns: '1fr 480px',
                gap: '28px',
                alignItems: 'stretch',
            }}>

                {/* ── 왼쪽: 상세 그룹 정보 ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* 정원 진행 바 카드 */}
                    <div style={{ backgroundColor: 'white', borderRadius: '18px', padding: '20px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>참여 현황</span>
                                <span style={{ fontSize: '13px', fontWeight: '800', color: isFull ? '#94a3b8' : '#ff8a3d' }}>
                                    {current} / {max}명
                                </span>
                            </div>
                            <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, backgroundColor: isFull ? '#cbd5e1' : '#ff8a3d', borderRadius: '99px', transition: 'width 0.4s ease' }} />
                            </div>
                        </div>
                        <div style={{ textAlign: 'center', flexShrink: 0 }}>
                            <div style={{ fontSize: '22px', fontWeight: '900', color: isFull ? '#94a3b8' : '#ff8a3d' }}>{pct}%</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>모집률</div>
                        </div>
                    </div>

                    {/* 모임 정보 그리드 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {[
                            { icon: '📍', label: '모임 장소', value: post.location || '미정', highlight: true },
                            { icon: '⏰', label: '모임 시간', value: post.meetingTime || '미정' },
                            { icon: '📅', label: '모임 날짜', value: post.meetingDate || '미정' },
                            { icon: '📋', label: '참여 조건', value: post.condition || '제한 없음' },
                        ].map(({ icon, label, value, highlight }) => (
                            <div key={label} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '18px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', borderLeft: highlight ? '3px solid #ff8a3d' : '3px solid #f1f5f9' }}>
                                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700', marginBottom: '6px' }}>{icon} {label}</div>
                                <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: '700', wordBreak: 'break-all' }}>{value}</div>
                            </div>
                        ))}
                    </div>

                    {/* ✅ 인라인 미니맵 카드 (항상 표시, 클릭 시 풀스크린) */}
                    {post.location && (
                        <div style={{ backgroundColor: 'white', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', position: 'relative' }}>
                            {/* 미니맵 헤더 */}
                            <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                    <span style={{ fontSize: '14px' }}>🗺️</span>
                                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>모임 위치</span>
                                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>{post.location}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowFullMap(true)}
                                    style={{ fontSize: '11px', fontWeight: '700', color: '#ff8a3d', background: '#fff4ed', border: 'none', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer' }}
                                >
                                    크게 보기 ↗
                                </button>
                            </div>

                            {/* 미니맵 본체 — 클릭하면 풀스크린 오픈 */}
                            <div
                                onClick={() => setShowFullMap(true)}
                                style={{ position: 'relative', cursor: 'pointer' }}
                            >
                                <div
                                    ref={miniMapContainerRef}
                                    style={{ width: '100%', height: '200px', backgroundColor: '#f8fafc' }}
                                />
                                {/* 로딩 오버레이 */}
                                {miniMapLoading && (
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(248,250,252,0.85)', fontWeight: '700', color: '#64748b', fontSize: '13px', gap: '8px' }}>
                                        <span style={{ fontSize: '18px' }}>⏳</span> 지도 불러오는 중...
                                    </div>
                                )}
                                {miniMapError && (
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.92)', color: '#ef4444', fontWeight: '700', textAlign: 'center', padding: '20px', fontSize: '13px' }}>
                                        {miniMapError}
                                    </div>
                                )}
                                {/* 클릭 힌트 오버레이 (지도 준비된 경우만) */}
                                {miniMapReady && !miniMapLoading && !miniMapError && (
                                    <div style={{
                                        position: 'absolute', bottom: '10px', right: '10px',
                                        backgroundColor: 'rgba(15,23,42,0.65)', color: 'white',
                                        fontSize: '11px', fontWeight: '700',
                                        padding: '5px 10px', borderRadius: '8px',
                                        pointerEvents: 'none',
                                    }}>
                                        클릭하면 크게 볼 수 있어요
                                    </div>
                                )}
                            </div>

                            {/* 길찾기 버튼 */}
                            <div style={{ padding: '12px 14px' }}>
                                <button
                                    type="button"
                                    onClick={handleOpenKakaoMapRoute}
                                    disabled={miniMapLoading || !!miniMapError}
                                    style={{
                                        width: '100%',
                                        padding: '13px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        backgroundColor: miniMapLoading || miniMapError ? '#e2e8f0' : '#111827',
                                        color: miniMapLoading || miniMapError ? '#94a3b8' : 'white',
                                        fontWeight: '800',
                                        fontSize: '13px',
                                        cursor: miniMapLoading || miniMapError ? 'default' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                    }}
                                >
                                    <span>🚗</span>
                                    <span>카카오맵으로 길찾기</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 모임 소개 */}
                    {post.content && (
                        <div style={{ backgroundColor: 'white', borderRadius: '18px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
                            <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '700', marginBottom: '12px' }}>📝 모임 소개</div>
                            <p style={{ fontSize: '15px', color: '#334155', lineHeight: '1.8', margin: 0, whiteSpace: 'pre-wrap' }}>
                                {post.content}
                            </p>
                        </div>
                    )}

                    {/* 액션 버튼 */}
                    <div style={{ marginTop: 'auto' }}>
                        {actionButtons}
                    </div>
                </div>

                {/* ── 오른쪽: 공개 채팅방 ── */}
                <div style={{ alignSelf: 'start', position: 'sticky', top: '80px' }}>
                    <GroupPublicChatSection groupId={post.id} isClosed={isClosed} groupTitle={post.title} />
                </div>
            </div>

            {/* ✅ 풀스크린 지도 모달 */}
            {showFullMap && (
                <div
                    onClick={() => setShowFullMap(false)}
                    style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '20px' }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{ width: '800px', maxWidth: '96vw', maxHeight: '90vh', backgroundColor: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(15,23,42,0.3)', display: 'flex', flexDirection: 'column' }}
                    >
                        {/* 모달 헤더 */}
                        <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #ff8a3d, #ff5e00)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexShrink: 0 }}>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '16px', fontWeight: '900', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</div>
                                <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {post.location}</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowFullMap(false)}
                                style={{ border: 'none', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', padding: '6px 14px', cursor: 'pointer', fontWeight: '800', flexShrink: 0 }}
                            >
                                닫기
                            </button>
                        </div>

                        {/* 풀사이즈 지도 */}
                        <div style={{ position: 'relative', flex: 1, minHeight: '400px' }}>
                            <div ref={fullMapContainerRef} style={{ width: '100%', height: '460px', backgroundColor: '#f8fafc' }} />
                            {fullMapLoading && (
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(248,250,252,0.85)', fontWeight: '700', color: '#64748b' }}>
                                    지도를 불러오는 중...
                                </div>
                            )}
                            {fullMapError && (
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.92)', color: '#ef4444', fontWeight: '700', textAlign: 'center', padding: '20px' }}>
                                    {fullMapError}
                                </div>
                            )}
                        </div>

                        {/* 길찾기 버튼 */}
                        <div style={{ padding: '14px 16px', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
                            <button
                                type="button"
                                onClick={handleOpenKakaoMapRoute}
                                disabled={fullMapLoading || !!fullMapError}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    borderRadius: '14px',
                                    border: 'none',
                                    backgroundColor: fullMapLoading || fullMapError ? '#e2e8f0' : '#111827',
                                    color: fullMapLoading || fullMapError ? '#94a3b8' : 'white',
                                    fontWeight: '800',
                                    fontSize: '14px',
                                    cursor: fullMapLoading || fullMapError ? 'default' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                }}
                            >
                                <span>🚗</span>
                                <span>카카오맵으로 실시간 길찾기 및 이동 경로 보기</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
