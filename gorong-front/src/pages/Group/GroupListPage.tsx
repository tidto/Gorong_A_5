// ============================================================
// 경로: src/pages/Group/GroupListPage.tsx
//
// 변경 사항:
//  - useChatRoom 에서 isMyGroup, currentUserEmail 구조분해 추가
//  - 수정/삭제 버튼 → isMyGroup(group) 이 true 인 경우에만 렌더링
//  - groups 상태 any[] → Group[] 타입으로 교체 (any 제거)
//  - handleJoinRequest / handleDelete 의 파라미터 any 제거
//  - fetchGroups axios 응답 타입 명시
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

/** 백엔드 /api/groups 응답의 그룹 항목 구조 */
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
  /** 표시 작성자명 (닉네임 또는 이메일 폴백) */
  authorName?: string
  /** 작성자 Firebase 이메일 — isMyGroup 권한 판정용 */
  author?: {
    id?: number
    email?: string
  }
}

/** isMyGroup 에 넘길 수 있는 최소 인터페이스 (JoinedGroup 과 동일 구조) */
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
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinedGroupIds, setJoinedGroupIds] = useState<number[]>([]);
  const [mapTarget, setMapTarget] = useState<Group | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(false);
  const [mapError, setMapError] = useState('');

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [activeChatTitle, setActiveChatTitle] = useState('');
  const [connectedGroupId, setConnectedGroupId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapMarkerRef = useRef<any>(null);

  // ✅ isMyGroup, currentUserEmail 추가 구조분해
  const {
    messages,
    isConnecting,
    isConnected,
    connect,
    sendMessage,
    isMyGroup,
  } = useChatRoom();

  useEffect(() => {
    fetchGroups();
    fetchJoinedGroupIds();
  }, []);

  // 새 메시지 오면 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedId(null);
  }, [searchTerm, selectedEventFilter]);

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

        const map = new window.kakao.maps.Map(mapContainerRef.current, {
          center: position,
          level: 3,
        });

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

    return () => {
      cancelled = true;
    };
  }, [mapTarget, loadKakaoMapSdk]);

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

  /**
   * Group 객체를 isMyGroup 이 이해할 수 있는 형태로 변환합니다.
   * GroupListPage 의 groups 는 JoinedGroup 이 아닌 Group 타입이므로
   * authorEmail 을 author?.email 에서 매핑합니다.
   */
  const toPermissionShape = (group: Group): GroupForPermission => ({
    authorEmail: group.author?.email,
    authorName:  group.authorName,
  });

  // ────────────────────────────────────────────────────────────
  // 채팅 연결
  // ────────────────────────────────────────────────────────────

  const connectChat = useCallback(async (groupId: number, groupTitle: string) => {
    if (connectedGroupId === groupId) {
      setIsChatOpen(true);
      return;
    }
    setConnectedGroupId(groupId);
    setActiveChatTitle(groupTitle);
    await connect(groupId, groupTitle);
    setIsChatOpen(true);
  }, [connectedGroupId, connect]);

  // ────────────────────────────────────────────────────────────
  // 참여 신청
  // ────────────────────────────────────────────────────────────

  const handleJoinRequest = async (group: Group) => {
    if (isJoining || joinedGroupIds.includes(group.id)) return;
    if ((group.currentCapacity ?? 0) >= (group.maxCapacity ?? 0)) {
      alert('정원이 가득 찼습니다.');
      return;
    }
    try {
      setIsJoining(true);
      await axiosInstance.put(`/groups/${group.id}/join`);
      alert(`'${group.title}' 참여 성공! 🎉`);
      setJoinedGroupIds(prev => [...prev, group.id]);
      await connectChat(group.id, group.title);
      fetchGroups();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) alert('로그인이 필요합니다.');
      else alert('참여 처리 중 오류가 발생했습니다.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleOpenChat = async (group: Group) => {
    await connectChat(group.id, group.title);
  };

  // ────────────────────────────────────────────────────────────
  // 메시지 전송
  // ────────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    if (!chatMessage.trim()) return;
    sendMessage(chatMessage);
    setChatMessage('');
  }, [chatMessage, sendMessage]);

  // ────────────────────────────────────────────────────────────
  // 삭제 — 작성자 본인만 실행 가능 (UI에서 버튼 자체를 숨기지만 이중 방어)
  // ────────────────────────────────────────────────────────────

  const handleDelete = async (group: Group) => {
    // ✅ UI에서 isMyGroup 으로 이미 버튼을 숨기지만, 실수 방지용 이중 검증
    if (!isMyGroup(toPermissionShape(group))) {
      alert('작성자 본인만 삭제할 수 있습니다.');
      return;
    }
    if (!window.confirm('정말 이 모집글을 삭제하시겠습니까?')) return;
    try {
      await axiosInstance.delete(`/groups/${group.id}`);
      alert('삭제되었습니다.');
      fetchGroups();
    } catch (err) {
      console.error('삭제 실패', err);
    }
  };

  // ────────────────────────────────────────────────────────────
  // 수정 — 작성자 본인만 실행 가능 (UI에서 버튼 자체를 숨기지만 이중 방어)
  // ────────────────────────────────────────────────────────────

  const handleEdit = (group: Group) => {
    if (!isMyGroup(toPermissionShape(group))) {
      alert('작성자 본인만 수정할 수 있습니다.');
      return;
    }
    navigate(`/groups/edit/${group.id}`);
  };

  const handleGoToHostCatTower = useCallback(
    (group: Group) => {
      const id = group.author?.id;
      if (id == null || !Number.isFinite(id) || id <= 0) return;
      navigate(`/cattower/${id}`);
    },
    [navigate]
  );

  // ────────────────────────────────────────────────────────────
  // 검색 필터
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

          <input
              type="text"
              placeholder="제목, 행사명, 장소로 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '25px', boxSizing: 'border-box', outline: 'none' }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '22px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>행사 분류</span>
            <button
                type="button"
                onClick={() => setSelectedEventFilter('ALL')}
                style={{
                  border: selectedEventFilter === 'ALL' ? '1.5px solid #ff8a3d' : '1.5px solid #e2e8f0',
                  backgroundColor: selectedEventFilter === 'ALL' ? '#fff4ed' : 'white',
                  color: selectedEventFilter === 'ALL' ? '#ff8a3d' : '#64748b',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '700',
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
                      padding: '8px 14px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: '700',
                      maxWidth: '220px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={event}
                >
                  {event}
                </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {paginatedGroups.map((group) => {
              const isFull = (group.currentCapacity ?? 0) >= (group.maxCapacity ?? 0);
              const isClosed = group.status === 'CLOSED' || isFull;
              const isAlreadyJoined = joinedGroupIds.includes(group.id);
              // ✅ 현재 유저가 이 그룹의 작성자인지 판정
              const canEdit = isMyGroup(toPermissionShape(group));

              return (
                  <div key={group.id} style={{ backgroundColor: 'white', borderRadius: '20px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                    <div
                        onClick={() => setSelectedId(selectedId === group.id ? null : group.id)}
                        style={{ padding: '24px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <div>
                        <h3 style={{ margin: '0 0 5px 0', fontSize: '20px', fontWeight: '700' }}>{group.title}</h3>
                        <div style={{ fontSize: '14px', color: '#64748b' }}>
                          📍 {group.location} | 호스트:{" "}
                          {group.author?.id ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGoToHostCatTower(group);
                              }}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                padding: 0,
                                margin: 0,
                                color: '#ff8a3d',
                                fontWeight: 700,
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                textUnderlineOffset: '2px',
                              }}
                            >
                              {group.authorName || '익명'}
                            </button>
                          ) : (
                            <span>{group.authorName || '익명'}</span>
                          )}
                          {/* ✅ 내가 작성한 글임을 표시 */}
                          {canEdit && (
                              <span style={{
                                marginLeft: '8px',
                                fontSize: '11px',
                                backgroundColor: '#fff4ed',
                                color: '#ff8a3d',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontWeight: '600',
                              }}>
                          내 글
                        </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ backgroundColor: isClosed ? '#f1f5f9' : '#ecfdf5', color: isClosed ? '#94a3b8' : '#10b981', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                      {isClosed ? '모집완료' : '모집중'}
                    </span>
                        <div style={{ fontSize: '20px', color: '#cbd5e1', transform: selectedId === group.id ? 'rotate(90deg)' : 'rotate(0deg)', transition: '0.3s' }}>〉</div>
                      </div>
                    </div>

                    {selectedId === group.id && (
                        <div style={{ padding: '0 30px 30px 30px', borderTop: '1px solid #f8fafc' }}>
                          <div style={{ padding: '25px 0', borderBottom: '1px solid #f1f5f9' }}>
                            <p style={{ fontSize: '16px', color: '#334155', lineHeight: '1.6', margin: 0 }}>{group.content}</p>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '25px' }}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ marginBottom: '25px' }}>
                                <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '10px' }}>참여 현황</div>
                                <div style={{ fontSize: '17px', color: '#334155', fontWeight: '600' }}>👥 {group.currentCapacity || 1} / {group.maxCapacity || 4}명</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '10px' }}>참여 조건</div>
                                <div style={{ fontSize: '16px', color: '#334155' }}>{group.condition || '제한 없음'}</div>
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '8px' }}>집합 상세 정보</div>
                              <div style={{ fontSize: '15px', color: '#334155', lineHeight: '1.8' }}>
                                📅 <strong>날짜:</strong> {group.meetingDate || '미정'}<br />
                                ⏰ <strong>시간:</strong> {group.meetingTime || '미정'}<br />
                                🎟️ <strong>참여 행사:</strong> {group.event || '정보 없음'}<br />
                                📍 <strong>모임 장소:</strong> <span style={{ color: '#ff8a3d', fontWeight: 'bold' }}>{group.location || '정보 없음'}</span>
                              </div>
                              <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); showLocationOnMap(group); }}
                                  disabled={!group.location}
                                  style={{
                                    marginTop: '14px',
                                    border: 'none',
                                    borderRadius: '10px',
                                    padding: '10px 16px',
                                    backgroundColor: group.location ? '#fff4ed' : '#f1f5f9',
                                    color: group.location ? '#ff8a3d' : '#94a3b8',
                                    fontWeight: '800',
                                    cursor: group.location ? 'pointer' : 'default',
                                  }}
                              >
                                지도로 보기
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '40px', flexWrap: 'wrap' }}>
                            {isAlreadyJoined ? (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleOpenChat(group); }}
                                    style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '15px 60px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}
                                >
                                  💬 채팅방 열기
                                </button>
                            ) : (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleJoinRequest(group); }}
                                    disabled={isClosed || isJoining}
                                    style={{ backgroundColor: isClosed || isJoining ? '#cbd5e1' : '#ff8a3d', color: 'white', border: 'none', padding: '15px 60px', borderRadius: '12px', fontWeight: 'bold', cursor: isClosed || isJoining ? 'default' : 'pointer', fontSize: '16px' }}
                                >
                                  {isJoining ? '참여 신청 중...' : (isClosed ? '모집이 마감되었습니다' : '참여 신청')}
                                </button>
                            )}

                            {/* ✅ 수정/삭제 버튼 — 작성자 본인(canEdit)에게만 렌더링 */}
                            {canEdit && (
                                <>
                                  <button
                                      onClick={(e) => { e.stopPropagation(); handleEdit(group); }}
                                      style={{ backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', padding: '15px 30px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                  >
                                    수정하기
                                  </button>
                                  <button
                                      onClick={(e) => { e.stopPropagation(); handleDelete(group); }}
                                      style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', padding: '15px 30px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                  >
                                    삭제하기
                                  </button>
                                </>
                            )}
                          </div>
                        </div>
                    )}
                  </div>
              );
            })}
          </div>

          {filteredGroups.length === 0 && (
              <div style={{ marginTop: '30px', padding: '48px 20px', textAlign: 'center', color: '#94a3b8', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                조건에 맞는 모집글이 없습니다.
              </div>
          )}

          {filteredGroups.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '28px', flexWrap: 'wrap' }}>
                <button
                    type="button"
                    onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '9px 13px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: currentPage === 1 ? '#f8fafc' : 'white',
                      color: currentPage === 1 ? '#cbd5e1' : '#64748b',
                      cursor: currentPage === 1 ? 'default' : 'pointer',
                      fontWeight: '800',
                    }}
                >
                  이전
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map(page => (
                    <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        style={{
                          minWidth: '38px',
                          padding: '9px 12px',
                          borderRadius: '10px',
                          border: currentPage === page ? '1.5px solid #ff8a3d' : '1px solid #e2e8f0',
                          backgroundColor: currentPage === page ? '#fff4ed' : 'white',
                          color: currentPage === page ? '#ff8a3d' : '#64748b',
                          cursor: 'pointer',
                          fontWeight: '800',
                        }}
                    >
                      {page}
                    </button>
                ))}
                <button
                    type="button"
                    onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '9px 13px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: currentPage === totalPages ? '#f8fafc' : 'white',
                      color: currentPage === totalPages ? '#cbd5e1' : '#64748b',
                      cursor: currentPage === totalPages ? 'default' : 'pointer',
                      fontWeight: '800',
                    }}
                >
                  다음
                </button>
              </div>
          )}
        </div>

        {/* ✅ 채팅 팝업 패널 */}
        {isChatOpen && (
            <div style={{ position: 'fixed', bottom: '20px', right: '20px', width: '360px', height: '520px', backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', zIndex: 1000, overflow: 'hidden' }}>
              {/* 패널 헤더 */}
              <div style={{ backgroundColor: '#ff8a3d', color: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{activeChatTitle} 채팅방</div>
                  {isConnecting && <div style={{ fontSize: '11px', opacity: 0.8 }}>연결 중...</div>}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {/* 전체화면 버튼 → /chat/:id 페이지로 이동 */}
                  <button
                      onClick={() => { setIsChatOpen(false); navigate(`/chat/${connectedGroupId}`); }}
                      style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '12px', padding: '4px 10px', borderRadius: '8px', fontWeight: 'bold' }}
                  >
                    전체화면 ↗
                  </button>
                  <button
                      onClick={() => setIsChatOpen(false)}
                      style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px' }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* 메시지 목록 */}
              <div style={{ flex: 1, padding: '15px', overflowY: 'auto', backgroundColor: '#fdfdfd' }}>
                {messages.map((msg, idx) => {
                  const isSystem = msg.user === '시스템';
                  const isMe = msg.isMe;
                  return (
                      <div key={idx} style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', alignItems: isSystem ? 'center' : (isMe ? 'flex-end' : 'flex-start') }}>
                        {!isSystem && (
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>
                              {isMe ? '나' : msg.user}
                              {msg.sentAt && <span style={{ marginLeft: '6px' }}>{msg.sentAt}</span>}
                            </div>
                        )}
                        <div style={{
                          display: 'inline-block', padding: '8px 12px', borderRadius: '12px', fontSize: '14px', maxWidth: '80%', wordBreak: 'break-word',
                          backgroundColor: isSystem ? '#f1f5f9' : (isMe ? '#ff8a3d' : '#f1f5f9'),
                          color: isSystem ? '#94a3b8' : (isMe ? 'white' : '#334155'),
                          fontStyle: isSystem ? 'italic' : 'normal',
                        }}>
                          {msg.text}
                        </div>
                      </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* 입력창 */}
              <div style={{ padding: '15px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px' }}>
                <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="메시지를 입력하세요"
                    disabled={isConnecting || !isConnected}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px' }}
                />
                <button
                    onClick={handleSend}
                    disabled={isConnecting || !chatMessage.trim()}
                    style={{ backgroundColor: '#ff8a3d', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  전송
                </button>
              </div>
            </div>
        )}

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
