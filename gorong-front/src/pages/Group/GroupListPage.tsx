// ============================================================
// 경로: src/pages/Group/GroupListPage.tsx
//
// 변경 사항:
//  - 카드 클릭 시 인라인 아코디언 펼치기 → /groups/:id 페이지 이동으로 변경
//  - selectedId, isChatOpen, chatMessage, activeChatTitle, connectedGroupId 상태 제거
//  - messagesEndRef, connectChat, handleOpenChat, handleSend, handleDelete, handleJoinRequest 제거
//  - useChatRoom 에서 isMyGroup 만 사용 (채팅 관련 구조분해 제거)
//  - 카드에 지도 보기 버튼 유지 (stopPropagation으로 페이지 이동과 분리)
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useChatRoom } from '../../hooks/useChatRoom';

const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_API_KEY || '';
const ITEMS_PER_PAGE = 10;

// ────────────────────────────────────────────────────────────
// 타입 정의
// ────────────────────────────────────────────────────────────

interface Group {
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
  author?: {
    id?: number
    email?: string
  }
}

interface GroupForPermission {
  authorEmail?: string
  authorName?: string
}

declare global { interface Window { kakao: any } }

const escapeHtml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const GroupListPage = () => {
  const navigate = useNavigate();

  const [groups, setGroups] = useState<Group[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventFilter, setSelectedEventFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [joinedGroupIds, setJoinedGroupIds] = useState<number[]>([]);
  const [mapTarget, setMapTarget] = useState<Group | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(false);
  const [mapError, setMapError] = useState('');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapMarkerRef = useRef<any>(null);

  // isMyGroup 만 사용 (채팅 연결 관련 구조분해 제거)
  const { isMyGroup } = useChatRoom();

  useEffect(() => {
    fetchGroups();
    fetchJoinedGroupIds();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedEventFilter]);

  // ────────────────────────────────────────────────────────────
  // 카카오 지도 SDK
  // ────────────────────────────────────────────────────────────

  const loadKakaoMapSdk = useCallback(() => {
    if (window.kakao?.maps?.services) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      const existingScript = document.getElementById('kakao-map-sdk-group-list') as HTMLScriptElement | null;

      if (existingScript) {
        if (window.kakao?.maps?.load) {
          window.kakao.maps.load(resolve);
          return;
        }
        existingScript.addEventListener('load', () => window.kakao.maps.load(resolve), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('kakao map sdk load failed')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.id = 'kakao-map-sdk-group-list';
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false&libraries=services`;
      script.onload = () => window.kakao.maps.load(resolve);
      script.onerror = () => reject(new Error('kakao map sdk load failed'));
      document.head.appendChild(script);
    });
  }, []);

  const showLocationOnMap = useCallback((group: Group) => {
    setMapTarget(group);
    setMapError('');
  }, []);

  useEffect(() => {
    if (!mapTarget || !mapContainerRef.current) return;

    let cancelled = false;
    const location = mapTarget.location?.trim();

    const renderMap = async () => {
      if (!location) {
        setMapError('모임 장소 정보가 없습니다.');
        return;
      }

      setIsMapLoading(true);
      setMapError('');

      try {
        await loadKakaoMapSdk();
        if (cancelled || !mapContainerRef.current) return;

        const geocoder = new window.kakao.maps.services.Geocoder();
        const places = new window.kakao.maps.services.Places();

        const resolvePosition = () => new Promise<any>((resolve, reject) => {
          geocoder.addressSearch(location, (addressResult: any, addressStatus: any) => {
            if (addressStatus === window.kakao.maps.services.Status.OK && addressResult.length > 0) {
              resolve(new window.kakao.maps.LatLng(Number(addressResult[0].y), Number(addressResult[0].x)));
              return;
            }
            places.keywordSearch(location, (placeResult: any, placeStatus: any) => {
              if (placeStatus === window.kakao.maps.services.Status.OK && placeResult.length > 0) {
                resolve(new window.kakao.maps.LatLng(Number(placeResult[0].y), Number(placeResult[0].x)));
              } else {
                reject(new Error('location not found'));
              }
            });
          });
        });

        const position = await resolvePosition();
        if (cancelled || !mapContainerRef.current) return;

        const map = new window.kakao.maps.Map(mapContainerRef.current, { center: position, level: 3 });

        if (mapMarkerRef.current) mapMarkerRef.current.setMap(null);
        mapMarkerRef.current = new window.kakao.maps.Marker({ position, map });

        const infoWindow = new window.kakao.maps.InfoWindow({
          content: `<div style="padding:8px 12px;font-size:13px;font-weight:700;white-space:nowrap;">${escapeHtml(location)}</div>`,
        });
        infoWindow.open(map, mapMarkerRef.current);
      } catch {
        setMapError('지도로 표시할 수 있는 위치를 찾지 못했습니다.');
      } finally {
        if (!cancelled) setIsMapLoading(false);
      }
    };

    renderMap();
    return () => { cancelled = true; };
  }, [mapTarget, loadKakaoMapSdk]);

  // ────────────────────────────────────────────────────────────
  // 데이터 로드
  // ────────────────────────────────────────────────────────────

  const fetchGroups = () => {
    axiosInstance.get<Group[]>('/groups')
        .then(res => setGroups(res.data))
        .catch(err => console.error('데이터 로딩 실패', err));
  };

  const fetchJoinedGroupIds = async () => {
    try {
      const res = await axiosInstance.get<number[]>('/groups/joined-ids');
      setJoinedGroupIds(res.data);
    } catch {
      // 비로그인 상태면 무시
    }
  };

  // ────────────────────────────────────────────────────────────
  // 권한 판정 어댑터
  // ────────────────────────────────────────────────────────────

  const toPermissionShape = (group: Group): GroupForPermission => ({
    authorEmail: group.author?.email,
    authorName:  group.authorName,
  });

  const handleGoToHostCatTower = useCallback(
      (group: Group) => {
        const id = group.author?.id;
        if (id == null || !Number.isFinite(id) || id <= 0) return;
        navigate(`/cattower/${id}`);
      },
      [navigate]
  );

  // ────────────────────────────────────────────────────────────
  // 검색 / 필터 / 페이징
  // ────────────────────────────────────────────────────────────

  const eventCategories = Array.from(
      new Set(groups.map(group => group.event?.trim()).filter((event): event is string => Boolean(event)))
  ).sort((a, b) => a.localeCompare(b, 'ko'));

  const filteredGroups = groups.filter(group => {
    const matchesSearch =
        group.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (group.event && group.event.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (group.location && group.location.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesEvent = selectedEventFilter === 'ALL' || group.event?.trim() === selectedEventFilter;
    return matchesSearch && matchesEvent;
  });

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / ITEMS_PER_PAGE));
  const paginatedGroups = filteredGroups.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  // ────────────────────────────────────────────────────────────
  // 렌더
  // ────────────────────────────────────────────────────────────

  return (
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Pretendard, sans-serif', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px' }}>

          {/* 헤더 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px 0' }}>👥 모집게시판</h1>
              <p style={{ color: '#94a3b8', margin: 0 }}>함께 행사에 참여할 동행자를 찾아보세요</p>
            </div>
            <button
                onClick={() => navigate('/groups/create')}
                style={{ backgroundColor: '#ff8a3d', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              + 모집글 작성
            </button>
          </div>

          {/* 검색 */}
          <input
              type="text"
              placeholder="제목, 행사명, 장소로 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '25px', boxSizing: 'border-box', outline: 'none' }}
          />

          {/* 행사 필터 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '22px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>행사 분류</span>
            <button
                type="button"
                onClick={() => setSelectedEventFilter('ALL')}
                style={{
                  border: selectedEventFilter === 'ALL' ? '1.5px solid #ff8a3d' : '1.5px solid #e2e8f0',
                  backgroundColor: selectedEventFilter === 'ALL' ? '#fff4ed' : 'white',
                  color: selectedEventFilter === 'ALL' ? '#ff8a3d' : '#64748b',
                  padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700',
                }}
            >
              전체
            </button>
            {eventCategories.map(event => (
                <button
                    key={event}
                    type="button"
                    onClick={() => setSelectedEventFilter(event)}
                    style={{
                      border: selectedEventFilter === event ? '1.5px solid #ff8a3d' : '1.5px solid #e2e8f0',
                      backgroundColor: selectedEventFilter === event ? '#fff4ed' : 'white',
                      color: selectedEventFilter === event ? '#ff8a3d' : '#64748b',
                      padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700',
                      maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                    title={event}
                >
                  {event}
                </button>
            ))}
          </div>

          {/* 그룹 카드 목록 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {paginatedGroups.map((group) => {
              const isFull = (group.currentCapacity ?? 0) >= (group.maxCapacity ?? 0);
              const isClosed = group.status === 'CLOSED' || isFull;
              const isAlreadyJoined = joinedGroupIds.includes(group.id);
              const canEdit = isMyGroup(toPermissionShape(group));

              return (
                  <div
                      key={group.id}
                      onClick={() => navigate(`/groups/${group.id}`)}
                      style={{
                        backgroundColor: 'white',
                        borderRadius: '20px',
                        border: '1px solid #f1f5f9',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                        cursor: 'pointer',
                        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
                        overflow: 'hidden',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 24px rgba(0,0,0,0.09)';
                        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 10px rgba(0,0,0,0.03)';
                        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                      }}
                  >
                    <div style={{ padding: '22px 24px' }}>
                      {/* 상단: 제목 + 상태 뱃지 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {group.title}
                          </h3>
                          {canEdit && (
                              <span style={{ flexShrink: 0, fontSize: '11px', backgroundColor: '#fff4ed', color: '#ff8a3d', padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>
                                내 글
                              </span>
                          )}
                          {isAlreadyJoined && !canEdit && (
                              <span style={{ flexShrink: 0, fontSize: '11px', backgroundColor: '#ecfdf5', color: '#10b981', padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>
                                참여중
                              </span>
                          )}
                        </div>
                        <span style={{
                          flexShrink: 0,
                          backgroundColor: isClosed ? '#f1f5f9' : '#ecfdf5',
                          color: isClosed ? '#94a3b8' : '#10b981',
                          padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                        }}>
                          {isClosed ? '모집완료' : '모집중'}
                        </span>
                      </div>

                      {/* 호스트 */}
                      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                        호스트:{' '}
                        {group.author?.id ? (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleGoToHostCatTower(group); }}
                                style={{ border: 'none', background: 'transparent', padding: 0, margin: 0, color: '#ff8a3d', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px' }}
                            >
                              {group.authorName || '익명'}
                            </button>
                        ) : (
                            <span>{group.authorName || '익명'}</span>
                        )}
                      </div>

                      {/* 하단 메타 정보 + 지도 버튼 */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '13px', color: '#475569' }}>
                          <span>📍 {group.location || '장소 미정'}</span>
                          <span>👥 {group.currentCapacity ?? 1} / {group.maxCapacity ?? 4}명</span>
                          {group.meetingDate && <span>📅 {group.meetingDate}</span>}
                          {group.event && (
                              <span style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '8px', fontSize: '12px', color: '#64748b' }}>
                                🎟️ {group.event}
                              </span>
                          )}
                        </div>

                        {/* 지도 버튼 (클릭 시 페이지 이동 차단) */}
                        {group.location && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); showLocationOnMap(group); }}
                                style={{
                                  flexShrink: 0,
                                  border: 'none', borderRadius: '10px', padding: '7px 14px',
                                  backgroundColor: '#fff4ed', color: '#ff8a3d',
                                  fontWeight: '700', fontSize: '12px', cursor: 'pointer',
                                }}
                            >
                              🗺️ 지도 보기
                            </button>
                        )}
                      </div>
                    </div>

                    {/* 하단 액센트 바 */}
                    <div style={{ height: '3px', backgroundColor: isClosed ? '#f1f5f9' : '#ff8a3d', opacity: isClosed ? 1 : 0.25 }} />
                  </div>
              );
            })}
          </div>

          {/* 결과 없음 */}
          {filteredGroups.length === 0 && (
              <div style={{ marginTop: '30px', padding: '48px 20px', textAlign: 'center', color: '#94a3b8', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                조건에 맞는 모집글이 없습니다.
              </div>
          )}

          {/* 페이지네이션 */}
          {filteredGroups.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '28px', flexWrap: 'wrap' }}>
                <button
                    type="button"
                    onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    style={{ padding: '9px 13px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: currentPage === 1 ? '#f8fafc' : 'white', color: currentPage === 1 ? '#cbd5e1' : '#64748b', cursor: currentPage === 1 ? 'default' : 'pointer', fontWeight: '800' }}
                >
                  이전
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map(page => (
                    <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        style={{ minWidth: '38px', padding: '9px 12px', borderRadius: '10px', border: currentPage === page ? '1.5px solid #ff8a3d' : '1px solid #e2e8f0', backgroundColor: currentPage === page ? '#fff4ed' : 'white', color: currentPage === page ? '#ff8a3d' : '#64748b', cursor: 'pointer', fontWeight: '800' }}
                    >
                      {page}
                    </button>
                ))}
                <button
                    type="button"
                    onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    style={{ padding: '9px 13px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: currentPage === totalPages ? '#f8fafc' : 'white', color: currentPage === totalPages ? '#cbd5e1' : '#64748b', cursor: currentPage === totalPages ? 'default' : 'pointer', fontWeight: '800' }}
                >
                  다음
                </button>
              </div>
          )}
        </div>

        {/* 지도 모달 */}
        {mapTarget && (
            <div
                onClick={() => setMapTarget(null)}
                style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '20px' }}
            >
              <div
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: '720px', maxWidth: '96vw', backgroundColor: 'white', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(15,23,42,0.25)' }}
              >
                <div style={{ padding: '18px 22px', backgroundColor: '#ff8a3d', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '17px', fontWeight: '900', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {mapTarget.title}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {mapTarget.location || '모임 장소 정보 없음'}
                    </div>
                  </div>
                  <button
                      type="button"
                      onClick={() => setMapTarget(null)}
                      style={{ border: 'none', borderRadius: '9px', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', padding: '7px 12px', cursor: 'pointer', fontWeight: '800', flexShrink: 0 }}
                  >
                    닫기
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <div ref={mapContainerRef} style={{ width: '100%', height: '420px', backgroundColor: '#f8fafc' }} />
                  {isMapLoading && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: '800', backgroundColor: 'rgba(248,250,252,0.82)' }}>
                        지도를 불러오는 중...
                      </div>
                  )}
                  {mapError && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.92)', textAlign: 'center', padding: '20px' }}>
                        {mapError}
                      </div>
                  )}
                </div>
              </div>
            </div>
        )}
      </div>
  );
};

export default GroupListPage;
