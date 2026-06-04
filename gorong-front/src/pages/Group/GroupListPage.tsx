// 경로: src/pages/Group/GroupListPage.tsx

import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useChatRoom } from '../../hooks/useChatRoom';

const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_API_KEY || '';
const ITEMS_PER_PAGE = 10;

interface Group {
  id: number; title: string; content?: string; location?: string;
  maxCapacity?: number; currentCapacity?: number; status?: string;
  event?: string; meetingDate?: string; meetingTime?: string;
  condition?: string; authorName?: string;
  author?: { id?: number; email?: string };
}
interface GroupForPermission { authorEmail?: string; authorName?: string }
declare global { interface Window { kakao: any } }

type SortOrder = 'createdAt' | 'meetingDate';
type StatusTab = 'open' | 'closed';

// ✅ 날짜 필터 옵션
type DateFilter = 'ALL' | 'today' | 'thisWeek' | 'thisWeekend' | 'nextWeek';

const escapeHtml = (v: string) =>
    v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/\"/g,'&quot;').replace(/'/g,'&#39;');

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

// ✅ 날짜 필터 매칭 함수
const matchesDateFilter = (meetingDate: string | undefined, filter: DateFilter): boolean => {
  if (filter === 'ALL') return true;
  if (!meetingDate) return false;
  const meeting = new Date(meetingDate);
  meeting.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (filter === 'today') {
    return meeting.getTime() === today.getTime();
  }

  const dayOfWeek = today.getDay(); // 0=일, 6=토

  if (filter === 'thisWeekend') {
    // 이번 주 토~일
    const sat = new Date(today);
    sat.setDate(today.getDate() + ((6 - dayOfWeek + 7) % 7));
    const sun = new Date(sat);
    sun.setDate(sat.getDate() + 1);
    const mt = meeting.getTime();
    return mt === sat.getTime() || mt === sun.getTime();
  }

  if (filter === 'thisWeek') {
    // 이번 주 월~일 (오늘 포함)
    const mon = new Date(today);
    mon.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const mt = meeting.getTime();
    return mt >= mon.getTime() && mt <= sun.getTime();
  }

  if (filter === 'nextWeek') {
    const mon = new Date(today);
    mon.setDate(today.getDate() - ((dayOfWeek + 6) % 7) + 7);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const mt = meeting.getTime();
    return mt >= mon.getTime() && mt <= sun.getTime();
  }

  return true;
};

// ✅ 마감 임박 판별 (모집률 75%+ 이상이거나 3일 이내)
const isUrgent = (g: Group): boolean => {
  const cur = g.currentCapacity ?? 0;
  const max = g.maxCapacity ?? 999;
  const pct = max > 0 ? cur / max : 0;
  const capacityUrgent = pct >= 0.75 && cur < max;

  if (!g.meetingDate) return capacityUrgent;
  const meeting = new Date(g.meetingDate);
  meeting.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((meeting.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const dateUrgent = diffDays >= 0 && diffDays <= 3;

  return capacityUrgent || dateUrgent;
};

const GroupListPage = () => {
  const navigate = useNavigate();
  const [groups, setGroups]                           = useState<Group[]>([]);
  const [searchTerm, setSearchTerm]                   = useState('');
  const [selectedEventFilter, setSelectedEventFilter] = useState('ALL');
  const [sortOrder, setSortOrder]                     = useState<SortOrder>('createdAt');
  const [statusTab, setStatusTab]                     = useState<StatusTab>('open');
  const [dateFilter, setDateFilter]                   = useState<DateFilter>('ALL'); // ✅ 날짜 필터 상태
  const [currentPage, setCurrentPage]                 = useState(1);
  const [joinedGroupIds, setJoinedGroupIds]           = useState<number[]>([]);
  const [mapTarget, setMapTarget]                     = useState<Group | null>(null);
  const [isMapLoading, setIsMapLoading]               = useState(false);
  const [mapError, setMapError]                       = useState('');
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapMarkerRef    = useRef<any>(null);
  const { isMyGroup } = useChatRoom();

  useEffect(() => { fetchGroups(); fetchJoinedGroupIds(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedEventFilter, sortOrder, statusTab, dateFilter]);

  const loadKakaoMapSdk = useCallback(() => {
    if (window.kakao?.maps?.services) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const ex = document.getElementById('kakao-map-sdk-group-list') as HTMLScriptElement | null;
      if (ex) {
        window.kakao?.maps?.load ? window.kakao.maps.load(resolve)
            : ex.addEventListener('load', () => window.kakao.maps.load(resolve), { once: true });
        return;
      }
      const s = document.createElement('script');
      s.id = 'kakao-map-sdk-group-list';
      s.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false&libraries=services`;
      s.onload = () => window.kakao.maps.load(resolve);
      s.onerror = () => reject(new Error('load failed'));
      document.head.appendChild(s);
    });
  }, []);

  useEffect(() => {
    if (!mapTarget || !mapContainerRef.current) return;
    let cancelled = false;
    const loc = mapTarget.location?.trim();
    const run = async () => {
      if (!loc) { setMapError('모임 장소 정보가 없습니다.'); return; }
      setIsMapLoading(true); setMapError('');
      try {
        await loadKakaoMapSdk();
        if (cancelled || !mapContainerRef.current) return;
        const geocoder = new window.kakao.maps.services.Geocoder();
        const places   = new window.kakao.maps.services.Places();
        const pos = await new Promise<any>((res, rej) => {
          geocoder.addressSearch(loc, (r: any, s: any) => {
            if (s === window.kakao.maps.services.Status.OK && r.length > 0)
              return res(new window.kakao.maps.LatLng(+r[0].y, +r[0].x));
            places.keywordSearch(loc, (pr: any, ps: any) =>
                ps === window.kakao.maps.services.Status.OK && pr.length > 0
                    ? res(new window.kakao.maps.LatLng(+pr[0].y, +pr[0].x))
                    : rej(new Error('not found'))
            );
          });
        });
        if (cancelled || !mapContainerRef.current) return;
        const map = new window.kakao.maps.Map(mapContainerRef.current, { center: pos, level: 3 });
        if (mapMarkerRef.current) mapMarkerRef.current.setMap(null);
        mapMarkerRef.current = new window.kakao.maps.Marker({ position: pos, map });
        new window.kakao.maps.InfoWindow({
          content: `<div style="padding:8px 12px;font-size:13px;font-weight:700;white-space:nowrap;">${escapeHtml(loc)}</div>`,
        }).open(map, mapMarkerRef.current);
      } catch { setMapError('위치를 찾지 못했습니다.'); }
      finally { if (!cancelled) setIsMapLoading(false); }
    };
    run();
    return () => { cancelled = true; };
  }, [mapTarget, loadKakaoMapSdk]);

  const fetchGroups = () => axiosInstance.get<Group[]>('/groups').then(r => setGroups(r.data)).catch(console.error);
  const fetchJoinedGroupIds = async () => {
    try { const r = await axiosInstance.get<number[]>('/groups/joined-ids'); setJoinedGroupIds(r.data); } catch {}
  };

  const toPermissionShape = (g: Group): GroupForPermission => ({ authorEmail: g.author?.email, authorName: g.authorName });
  const handleGoToHost = useCallback((g: Group) => {
    const id = g.author?.id;
    if (id != null && Number.isFinite(id) && id > 0) navigate(`/cattower/${id}`);
  }, [navigate]);

  const eventCategories = Array.from(new Set(groups.map(g => g.event?.trim()).filter(Boolean) as string[])).sort((a,b) => a.localeCompare(b,'ko'));

  const getIsClosed = (g: Group) => {
    const isFull   = (g.currentCapacity ?? 0) >= (g.maxCapacity ?? 999);
    const isPassed = isDatePassed(g.meetingDate);
    return g.status === 'CLOSED' || isFull || isPassed;
  };

  const filteredGroups = groups.filter(g => {
    const q = searchTerm.toLowerCase();
    const matchSearch = g.title?.toLowerCase().includes(q) || g.event?.toLowerCase().includes(q) || g.location?.toLowerCase().includes(q);
    const matchEvent  = selectedEventFilter === 'ALL' || g.event?.trim() === selectedEventFilter;
    const isClosed    = getIsClosed(g);
    const matchTab    = statusTab === 'open' ? !isClosed : isClosed;
    const matchDate   = matchesDateFilter(g.meetingDate, dateFilter); // ✅ 날짜 필터 적용
    return matchSearch && matchEvent && matchTab && matchDate;
  });

  const sortedGroups = [...filteredGroups].sort((a, b) => {
    if (sortOrder === 'meetingDate') {
      if (!a.meetingDate && !b.meetingDate) return b.id - a.id;
      if (!a.meetingDate) return 1;
      if (!b.meetingDate) return -1;
      return new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime();
    }
    return b.id - a.id;
  });

  const totalPages      = Math.max(1, Math.ceil(sortedGroups.length / ITEMS_PER_PAGE));
  const paginatedGroups = sortedGroups.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  const openCount   = groups.filter(g => !getIsClosed(g)).length;
  const closedCount = groups.length - openCount;

  // ✅ 날짜 필터 버튼 목록
  const dateFilterOptions: { key: DateFilter; label: string; emoji: string }[] = [
    { key: 'ALL',         label: '전체',    emoji: '📆' },
    { key: 'today',       label: '오늘',    emoji: '🌅' },
    { key: 'thisWeekend', label: '이번주 주말', emoji: '🎉' },
    { key: 'thisWeek',   label: '이번 주',  emoji: '📅' },
    { key: 'nextWeek',   label: '다음 주',  emoji: '🗓️' },
  ];

  return (
      <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: 'Pretendard, sans-serif', paddingBottom: '100px', marginTop: '-64px' }}>

        {/* ── 배너 ── */}
        <div style={{ background: 'linear-gradient(135deg, #ff8a3d 0%, #ff5e00 100%)', padding: '88px 20px 28px' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'white', margin: '0 0 6px' }}>모집 게시판</h1>
                <p style={{ color: 'rgba(255,255,255,0.82)', margin: 0, fontSize: '14px' }}>함께 행사에 참여할 동행자를 찾아보세요</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: '12px', padding: '8px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>{openCount}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)', fontWeight: '700' }}>모집중</div>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '8px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: 'rgba(255,255,255,0.7)' }}>{closedCount}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)', fontWeight: '700' }}>마감</div>
                  </div>
                </div>
                <button
                    onClick={() => navigate('/groups/create')}
                    style={{ backgroundColor: 'white', color: '#ff5e00', border: 'none', padding: '12px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', fontSize: '14px', whiteSpace: 'nowrap', boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}
                >
                  + 모집글 작성
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 20px 0' }}>

          {/* ── 검색바 ── */}
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', pointerEvents: 'none' }}>🔍</span>
            <input
                type="text"
                placeholder="제목, 행사명, 장소로 검색"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: '14px', border: '1.5px solid #e2e8f0', boxSizing: 'border-box', outline: 'none', fontSize: '14px', backgroundColor: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'border-color 0.2s' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#ff8a3d' }}
                onBlur={e =>  { e.currentTarget.style.borderColor = '#e2e8f0' }}
            />
          </div>

          {/* ── 모집중 / 마감 카테고리 탭 ── */}
          <div style={{ display: 'flex', gap: '0', marginBottom: '16px', backgroundColor: 'white', borderRadius: '14px', padding: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e8edf5' }}>
            {([
              { key: 'open' as StatusTab,   label: '모집중', count: openCount },
              { key: 'closed' as StatusTab, label: '마감',   count: closedCount },
            ]).map(({ key, label, count }) => (
                <button
                    key={key}
                    type="button"
                    onClick={() => setStatusTab(key)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '800',
                      fontSize: '14px',
                      transition: 'all 0.18s',
                      backgroundColor: statusTab === key
                          ? (key === 'open' ? '#ff8a3d' : '#64748b')
                          : 'transparent',
                      color: statusTab === key ? 'white' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                >
                  {label}
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    backgroundColor: statusTab === key ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                    color: statusTab === key ? 'white' : '#94a3b8',
                    padding: '1px 7px',
                    borderRadius: '20px',
                  }}>
                    {count}
                  </span>
                </button>
            ))}
          </div>

          {/* ✅ 날짜 필터 ── */}
          <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '14px 16px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e8edf5' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '10px', letterSpacing: '0.5px' }}>📅 날짜 선택</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {dateFilterOptions.map(({ key, label, emoji }) => {
                const isActive = dateFilter === key;
                return (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setDateFilter(key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '7px 14px',
                          borderRadius: '20px',
                          border: isActive ? '1.5px solid #ff8a3d' : '1.5px solid #e2e8f0',
                          backgroundColor: isActive ? '#fff4ed' : 'white',
                          color: isActive ? '#ff8a3d' : '#64748b',
                          fontWeight: '700',
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                    >
                      <span>{emoji}</span>
                      <span>{label}</span>
                      {key !== 'ALL' && dateFilter === key && (
                          <span style={{ fontSize: '10px', backgroundColor: '#ff8a3d', color: 'white', borderRadius: '99px', padding: '0px 5px', fontWeight: '800' }}>
                        ON
                      </span>
                      )}
                    </button>
                );
              })}
            </div>
          </div>

          {/* ── 행사 필터 ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700', whiteSpace: 'nowrap' }}>행사 분류</span>
            {['ALL', ...eventCategories].map(ev => (
                <button key={ev} type="button" onClick={() => setSelectedEventFilter(ev)}
                        style={{
                          border: selectedEventFilter === ev ? '1.5px solid #ff8a3d' : '1.5px solid #e2e8f0',
                          backgroundColor: selectedEventFilter === ev ? '#ff8a3d' : 'white',
                          color: selectedEventFilter === ev ? 'white' : '#64748b',
                          padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontWeight: '700', fontSize: '12px',
                          maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          transition: 'all 0.15s',
                        }}
                        title={ev === 'ALL' ? '전체' : ev}
                >
                  {ev === 'ALL' ? '전체' : ev}
                </button>
            ))}
          </div>

          {/* ── 결과 수 + 정렬 버튼 ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>
              {sortedGroups.length > 0 ? `총 ${sortedGroups.length}개` : ''}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(([
                { key: 'createdAt',  label: '⏱ 최신 등록 순' },
                { key: 'meetingDate', label: '📅 가까운 일정 순' },
              ]) as { key: SortOrder; label: string }[]).map(({ key, label }) => (
                  <button
                      key={key}
                      type="button"
                      onClick={() => setSortOrder(key)}
                      style={{
                        padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                        cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                        backgroundColor: sortOrder === key ? '#1e293b' : '#f1f5f9',
                        color: sortOrder === key ? 'white' : '#64748b',
                      }}
                  >
                    {label}
                  </button>
              ))}
            </div>
          </div>

          {/* ── 카드 목록 ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {paginatedGroups.map(group => {
              const cur = group.currentCapacity ?? 0;
              const max = group.maxCapacity ?? 4;
              const pct = Math.min(100, Math.round((cur / max) * 100));
              const isFull     = cur >= max;
              const isPassed   = isDatePassed(group.meetingDate);
              const isClosed   = getIsClosed(group);
              const isJoined   = joinedGroupIds.includes(group.id);
              const canEdit    = isMyGroup(toPermissionShape(group));
              const urgent     = !isClosed && isUrgent(group); // ✅ 마감 임박 여부

              return (
                  <div key={group.id} onClick={() => navigate(`/groups/${group.id}`)}
                       style={{
                         backgroundColor: 'white', borderRadius: '16px', cursor: 'pointer',
                         border: `1px solid ${urgent ? '#fed7aa' : '#e8edf5'}`,
                         borderLeft: `4px solid ${isClosed ? '#cbd5e1' : urgent ? '#f97316' : '#ff8a3d'}`,
                         boxShadow: urgent ? '0 2px 12px rgba(249,115,22,0.12)' : '0 1px 6px rgba(0,0,0,0.04)',
                         transition: 'box-shadow 0.15s, transform 0.15s',
                         overflow: 'hidden',
                         opacity: 1,
                       }}
                       onMouseEnter={e => {
                         (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 24px rgba(0,0,0,0.10)';
                         (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                       }}
                       onMouseLeave={e => {
                         (e.currentTarget as HTMLDivElement).style.boxShadow = urgent ? '0 2px 12px rgba(249,115,22,0.12)' : '0 1px 6px rgba(0,0,0,0.04)';
                         (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                       }}
                  >
                    {/* ✅ 마감 임박 배너 */}
                    {urgent && (
                        <div style={{
                          background: 'linear-gradient(90deg, #ff5e00, #ff8a3d)',
                          padding: '5px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}>
                          <span style={{ fontSize: '11px', fontWeight: '800', color: 'white' }}>마감 임박</span>
                          {(() => {
                            // 마감 임박 세부 사유 표시
                            const cur2 = group.currentCapacity ?? 0;
                            const max2 = group.maxCapacity ?? 4;
                            const pct2 = max2 > 0 ? cur2 / max2 : 0;
                            if (group.meetingDate) {
                              const meeting = new Date(group.meetingDate);
                              meeting.setHours(0,0,0,0);
                              const today = new Date();
                              today.setHours(0,0,0,0);
                              const diff = Math.ceil((meeting.getTime() - today.getTime()) / (1000*60*60*24));
                              if (diff >= 0 && diff <= 3) {
                                return <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>
                                {diff === 0 ? '오늘 모임!' : `D-${diff}`}
                              </span>;
                              }
                            }
                            if (pct2 >= 0.75) {
                              return <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>
                              {cur2}/{max2}명 ({Math.round(pct2*100)}%)
                            </span>;
                            }
                            return null;
                          })()}
                        </div>
                    )}

                    <div style={{ padding: '18px 20px' }}>
                      {/* 제목 행 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: '17px', fontWeight: '800', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {group.title}
                          </span>
                          {canEdit && <span style={{ flexShrink: 0, fontSize: '10px', backgroundColor: '#fff4ed', color: '#ff8a3d', padding: '2px 7px', borderRadius: '8px', fontWeight: '700' }}>내 글</span>}
                          {isJoined && !canEdit && <span style={{ flexShrink: 0, fontSize: '10px', backgroundColor: '#ecfdf5', color: '#10b981', padding: '2px 7px', borderRadius: '8px', fontWeight: '700' }}>참여중</span>}
                          {isPassed && <span style={{ flexShrink: 0, fontSize: '10px', backgroundColor: '#f1f5f9', color: '#94a3b8', padding: '2px 7px', borderRadius: '8px', fontWeight: '700' }}>일정 종료</span>}
                        </div>
                        <span style={{
                          flexShrink: 0, fontSize: '11px', fontWeight: '800', padding: '3px 10px', borderRadius: '20px',
                          backgroundColor: isClosed ? '#f1f5f9' : '#ecfdf5',
                          color: isClosed ? '#94a3b8' : '#10b981',
                        }}>
                          {isClosed ? '마감' : '● 모집중'}
                        </span>
                      </div>

                      {/* 호스트 */}
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
                        호스트:{' '}
                        {group.author?.id
                            ? <button type="button" onClick={e => { e.stopPropagation(); handleGoToHost(group); }}
                                      style={{ border: 'none', background: 'transparent', padding: 0, color: '#ff8a3d', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px', fontSize: '12px' }}>
                              {group.authorName || '익명'}
                            </button>
                            : <span style={{ fontWeight: '600', color: '#64748b' }}>{group.authorName || '익명'}</span>
                        }
                      </div>

                      {/* 메타 정보 행 */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '12px', color: '#64748b', alignItems: 'center' }}>
                          <span>📍 {group.location || '장소 미정'}</span>
                          {group.meetingDate && (
                              <span style={{ color: isPassed ? '#94a3b8' : '#64748b' }}>
                                📅 {group.meetingDate}{isPassed ? ' (종료)' : ''}
                              </span>
                          )}
                          {group.event && (
                              <span style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '8px', color: '#64748b' }}>
                                🎟️ {group.event}
                              </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '56px', height: '5px', backgroundColor: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, backgroundColor: isClosed ? '#cbd5e1' : urgent ? '#f97316' : '#ff8a3d', borderRadius: '99px', transition: 'width 0.4s' }} />
                            </div>
                            <span style={{ fontSize: '11px', color: isClosed ? '#94a3b8' : urgent ? '#f97316' : '#ff8a3d', fontWeight: '700' }}>{cur}/{max}명</span>
                          </div>

                          {group.location && (
                              <button type="button" onClick={e => { e.stopPropagation(); setMapTarget(group); setMapError(''); }}
                                      style={{ border: 'none', borderRadius: '8px', padding: '5px 10px', backgroundColor: '#fff4ed', color: '#ff8a3d', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>
                                🗺️ 지도
                              </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
              );
            })}
          </div>

          {/* 빈 결과 */}
          {sortedGroups.length === 0 && (
              <div style={{ marginTop: '20px', padding: '60px 20px', textAlign: 'center', color: '#94a3b8', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e8edf5' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>
                  {dateFilter !== 'ALL' ? '📅' : statusTab === 'open' ? '🔍' : '📭'}
                </div>
                <p style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>
                  {dateFilter !== 'ALL'
                      ? '해당 날짜에 열리는 모임이 없습니다.'
                      : statusTab === 'open'
                          ? '현재 모집중인 게시글이 없습니다.'
                          : '마감된 게시글이 없습니다.'}
                </p>
              </div>
          )}

          {/* 페이지네이션 */}
          {sortedGroups.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '28px', flexWrap: 'wrap' }}>
                {[
                  { label: '이전', onClick: () => setCurrentPage(p => Math.max(1, p - 1)), disabled: currentPage === 1 },
                  ...Array.from({ length: totalPages }, (_, i) => ({ label: String(i + 1), onClick: () => setCurrentPage(i + 1), disabled: false, active: currentPage === i + 1 })),
                  { label: '다음', onClick: () => setCurrentPage(p => Math.min(totalPages, p + 1)), disabled: currentPage === totalPages },
                ].map((btn, i) => (
                    <button key={i} type="button" onClick={btn.onClick} disabled={btn.disabled}
                            style={{
                              minWidth: '36px', padding: '8px 12px', borderRadius: '10px', fontWeight: '800', fontSize: '13px', cursor: btn.disabled ? 'default' : 'pointer',
                              border: (btn as any).active ? '1.5px solid #ff8a3d' : '1px solid #e2e8f0',
                              backgroundColor: (btn as any).active ? '#fff4ed' : btn.disabled ? '#f8fafc' : 'white',
                              color: (btn as any).active ? '#ff8a3d' : btn.disabled ? '#cbd5e1' : '#64748b',
                            }}>
                      {btn.label}
                    </button>
                ))}
              </div>
          )}
        </div>

        {/* 지도 모달 */}
        {mapTarget && (
            <div onClick={() => setMapTarget(null)}
                 style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '20px' }}>
              <div onClick={e => e.stopPropagation()}
                   style={{ width: '720px', maxWidth: '96vw', backgroundColor: 'white', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(15,23,42,0.25)' }}>
                <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #ff8a3d, #ff5e00)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '16px', fontWeight: '900', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mapTarget.title}</div>
                    <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mapTarget.location}</div>
                  </div>
                  <button type="button" onClick={() => setMapTarget(null)}
                          style={{ border: 'none', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', padding: '6px 12px', cursor: 'pointer', fontWeight: '800', flexShrink: 0 }}>
                    닫기
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <div ref={mapContainerRef} style={{ width: '100%', height: '400px', backgroundColor: '#f8fafc' }} />
                  {isMapLoading && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(248,250,252,0.85)', fontWeight: '700', color: '#64748b' }}>지도를 불러오는 중...</div>}
                  {mapError && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.92)', color: '#ef4444', fontWeight: '700', textAlign: 'center', padding: '20px' }}>{mapError}</div>}
                </div>
              </div>
            </div>
        )}
      </div>
  );
};

export default GroupListPage;
