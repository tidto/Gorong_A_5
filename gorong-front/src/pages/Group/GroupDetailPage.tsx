// 경로: src/pages/Group/GroupDetailPage.tsx

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useChatRoom } from '../../hooks/useChatRoom';
import GroupPublicChatSection from '../../components/GroupPublicChatSection'
import { useCatTowerPreview } from '../../contexts/CatTowerPreviewContext'
import { useChatNotification } from '../../contexts/ChatNotificationContext'; // ✅ [추가]

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
    const { addGroupSubscription } = useChatNotification(); // ✅ [추가]

    const [post, setPost]               = useState<GroupPost | null>(null);
    const [isJoining, setIsJoining]     = useState(false);
    const [isJoined, setIsJoined]       = useState(false);
    const [showPostReportModal, setShowPostReportModal] = useState(false);
    const [postReportReason, setPostReportReason]       = useState('');
    const [postReporting, setPostReporting]             = useState(false);
    const [miniMapReady, setMiniMapReady]   = useState(false);
    const [miniMapError, setMiniMapError]   = useState('');
    const [miniMapLoading, setMiniMapLoading] = useState(false);
    const [showFullMap, setShowFullMap]     = useState(false);
    const [fullMapLoading, setFullMapLoading] = useState(false);
    const [fullMapError, setFullMapError]   = useState('');
    const [routeTarget, setRouteTarget]     = useState<{ lat: number; lng: number; name: string } | null>(null);
    const [userRouteProfile, setUserRouteProfile] = useState<UserRouteProfile | null>(null);

    const miniMapContainerRef = useRef<HTMLDivElement>(null);
    const fullMapContainerRef = useRef<HTMLDivElement>(null);
    const miniMapMarkerRef    = useRef<any>(null);
    const fullMapMarkerRef    = useRef<any>(null);
    const resolvedPosRef      = useRef<any>(null);

    const { isMyGroup } = useChatRoom();

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, [id]);

    useEffect(() => {
        if (!id) return;
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

            // ✅ [추가] 참여 신청 완료 후 해당 그룹 채팅 토픽 즉시 구독
            if (post?.id && post?.title) {
                await addGroupSubscription(post.id, post.title);
            }

            if (post?.event) {
                try {
                    await axiosInstance.post(`/event-participation/group/${id}`, {
                        eventContentId: post.event,
                        eventTitle: post.title,
                    });
                } catch { /* silent fail */ }
            }
        } catch (err: any) {
            const status = err?.response?.status;
            if (status === 401) alert('로그인이 필요합니다.');
            else alert('참여 신청 중 오류가 발생했습니다.');
        } finally {
            setIsJoining(false);
        }
    }, [id, post, addGroupSubscription]); // ✅ [추가] addGroupSubscription 의존성 추가

    const handlePostReport = useCallback(async () => {
        if (!post?.author?.id) {
            alert('신고할 수 없는 게시글입니다.');
            return;
        }
        if (!postReportReason.trim()) {
            alert('신고 사유를 입력해주세요.');
            return;
        }
        setPostReporting(true);
        try {
            await axiosInstance.post('/api/v1/users/report', {
                reportedUserId: post.author.id,
                reason: postReportReason.trim(),
            });
            alert('신고가 접수되었습니다. 관리자가 검토 후 처리합니다.');
            setShowPostReportModal(false);
            setPostReportReason('');
        } catch (e: any) {
            alert(e?.response?.data?.message || '신고 접수에 실패했습니다.');
        } finally {
            setPostReporting(false);
        }
    }, [post, postReportReason]);

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
                    draggable: false,
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

    // ── 카드 공통 스타일 ──
    const card: React.CSSProperties = {
        backgroundColor: 'white',
        borderRadius: '18px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        overflow: 'hidden',
    };

    return (
        <div style={{ backgroundColor: '#f5f5f0', minHeight: '100vh', fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif", paddingBottom: '80px', marginTop: '-64px' }}>

            {/* ══════════════════════════════════════════
                히어로 헤더 — 더 크고 정보 밀도 높게
            ══════════════════════════════════════════ */}
            <div style={{ background: 'linear-gradient(135deg, #ff8a3d 0%, #ff5e00 100%)', padding: '88px 40px 48px', position: 'relative' }}>
                {/* 배경 장식 원 */}
                <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '320px', height: '320px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '-80px', left: '10%', width: '200px', height: '200px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

                <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative' }}>
                    {/* 뒤로가기 */}
                    <button
                        onClick={() => navigate('/group')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.18)', border: 'none', color: 'white', padding: '9px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', marginBottom: '28px', backdropFilter: 'blur(4px)', transition: 'background 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.28)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.18)' }}
                    >
                        ← 목록으로
                    </button>

                    {/* 배지 행 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            backgroundColor: isClosed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.92)',
                            color: isClosed ? 'white' : '#ff5e00',
                            padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '800',
                        }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: isClosed ? 'rgba(255,255,255,0.7)' : '#ff5e00', display: 'inline-block' }} />
                            {isClosed ? '모집완료' : post.status === 'IN_PROGRESS' ? '진행중' : '모집중'}
                        </span>
                        {canEdit && (
                            <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                                내 글
                            </span>
                        )}
                        {post.event && (
                            <span style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                                🎟️ {post.event}
                            </span>
                        )}
                        {/* 신고 버튼 */}
                        {post.author?.id && !canEdit && (
                            <button
                                type="button"
                                onClick={() => setShowPostReportModal(true)}
                                style={{ marginLeft: 'auto', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '8px', background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)', fontSize: '12px', fontWeight: '700', padding: '6px 14px', cursor: 'pointer', transition: 'background 0.2s' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.5)' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)' }}
                            >
                                🚨 신고
                            </button>
                        )}
                    </div>

                    {/* 제목 */}
                    <h1 style={{ fontSize: '34px', fontWeight: '900', color: 'white', margin: '0 0 20px', lineHeight: '1.25', maxWidth: '760px' }}>
                        {post.title}
                    </h1>

                    {/* 메타 정보 행 */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', fontSize: '14px', color: 'rgba(255,255,255,0.88)', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            👤 호스트:{' '}
                            {post.author?.id ? (
                                <button
                                    type="button"
                                    onClick={() => post.author?.id && openCatTower(post.author.id)}
                                    style={{ border: 'none', background: 'transparent', padding: 0, color: 'white', fontWeight: '800', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px', fontSize: '14px' }}
                                >
                                    {post.authorName || '익명'}
                                </button>
                            ) : (
                                <strong style={{ color: 'white', fontWeight: '800' }}>{post.authorName || '익명'}</strong>
                            )}
                        </span>
                        {post.meetingDate && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                📅 {post.meetingDate}
                                {post.meetingTime && ` ${post.meetingTime}`}
                            </span>
                        )}
                        {post.location && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                📍 {post.location}
                            </span>
                        )}
                    </div>

                    {/* 참여 현황 바 — 헤더 하단 */}
                    <div style={{ marginTop: '28px', display: 'flex', alignItems: 'center', gap: '16px', maxWidth: '560px' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '99px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, backgroundColor: 'white', borderRadius: '99px', transition: 'width 0.4s ease' }} />
                            </div>
                        </div>
                        <span style={{ fontSize: '15px', fontWeight: '900', color: 'white', flexShrink: 0 }}>{current}/{max}명 ({pct}%)</span>
                    </div>
                </div>
            </div>

            {/* ── 게시글 신고 모달 ── */}
            {showPostReportModal && (
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => { setShowPostReportModal(false); setPostReportReason(''); }}
                >
                    <div
                        style={{ background: 'white', borderRadius: '20px', padding: '28px 24px', width: '360px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: '800', color: '#1e293b' }}>🚨 게시글 신고</h3>
                        <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#64748b', lineHeight: '1.6' }}>
                            <strong>{post?.authorName || '이 유저'}</strong>의 게시글을 신고합니다.<br />
                            허위 신고 시 불이익이 생길 수 있습니다.
                        </p>
                        <textarea
                            value={postReportReason}
                            onChange={e => setPostReportReason(e.target.value)}
                            placeholder="신고 사유를 입력해주세요 (필수)"
                            maxLength={300}
                            rows={4}
                            style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '10px 12px', fontSize: '13px', resize: 'none', outline: 'none', fontFamily: 'inherit', color: '#1e293b' }}
                        />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                            <button onClick={() => { setShowPostReportModal(false); setPostReportReason(''); }}
                                    style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                                취소
                            </button>
                            <button onClick={handlePostReport} disabled={postReporting || !postReportReason.trim()}
                                    style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: postReporting || !postReportReason.trim() ? '#e2e8f0' : 'linear-gradient(135deg, #ef4444, #dc2626)', color: postReporting || !postReportReason.trim() ? '#94a3b8' : 'white', fontWeight: '800', fontSize: '13px', cursor: postReporting || !postReportReason.trim() ? 'default' : 'pointer' }}>
                                {postReporting ? '신고 중...' : '신고 접수'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════
                본문 — 2컬럼: 좌(정보·소개·지도) | 우(참여카드·채팅)
            ══════════════════════════════════════════ */}
            <div style={{
                maxWidth: '1280px',
                margin: '36px auto 0',
                padding: '0 40px',
                display: 'grid',
                gridTemplateColumns: '1fr 460px',
                gap: '28px',
                alignItems: 'start',
            }}>

                {/* ── 왼쪽 컬럼 ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* 모임 정보 카드 — 4칸 그리드 */}
                    <div style={{ ...card, padding: '28px 32px' }}>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '20px' }}>
                            모임 정보
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            {[
                                { icon: '📍', label: '모임 장소', value: post.location || '미정', accent: true },
                                { icon: '📅', label: '모임 날짜', value: post.meetingDate || '미정', accent: false },
                                { icon: '⏰', label: '모임 시간', value: post.meetingTime || '미정', accent: false },
                            ].map(({ icon, label, value, accent }) => (
                                <div key={label} style={{
                                    padding: '18px 20px',
                                    backgroundColor: accent ? '#fff8f4' : '#faf9f7',
                                    borderRadius: '14px',
                                    border: `1.5px solid ${accent ? '#ffd4b0' : '#ebe8e3'}`,
                                }}>
                                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '7px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {icon} {label}
                                    </div>
                                    <div style={{ fontSize: '16px', color: accent ? '#ff5e00' : '#1e293b', fontWeight: '800', wordBreak: 'break-all', lineHeight: 1.35 }}>
                                        {value}
                                    </div>
                                </div>
                            ))}
                            {/* 참여 조건 — 태그 칩 */}
                            <div style={{
                                padding: '18px 20px',
                                backgroundColor: '#faf9f7',
                                borderRadius: '14px',
                                border: '1.5px solid #ebe8e3',
                            }}>
                                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '7px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    📋 참여 조건
                                </div>
                                {(() => {
                                    const tags = (post.condition || '').split(' ').map(t => t.trim()).filter(Boolean);
                                    if (tags.length === 0) {
                                        return (
                                            <div style={{ fontSize: '16px', color: '#1e293b', fontWeight: '800', lineHeight: 1.35 }}>
                                                제한 없음
                                            </div>
                                        );
                                    }
                                    return (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {tags.map((tag, i) => (
                                                <span key={i} style={{
                                                    display: 'inline-block',
                                                    padding: '3px 10px',
                                                    borderRadius: '20px',
                                                    backgroundColor: '#fff0e6',
                                                    color: '#ff5e00',
                                                    fontSize: '12px',
                                                    fontWeight: '700',
                                                }}>
                                                    {tag.startsWith('#') ? tag : `#${tag}`}
                                                </span>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* 모임 소개 카드 */}
                    {post.content && (
                        <div style={{ ...card, padding: '28px 32px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px' }}>
                                모임 소개
                            </div>
                            <p style={{ fontSize: '15px', color: '#334155', lineHeight: '1.85', margin: 0, whiteSpace: 'pre-wrap' }}>
                                {post.content}
                            </p>
                        </div>
                    )}

                    {/* 지도 카드 */}
                    {post.location && (
                        <div style={{ ...card }}>
                            <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0eee9' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '16px' }}>🗺️</span>
                                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#334155' }}>모임 위치</span>
                                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>{post.location}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowFullMap(true)}
                                    style={{ fontSize: '12px', fontWeight: '700', color: '#ff8a3d', background: '#fff4ed', border: 'none', borderRadius: '9px', padding: '6px 12px', cursor: 'pointer', transition: 'background 0.15s' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#ffe5cc' }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff4ed' }}
                                >
                                    크게 보기 ↗
                                </button>
                            </div>

                            <div onClick={() => setShowFullMap(true)} style={{ position: 'relative', cursor: 'pointer' }}>
                                <div ref={miniMapContainerRef} style={{ width: '100%', height: '260px', backgroundColor: '#f8fafc' }} />
                                {miniMapLoading && (
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(248,250,252,0.85)', fontWeight: '700', color: '#64748b', fontSize: '13px', gap: '8px' }}>
                                        <span>⏳</span> 지도 불러오는 중...
                                    </div>
                                )}
                                {miniMapError && (
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.92)', color: '#ef4444', fontWeight: '700', textAlign: 'center', padding: '20px', fontSize: '13px' }}>
                                        {miniMapError}
                                    </div>
                                )}
                                {miniMapReady && !miniMapLoading && !miniMapError && (
                                    <div style={{ position: 'absolute', bottom: '12px', right: '12px', backgroundColor: 'rgba(15,23,42,0.65)', color: 'white', fontSize: '11px', fontWeight: '700', padding: '5px 10px', borderRadius: '8px', pointerEvents: 'none' }}>
                                        클릭하면 크게 볼 수 있어요
                                    </div>
                                )}
                            </div>

                            <div style={{ padding: '16px 20px' }}>
                                <button
                                    type="button"
                                    onClick={handleOpenKakaoMapRoute}
                                    disabled={miniMapLoading || !!miniMapError}
                                    style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: miniMapLoading || miniMapError ? '#e2e8f0' : '#111827', color: miniMapLoading || miniMapError ? '#94a3b8' : 'white', fontWeight: '800', fontSize: '14px', cursor: miniMapLoading || miniMapError ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', transition: 'background 0.15s' }}
                                    onMouseEnter={e => { if (!miniMapLoading && !miniMapError) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1e293b' }}
                                    onMouseLeave={e => { if (!miniMapLoading && !miniMapError) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#111827' }}
                                >
                                    🚗 카카오맵으로 길찾기
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── 오른쪽 컬럼 — sticky ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '80px' }}>

                    {/* 참여 액션 카드 */}
                    <div style={{ ...card, padding: '24px' }}>
                        {/* 참여 현황 */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>참여 현황</span>
                                <span style={{ fontSize: '15px', fontWeight: '900', color: isFull ? '#94a3b8' : '#ff8a3d' }}>{current} / {max}명</span>
                            </div>
                            <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, backgroundColor: isFull ? '#cbd5e1' : '#ff8a3d', borderRadius: '99px', transition: 'width 0.4s ease' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: isFull ? '#94a3b8' : '#ff8a3d' }}>{pct}% 모집</span>
                            </div>
                        </div>

                        {/* 액션 버튼 */}
                        {actionButtons}
                    </div>

                    {/* 공개 채팅방 */}
                    <GroupPublicChatSection groupId={post.id} isClosed={isClosed} groupTitle={post.title} />
                </div>
            </div>

            {/* ── 풀스크린 지도 모달 ── */}
            {showFullMap && (
                <div
                    onClick={() => setShowFullMap(false)}
                    style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '24px' }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{ width: '900px', maxWidth: '96vw', maxHeight: '90vh', backgroundColor: 'white', borderRadius: '22px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(15,23,42,0.3)', display: 'flex', flexDirection: 'column' }}
                    >
                        <div style={{ padding: '18px 24px', background: 'linear-gradient(135deg, #ff8a3d, #ff5e00)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexShrink: 0 }}>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '17px', fontWeight: '900', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</div>
                                <div style={{ fontSize: '13px', opacity: 0.85, marginTop: '3px' }}>📍 {post.location}</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowFullMap(false)}
                                style={{ border: 'none', borderRadius: '9px', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', padding: '7px 18px', cursor: 'pointer', fontWeight: '800', flexShrink: 0, fontSize: '14px' }}
                            >
                                닫기
                            </button>
                        </div>

                        <div style={{ position: 'relative', flex: 1, minHeight: '440px' }}>
                            <div ref={fullMapContainerRef} style={{ width: '100%', height: '500px', backgroundColor: '#f8fafc' }} />
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

                        <div style={{ padding: '16px 20px', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
                            <button
                                type="button"
                                onClick={handleOpenKakaoMapRoute}
                                disabled={fullMapLoading || !!fullMapError}
                                style={{ width: '100%', padding: '15px', borderRadius: '14px', border: 'none', backgroundColor: fullMapLoading || fullMapError ? '#e2e8f0' : '#111827', color: fullMapLoading || fullMapError ? '#94a3b8' : 'white', fontWeight: '800', fontSize: '14px', cursor: fullMapLoading || fullMapError ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                🚗 카카오맵으로 실시간 길찾기 및 이동 경로 보기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}