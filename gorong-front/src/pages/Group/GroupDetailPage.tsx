// 경로: src/pages/Group/GroupDetailPage.tsx

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useChatRoom } from '../../hooks/useChatRoom';
import GroupPublicChatSection from '../../components/GroupPublicChatSection'

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

const escapeHtml = (v: string) =>
    v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

export default function GroupDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [post, setPost]               = useState<GroupPost | null>(null);
    const [isJoining, setIsJoining]     = useState(false);
    const [isJoined, setIsJoined]       = useState(false);
    const [showMap, setShowMap]         = useState(false);
    const [mapLoading, setMapLoading]   = useState(false);
    const [mapError, setMapError]       = useState('');

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapMarkerRef    = useRef<any>(null);

    const { isMyGroup } = useChatRoom();

    // ── 데이터 로드 ──────────────────────────────────────────
    useEffect(() => {
        if (!id) return;
        axiosInstance.get<GroupPost>(`/groups/${id}`)
            .then(res => setPost(res.data))
            .catch(() => navigate('/group', { replace: true }));

        axiosInstance.get<number[]>('/groups/joined-ids')
            .then(res => setIsJoined(res.data.includes(Number(id))))
            .catch(() => {});
    }, [id, navigate]);

    // ── 권한 판정 ────────────────────────────────────────────
    const canEdit = post
        ? isMyGroup({ authorEmail: post.author?.email, authorName: post.authorName })
        : false;

    // ── 참여 신청 ────────────────────────────────────────────
    const handleJoin = useCallback(async () => {
        try {
            setIsJoining(true);
            await axiosInstance.put(`/groups/${id}/join`);
            setIsJoined(true);
            setPost(prev => prev
                ? { ...prev, currentCapacity: (prev.currentCapacity ?? 0) + 1 }
                : prev
            );
        } catch (err: any) {
            const status = err?.response?.status;
            if (status === 401) alert('로그인이 필요합니다.');
            else alert('참여 신청 중 오류가 발생했습니다.');
        } finally {
            setIsJoining(false);
        }
    }, [id]);

    // ── 삭제 ─────────────────────────────────────────────────
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

    // ── 카카오 지도 ──────────────────────────────────────────
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

    useEffect(() => {
        if (!showMap || !post?.location || !mapContainerRef.current) return;
        let cancelled = false;

        const render = async () => {
            setMapLoading(true);
            setMapError('');
            try {
                await loadKakaoSdk();
                if (cancelled || !mapContainerRef.current) return;

                const geocoder = new window.kakao.maps.services.Geocoder();
                const places   = new window.kakao.maps.services.Places();
                const loc      = post.location!.trim();

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

                if (cancelled || !mapContainerRef.current) return;
                const map = new window.kakao.maps.Map(mapContainerRef.current, { center: pos, level: 3 });
                if (mapMarkerRef.current) mapMarkerRef.current.setMap(null);
                mapMarkerRef.current = new window.kakao.maps.Marker({ position: pos, map });
                new window.kakao.maps.InfoWindow({
                    content: `<div style="padding:8px 12px;font-size:13px;font-weight:700;white-space:nowrap;">${escapeHtml(loc)}</div>`,
                }).open(map, mapMarkerRef.current);
            } catch {
                if (!cancelled) setMapError('위치를 지도에서 찾지 못했습니다.');
            } finally {
                if (!cancelled) setMapLoading(false);
            }
        };

        render();
        return () => { cancelled = true; };
    }, [showMap, post?.location, loadKakaoSdk]);

    // ── 로딩 ─────────────────────────────────────────────────
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
    const isFull   = current >= max;
    const isClosed = post.status === 'CLOSED' || isFull;
    const pct      = Math.min(100, Math.round((current / max) * 100));

    // ── 렌더 ─────────────────────────────────────────────────
    return (
        <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Pretendard, sans-serif', paddingBottom: '80px', marginTop: '-64px' }}>

            {/* ── 히어로 헤더 ── */}
            <div style={{ background: 'linear-gradient(135deg, #ff8a3d 0%, #ff5e00 100%)', padding: '80px 20px 88px', position: 'relative' }}>
                <div style={{ maxWidth: '760px', margin: '0 auto' }}>
                    {/* 뒤로 가기 */}
                    <button
                        onClick={() => navigate('/group')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.18)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', marginBottom: '24px' }}
                    >
                        ← 목록으로
                    </button>

                    {/* 상태 뱃지 */}
                    <div style={{ marginBottom: '12px' }}>
            <span style={{
                display: 'inline-block',
                backgroundColor: isClosed ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.9)',
                color: isClosed ? 'white' : '#ff8a3d',
                padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '800',
            }}>
              {isClosed ? '모집완료' : '🟢 모집중'}
            </span>
                        {canEdit && (
                            <span style={{ marginLeft: '8px', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                내 글
              </span>
                        )}
                    </div>

                    {/* 제목 */}
                    <h1 style={{ fontSize: '28px', fontWeight: '900', color: 'white', margin: '0 0 16px', lineHeight: '1.3' }}>
                        {post.title}
                    </h1>

                    {/* 호스트 + 행사 */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '14px', color: 'rgba(255,255,255,0.88)' }}>
            <span>
              👤 호스트:{' '}
                {post.author?.id ? (
                    <button
                        type="button"
                        onClick={() => navigate(`/cattower/${post.author?.id}`)}
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

            {/* ── 메인 컨텐츠 ── */}
            <div style={{ maxWidth: '760px', margin: '50px auto 0', padding: '0 20px', position: 'relative', zIndex: 1 }}>

                {/* 정원 진행 바 카드 */}
                <div style={{ backgroundColor: 'white', borderRadius: '18px', padding: '20px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '20px' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
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

                {/* 지도 보기 버튼 */}
                {post.location && (
                    <button
                        type="button"
                        onClick={() => setShowMap(v => !v)}
                        style={{
                            width: '100%', marginBottom: '16px',
                            padding: '14px', borderRadius: '14px',
                            border: '1.5px solid ' + (showMap ? '#ff8a3d' : '#e2e8f0'),
                            backgroundColor: showMap ? '#fff4ed' : 'white',
                            color: showMap ? '#ff8a3d' : '#64748b',
                            fontWeight: '700', fontSize: '14px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        }}
                    >
                        🗺️ {showMap ? '지도 닫기' : '지도로 위치 확인하기'}
                    </button>
                )}

                {/* 지도 */}
                {showMap && (
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', position: 'relative' }}>
                        <div ref={mapContainerRef} style={{ width: '100%', height: '320px', backgroundColor: '#f8fafc' }} />
                        {mapLoading && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(248,250,252,0.85)', fontWeight: '700', color: '#64748b' }}>
                                지도를 불러오는 중...
                            </div>
                        )}
                        {mapError && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.92)', color: '#ef4444', fontWeight: '700', textAlign: 'center', padding: '20px' }}>
                                {mapError}
                            </div>
                        )}
                    </div>
                )}

                {/* 모임 소개 */}
                {post.content && (
                    <div style={{ backgroundColor: 'white', borderRadius: '18px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', marginBottom: '16px' }}>
                        <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '700', marginBottom: '12px' }}>📝 모임 소개</div>
                        <p style={{ fontSize: '15px', color: '#334155', lineHeight: '1.8', margin: 0, whiteSpace: 'pre-wrap' }}>
                            {post.content}
                        </p>
                    </div>
                )}

                {/* 액션 버튼 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                    {/* 참여하기 or 채팅방 (비작성자) */}
                    {!canEdit && (
                        isJoined ? (
                            <button
                                onClick={() => navigate(`/chat/${post.id}`)}
                                style={{ width: '100%', padding: '17px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', fontWeight: '800', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                💬 채팅방 입장하기
                            </button>
                        ) : (
                            <button
                                onClick={handleJoin}
                                disabled={isClosed || isJoining}
                                style={{ width: '100%', padding: '17px', borderRadius: '14px', border: 'none', background: isClosed || isJoining ? '#e2e8f0' : 'linear-gradient(135deg, #ff8a3d, #ff5e00)', color: isClosed || isJoining ? '#94a3b8' : 'white', fontWeight: '800', fontSize: '16px', cursor: isClosed || isJoining ? 'default' : 'pointer' }}
                            >
                                {isJoining ? '신청 중...' : isClosed ? '모집이 마감되었습니다' : '👋 참여 신청하기'}
                            </button>
                        )
                    )}

                    {/* 수정 / 삭제 / 채팅 (작성자) */}
                    {canEdit && (
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => navigate(`/chat/${post.id}`)}
                                style={{ flex: 1, padding: '16px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', fontWeight: '800', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                                💬 채팅방
                            </button>
                            <button
                                onClick={() => navigate(`/groups/edit/${post.id}`)}
                                style={{ flex: 1, padding: '16px', borderRadius: '14px', border: 'none', backgroundColor: '#f1f5f9', color: '#64748b', fontWeight: '800', fontSize: '15px', cursor: 'pointer' }}
                            >
                                ✏️ 수정
                            </button>
                            <button
                                onClick={handleDelete}
                                style={{ flex: 1, padding: '16px', borderRadius: '14px', border: 'none', backgroundColor: '#fee2e2', color: '#ef4444', fontWeight: '800', fontSize: '15px', cursor: 'pointer' }}
                            >
                                🗑️ 삭제
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <GroupPublicChatSection groupId={post.id} />
        </div>
    );
}
