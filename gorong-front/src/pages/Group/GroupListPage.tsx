// 경로: src/pages/Group/GroupListPage.tsx
// 웹 3컬럼 레이아웃: 좌(필터) | 중(카드 리스트) | 우(상세 미리보기)

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useChatRoom } from '../../hooks/useChatRoom';
import { useCatTowerPreview } from '../../contexts/CatTowerPreviewContext';

const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_API_KEY || '';
const ITEMS_PER_PAGE = 15;

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
type StatusTab = 'open' | 'inProgress' | 'closed' | 'joined';
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

const matchesDateFilter = (meetingDate: string | undefined, filter: DateFilter): boolean => {
  if (filter === 'ALL') return true;
  if (!meetingDate) return false;
  const meeting = new Date(meetingDate);
  meeting.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  if (filter === 'today') return meeting.getTime() === today.getTime();
  if (filter === 'thisWeekend') {
    const sat = new Date(today); sat.setDate(today.getDate() + ((6 - dayOfWeek + 7) % 7));
    const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
    const mt = meeting.getTime();
    return mt === sat.getTime() || mt === sun.getTime();
  }
  if (filter === 'thisWeek') {
    const mon = new Date(today); mon.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    const mt = meeting.getTime();
    return mt >= mon.getTime() && mt <= sun.getTime();
  }
  if (filter === 'nextWeek') {
    const mon = new Date(today); mon.setDate(today.getDate() - ((dayOfWeek + 6) % 7) + 7);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    const mt = meeting.getTime();
    return mt >= mon.getTime() && mt <= sun.getTime();
  }
  return true;
};

const isUrgent = (g: Group): boolean => {
  const cur = g.currentCapacity ?? 0; const max = g.maxCapacity ?? 999;
  const pct = max > 0 ? cur / max : 0;
  const capacityUrgent = pct >= 0.75 && cur < max;
  if (!g.meetingDate) return capacityUrgent;
  const meeting = new Date(g.meetingDate); meeting.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((meeting.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return capacityUrgent || (diffDays >= 0 && diffDays <= 3);
};

// ── 색상 헬퍼 ──────────────────────────────────────────
const STATUS_CONFIG = {
  open:       { label: '모집중', dot: '#10b981', bg: '#ecfdf5', color: '#059669' },
  inProgress: { label: '진행중', dot: '#3b82f6', bg: '#eff6ff', color: '#2563eb' },
  closed:     { label: '마감',   dot: '#94a3b8', bg: '#f1f5f9', color: '#64748b' },
  joined:     { label: '참여중', dot: '#10b981', bg: '#ecfdf5', color: '#059669' },
};

const GroupListPage = () => {
  const navigate = useNavigate();
  const { openCatTower } = useCatTowerPreview();
  const { isMyGroup } = useChatRoom();

  const [groups, setGroups]                           = useState<Group[]>([]);
  const [searchTerm, setSearchTerm]                   = useState('');
  const [selectedEventFilter, setSelectedEventFilter] = useState('ALL');
  const [sortOrder, setSortOrder]                     = useState<SortOrder>('createdAt');
  const [statusTab, setStatusTab]                     = useState<StatusTab>('open');
  const [dateFilter, setDateFilter]                   = useState<DateFilter>('ALL');
  const [currentPage, setCurrentPage]                 = useState(1);
  const [joinedGroupIds, setJoinedGroupIds]           = useState<number[]>([]);
  const [selectedGroup, setSelectedGroup]             = useState<Group | null>(null);
  const [mapReady, setMapReady]                       = useState(false);
  const [mapLoading, setMapLoading]                   = useState(false);
  const [mapError, setMapError]                       = useState('');
  const previewMapRef = useRef<HTMLDivElement>(null);
  const mapMarkerRef  = useRef<any>(null);

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

  // 우측 패널 미니맵
  useEffect(() => {
    if (!selectedGroup || !previewMapRef.current) return;
    const loc = selectedGroup.location?.trim();
    if (!loc) { setMapReady(false); return; }
    let cancelled = false;
    const run = async () => {
      setMapLoading(true); setMapError(''); setMapReady(false);
      try {
        await loadKakaoMapSdk();
        if (cancelled || !previewMapRef.current) return;
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
        if (cancelled || !previewMapRef.current) return;
        const map = new window.kakao.maps.Map(previewMapRef.current, { center: pos, level: 4 });
        if (mapMarkerRef.current) mapMarkerRef.current.setMap(null);
        mapMarkerRef.current = new window.kakao.maps.Marker({ position: pos, map });
        new window.kakao.maps.InfoWindow({
          content: `<div style="padding:6px 10px;font-size:12px;font-weight:700;white-space:nowrap;">${escapeHtml(loc)}</div>`,
        }).open(map, mapMarkerRef.current);
        if (!cancelled) setMapReady(true);
      } catch { if (!cancelled) setMapError('위치를 찾지 못했습니다.'); }
      finally { if (!cancelled) setMapLoading(false); }
    };
    run();
    return () => { cancelled = true; };
  }, [selectedGroup, loadKakaoMapSdk]);

  const fetchGroups = () => axiosInstance.get<Group[]>('/groups').then(r => setGroups(r.data)).catch(console.error);
  const fetchJoinedGroupIds = async () => {
    try { const r = await axiosInstance.get<number[]>('/groups/joined-ids'); setJoinedGroupIds(r.data); } catch {}
  };

  const toPermissionShape = (g: Group): GroupForPermission => ({ authorEmail: g.author?.email, authorName: g.authorName });

  const handleGoToHost = useCallback((e: React.MouseEvent, g: Group) => {
    e.stopPropagation();
    const id = g.author?.id;
    if (id != null && Number.isFinite(id) && id > 0) openCatTower(id);
  }, [openCatTower]);

  const eventCategories = useMemo(() =>
          Array.from(new Set(groups.map(g => g.event?.trim()).filter(Boolean) as string[])).sort((a,b) => a.localeCompare(b,'ko')),
      [groups]
  );

  const getDisplayStatus = (g: Group): StatusTab => {
    if (isDatePassed(g.meetingDate) || g.status === 'CLOSED') return 'closed';
    if (g.status === 'IN_PROGRESS') return 'inProgress';
    if ((g.currentCapacity ?? 0) >= (g.maxCapacity ?? 999)) return 'inProgress';
    return 'open';
  };

  const filteredGroups = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return groups.filter(g => {
      const matchSearch = !q || g.title?.toLowerCase().includes(q) || g.event?.toLowerCase().includes(q) || g.location?.toLowerCase().includes(q);
      const matchEvent  = selectedEventFilter === 'ALL' || g.event?.trim() === selectedEventFilter;
      const matchDate   = matchesDateFilter(g.meetingDate, dateFilter);
      if (statusTab === 'joined') return matchSearch && matchEvent && joinedGroupIds.includes(g.id) && matchDate;
      return matchSearch && matchEvent && getDisplayStatus(g) === statusTab && matchDate;
    });
  }, [groups, searchTerm, selectedEventFilter, dateFilter, statusTab, joinedGroupIds]);

  const sortedGroups = useMemo(() => [...filteredGroups].sort((a, b) => {
    if (sortOrder === 'meetingDate') {
      if (!a.meetingDate && !b.meetingDate) return b.id - a.id;
      if (!a.meetingDate) return 1; if (!b.meetingDate) return -1;
      return new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime();
    }
    return b.id - a.id;
  }), [filteredGroups, sortOrder]);

  const totalPages      = Math.max(1, Math.ceil(sortedGroups.length / ITEMS_PER_PAGE));
  const paginatedGroups = sortedGroups.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const counts = useMemo(() => ({
    open:       groups.filter(g => getDisplayStatus(g) === 'open').length,
    inProgress: groups.filter(g => getDisplayStatus(g) === 'inProgress').length,
    closed:     groups.filter(g => getDisplayStatus(g) === 'closed').length,
    joined:     joinedGroupIds.length,
  }), [groups, joinedGroupIds]);

  const dateFilterOptions: { key: DateFilter; label: string }[] = [
    { key: 'ALL', label: '전체' }, { key: 'today', label: '오늘' },
    { key: 'thisWeekend', label: '이번 주말' }, { key: 'thisWeek', label: '이번 주' },
    { key: 'nextWeek', label: '다음 주' },
  ];

  // ── 스타일 헬퍼 ────────────────────────────────────────
  const panelBase: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '16px',
    border: '1px solid #f0f0f0',
    overflow: 'hidden',
  };

  return (
      /* 전체 배경 — 화면 끝까지 */
      <div style={{
        backgroundColor: '#f5f5f0',
        minHeight: 'calc(100vh - 64px)',
        marginTop: '-64px',
        paddingTop: '64px',
        fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
      }}>
        {/* ▼ 3컬럼 래퍼 — 최대 너비 제한 + 중앙 정렬 + 좌우 여백 */}
        <div style={{
          display: 'flex',
          minHeight: 'calc(100vh - 64px)',
          maxWidth: '1400px',
          margin: '0 auto',
          borderLeft: '1px solid #ebe8e3',
          borderRight: '1px solid #ebe8e3',
        }}>

          {/* ══════════════════════════════════════════════════
          LEFT COLUMN — 필터 패널 (240px fixed)
      ══════════════════════════════════════════════════ */}
          <aside style={{
            width: '300px',
            flexShrink: 0,
            padding: '28px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            borderRight: '1px solid #ebe8e3',
            backgroundColor: '#faf9f7',
            position: 'sticky',
            top: '64px',
            height: 'calc(100vh - 64px)',
            overflowY: 'auto',
          }}>

            {/* 로고/타이틀 */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#ff8a3d', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px' }}>
                GORONG
              </div>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#1a1a1a', lineHeight: 1.2 }}>
                모집 게시판
              </h2>
              <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>
                함께할 동행자를 찾아보세요
              </p>
            </div>

            {/* 글쓰기 버튼 */}
            <button
                onClick={() => navigate('/groups/create')}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: '12px', border: 'none',
                  background: 'linear-gradient(135deg, #ff8a3d 0%, #ff5e00 100%)',
                  color: 'white', fontWeight: '800', fontSize: '15px', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(255,94,0,0.3)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(255,94,0,0.4)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(255,94,0,0.3)' }}
            >
              <span style={{ fontSize: '16px' }}>+</span> 모집글 작성
            </button>

            {/* 통계 요약 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { label: '모집중', count: counts.open, color: '#10b981' },
                { label: '진행중', count: counts.inProgress, color: '#3b82f6' },
                { label: '마감',   count: counts.closed,     color: '#94a3b8' },
                { label: '참여중', count: counts.joined,     color: '#ff8a3d' },
              ].map(({ label, count, color }) => (
                  <div key={label} style={{
                    backgroundColor: 'white', borderRadius: '12px', padding: '12px 14px',
                    border: '1px solid #f0f0f0', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '22px', fontWeight: '900', color }}>{count}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginTop: '2px' }}>{label}</div>
                  </div>
              ))}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #ebe8e3', margin: '0' }} />

            {/* 상태 필터 */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
                모집 상태
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {(['open', 'inProgress', 'closed', 'joined'] as StatusTab[]).map(key => {
                  const cfg = STATUS_CONFIG[key];
                  const isActive = statusTab === key;
                  const cnt = key === 'joined' ? counts.joined : counts[key as 'open'|'inProgress'|'closed'];
                  return (
                      <button
                          key={key}
                          onClick={() => setStatusTab(key)}
                          style={{
                            width: '100%', padding: '10px 14px', borderRadius: '10px', border: 'none',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                            backgroundColor: isActive ? '#fff4ed' : 'transparent',
                            color: isActive ? '#ff5e00' : '#64748b',
                            fontWeight: isActive ? '800' : '600',
                            fontSize: '14px', textAlign: 'left',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f5f5f0' }}
                          onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
                      >
                  <span style={{
                    width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                    backgroundColor: isActive ? '#ff8a3d' : cfg.dot,
                  }} />
                        <span style={{ flex: 1 }}>{cfg.label}</span>
                        <span style={{
                          fontSize: '11px', fontWeight: '800', padding: '1px 7px',
                          borderRadius: '20px', backgroundColor: isActive ? '#ffe4cc' : '#f1f5f9',
                          color: isActive ? '#ff5e00' : '#94a3b8',
                        }}>{cnt}</span>
                      </button>
                  );
                })}
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #ebe8e3', margin: '0' }} />

            {/* 날짜 필터 */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
                날짜
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {dateFilterOptions.map(({ key, label }) => {
                  const isActive = dateFilter === key;
                  return (
                      <button key={key} onClick={() => setDateFilter(key)}
                              style={{
                                width: '100%', padding: '9px 14px', borderRadius: '10px', border: 'none',
                                cursor: 'pointer', textAlign: 'left', fontSize: '14px',
                                backgroundColor: isActive ? '#fff4ed' : 'transparent',
                                color: isActive ? '#ff5e00' : '#64748b',
                                fontWeight: isActive ? '800' : '600',
                                transition: 'all 0.15s',
                              }}
                              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f5f5f0' }}
                              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
                      >
                        {label}
                      </button>
                  );
                })}
              </div>
            </div>

            {/* 행사 분류 */}
            {eventCategories.length > 0 && (
                <>
                  <hr style={{ border: 'none', borderTop: '1px solid #ebe8e3', margin: '0' }} />
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
                      행사 분류
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {['ALL', ...eventCategories].map(ev => {
                        const isActive = selectedEventFilter === ev;
                        return (
                            <button key={ev} onClick={() => setSelectedEventFilter(ev)}
                                    style={{
                                      width: '100%', padding: '8px 12px', borderRadius: '10px', border: 'none',
                                      cursor: 'pointer', textAlign: 'left', fontSize: '12px',
                                      backgroundColor: isActive ? '#fff4ed' : 'transparent',
                                      color: isActive ? '#ff5e00' : '#64748b',
                                      fontWeight: isActive ? '800' : '600',
                                      transition: 'all 0.15s',
                                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}
                                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f5f5f0' }}
                                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
                                    title={ev === 'ALL' ? '전체' : ev}
                            >
                              {ev === 'ALL' ? '전체' : ev}
                            </button>
                        );
                      })}
                    </div>
                  </div>
                </>
            )}
          </aside>

          {/* ══════════════════════════════════════════════════
          CENTER COLUMN — 카드 리스트
      ══════════════════════════════════════════════════ */}
          <main style={{
            flex: 1,
            minWidth: 0,
            padding: '24px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overflowY: 'auto',
            height: 'calc(100vh - 64px)',
          }}>

            {/* ▼ 콘텐츠 너비 제한 래퍼 — 검색바/카운트/카드/페이지네이션 전체 포함 */}
            <div style={{ maxWidth: '680px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* 상단 컨트롤 바 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* 검색 */}
                <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <span style={{
              position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)',
              fontSize: '14px', pointerEvents: 'none', opacity: 0.45,
            }}>🔍</span>
                  <input
                      type="text"
                      placeholder="제목, 행사명, 장소 검색..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 14px 10px 38px',
                        borderRadius: '12px', border: '1.5px solid #e8e5e0',
                        boxSizing: 'border-box', outline: 'none', fontSize: '13px',
                        backgroundColor: 'white', fontFamily: 'inherit',
                        transition: 'border-color 0.15s',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#ff8a3d' }}
                      onBlur={e =>  { e.currentTarget.style.borderColor = '#e8e5e0' }}
                  />
                </div>

                {/* 정렬 */}
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  {([
                    { key: 'createdAt' as SortOrder, label: '최신순' },
                    { key: 'meetingDate' as SortOrder, label: '일정순' },
                  ]).map(({ key, label }) => (
                      <button key={key} onClick={() => setSortOrder(key)}
                              style={{
                                padding: '9px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '700',
                                cursor: 'pointer', border: '1.5px solid',
                                borderColor: sortOrder === key ? '#ff8a3d' : '#e8e5e0',
                                backgroundColor: sortOrder === key ? '#fff4ed' : 'white',
                                color: sortOrder === key ? '#ff5e00' : '#64748b',
                                transition: 'all 0.15s',
                              }}
                      >{label}</button>
                  ))}
                </div>
              </div>

              {/* 결과 카운트 */}
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', paddingLeft: '2px' }}>
                {sortedGroups.length > 0
                    ? `총 ${sortedGroups.length}개의 모집글`
                    : ''}
              </div>

              {/* 카드 목록 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {paginatedGroups.map(group => {
                  const cur = group.currentCapacity ?? 0;
                  const max = group.maxCapacity ?? 4;
                  const pct = Math.min(100, Math.round((cur / max) * 100));
                  const isPassed   = isDatePassed(group.meetingDate);
                  const ds         = getDisplayStatus(group);
                  const isClosed   = ds === 'closed';
                  const isJoined   = joinedGroupIds.includes(group.id);
                  const canEdit    = isMyGroup(toPermissionShape(group));
                  const urgent     = ds === 'open' && isUrgent(group);
                  const isSelected = selectedGroup?.id === group.id;
                  const cfg        = STATUS_CONFIG[ds];

                  return (
                      <div
                          key={group.id}
                          onClick={() => {
                            setSelectedGroup(group);
                            setMapReady(false);
                            setMapError('');
                          }}
                          style={{
                            backgroundColor: 'white',
                            borderRadius: '14px',
                            cursor: 'pointer',
                            border: `1.5px solid ${isSelected ? '#ff8a3d' : urgent ? '#fed7aa' : '#f0eee9'}`,
                            boxShadow: isSelected
                                ? '0 0 0 3px rgba(255,138,61,0.15), 0 4px 16px rgba(255,94,0,0.12)'
                                : '0 1px 4px rgba(0,0,0,0.04)',
                            transition: 'all 0.15s',
                            overflow: 'hidden',
                            position: 'relative',
                          }}
                          onMouseEnter={e => {
                            if (!isSelected) {
                              (e.currentTarget as HTMLDivElement).style.borderColor = '#ffc499';
                              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
                            }
                          }}
                          onMouseLeave={e => {
                            if (!isSelected) {
                              (e.currentTarget as HTMLDivElement).style.borderColor = urgent ? '#fed7aa' : '#f0eee9';
                              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
                            }
                          }}
                      >
                        {/* 마감 임박 스트라이프 */}
                        {urgent && (
                            <div style={{
                              height: '3px',
                              background: 'linear-gradient(90deg, #ff5e00, #ff8a3d, #ffb347)',
                            }} />
                        )}

                        {/* ▼ Option C: 2행 초압축 — 제목행 / (메타+진행바+인원+호스트) 통합행 */}
                        <div style={{ padding: '9px 13px', display: 'flex', flexDirection: 'column', gap: '5px' }}>

                          {/* 1행: 제목 · 뱃지들 · 상태 */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{
                          fontSize: '13px', fontWeight: '800',
                          color: isClosed ? '#94a3b8' : '#1a1a1a',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          flex: 1, minWidth: 0,
                        }}>
                          {group.title}
                        </span>
                            {canEdit && (
                                <span style={{ fontSize: '10px', backgroundColor: '#fff4ed', color: '#ff8a3d', padding: '1px 5px', borderRadius: '5px', fontWeight: '700', flexShrink: 0 }}>
                            내 글
                          </span>
                            )}
                            {isJoined && !canEdit && (
                                <span style={{ fontSize: '10px', backgroundColor: '#ecfdf5', color: '#10b981', padding: '1px 5px', borderRadius: '5px', fontWeight: '700', flexShrink: 0 }}>
                            참여중
                          </span>
                            )}
                            {urgent && (
                                <span style={{ fontSize: '10px', backgroundColor: '#fff4ed', color: '#ff5e00', padding: '1px 5px', borderRadius: '5px', fontWeight: '800', flexShrink: 0 }}>
                            마감임박
                          </span>
                            )}
                            <span style={{
                              flexShrink: 0, fontSize: '10px', fontWeight: '800',
                              padding: '2px 7px', borderRadius: '20px',
                              backgroundColor: cfg.bg, color: cfg.color,
                              display: 'flex', alignItems: 'center', gap: '3px',
                            }}>
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: cfg.dot, display: 'inline-block' }} />
                              {cfg.label}
                        </span>
                          </div>

                          {/* 2행: 장소 · 날짜 · 행사 · 진행바 · 인원 · 호스트 — 전부 한 줄 */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '11px', color: '#94a3b8', minWidth: 0 }}>
                            {group.location && (
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px', flexShrink: 1 }}>
                            📍 {group.location}
                          </span>
                            )}
                            {group.meetingDate && (
                                <>
                                  <span style={{ color: '#e2ddd8', flexShrink: 0 }}>·</span>
                                  <span style={{ color: isPassed ? '#cbd5e1' : '#94a3b8', flexShrink: 0 }}>
                              📅 {group.meetingDate}
                            </span>
                                </>
                            )}
                            {group.event && (
                                <>
                                  <span style={{ color: '#e2ddd8', flexShrink: 0 }}>·</span>
                                  <span style={{ backgroundColor: '#f8f8f5', border: '1px solid #ebe8e3', padding: '0px 6px', borderRadius: '5px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>
                              🎟️ {group.event}
                            </span>
                                </>
                            )}

                            {/* 오른쪽 끝: 진행바 + 인원 + 호스트 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', flexShrink: 0 }}>
                              <div style={{ width: '52px', height: '3px', backgroundColor: '#f1f0ec', borderRadius: '99px', overflow: 'hidden', flexShrink: 0 }}>
                                <div style={{
                                  height: '100%', width: `${pct}%`,
                                  backgroundColor: isClosed ? '#cbd5e1' : urgent ? '#f97316' : '#ff8a3d',
                                  borderRadius: '99px', transition: 'width 0.4s',
                                }} />
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: '800', color: isClosed ? '#94a3b8' : urgent ? '#f97316' : '#ff8a3d', flexShrink: 0 }}>
                            {cur}/{max}명
                          </span>
                              <span style={{ color: '#e2ddd8', flexShrink: 0 }}>·</span>
                              {group.author?.id
                                  ? <button type="button" onClick={e => handleGoToHost(e, group)}
                                            style={{ border: 'none', background: 'transparent', padding: 0, color: '#ff8a3d', fontWeight: '700', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline', textUnderlineOffset: '2px', flexShrink: 0 }}>
                                    {group.authorName || '익명'}
                                  </button>
                                  : <span style={{ fontWeight: '600', color: '#64748b', flexShrink: 0 }}>{group.authorName || '익명'}</span>
                              }
                            </div>
                          </div>

                        </div>
                      </div>
                  );
                })}
              </div>

              {/* 빈 결과 */}
              {sortedGroups.length === 0 && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>
                      {dateFilter !== 'ALL' ? '📅' : statusTab === 'joined' ? '🤝' : statusTab === 'open' ? '🔍' : '📭'}
                    </div>
                    <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#64748b' }}>
                      {dateFilter !== 'ALL' ? '해당 날짜에 열리는 모임이 없습니다.'
                          : statusTab === 'joined' ? '참여 중인 모임이 없습니다.'
                              : statusTab === 'open' ? '현재 모집 중인 게시글이 없습니다.'
                                  : statusTab === 'inProgress' ? '진행 중인 모임이 없습니다.'
                                      : '마감된 게시글이 없습니다.'}
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#94a3b8' }}>필터를 변경해보세요.</p>
                  </div>
              )}

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', paddingTop: '8px', paddingBottom: '24px' }}>
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                            style={{ padding: '7px 13px', borderRadius: '9px', fontWeight: '700', fontSize: '12px', cursor: currentPage === 1 ? 'default' : 'pointer', border: '1px solid #e8e5e0', backgroundColor: currentPage === 1 ? '#f8f8f5' : 'white', color: currentPage === 1 ? '#cbd5e1' : '#64748b' }}>
                      이전
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                        <button key={n} onClick={() => setCurrentPage(n)}
                                style={{ minWidth: '34px', padding: '7px', borderRadius: '9px', fontWeight: '800', fontSize: '12px', cursor: 'pointer', border: `1.5px solid ${currentPage === n ? '#ff8a3d' : '#e8e5e0'}`, backgroundColor: currentPage === n ? '#fff4ed' : 'white', color: currentPage === n ? '#ff5e00' : '#64748b' }}>
                          {n}
                        </button>
                    ))}
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                            style={{ padding: '7px 13px', borderRadius: '9px', fontWeight: '700', fontSize: '12px', cursor: currentPage === totalPages ? 'default' : 'pointer', border: '1px solid #e8e5e0', backgroundColor: currentPage === totalPages ? '#f8f8f5' : 'white', color: currentPage === totalPages ? '#cbd5e1' : '#64748b' }}>
                      다음
                    </button>
                  </div>
              )}

            </div> {/* ▲ 콘텐츠 너비 제한 래퍼 닫기 */}
          </main>

          {/* ══════════════════════════════════════════════════
          RIGHT COLUMN — 상세 미리보기 패널 (360px)
      ══════════════════════════════════════════════════ */}
          <aside style={{
            width: '400px',
            flexShrink: 0,
            padding: '24px 20px',
            borderLeft: '1px solid #ebe8e3',
            backgroundColor: '#faf9f7',
            position: 'sticky',
            top: '64px',
            height: 'calc(100vh - 64px)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}>
            {!selectedGroup ? (
                // 빈 상태
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#c0bab4', gap: '12px', padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', opacity: 0.5 }}>👈</div>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#94a3b8' }}>
                    왼쪽 목록에서<br />모집글을 선택하면<br />미리보기가 표시됩니다
                  </p>
                </div>
            ) : (() => {
              const g = selectedGroup;
              const cur = g.currentCapacity ?? 0;
              const max = g.maxCapacity ?? 4;
              const pct = Math.min(100, Math.round((cur / max) * 100));
              const ds      = getDisplayStatus(g);
              const isClosed = ds === 'closed';
              const urgent  = ds === 'open' && isUrgent(g);
              const isJoined = joinedGroupIds.includes(g.id);
              const canEdit  = isMyGroup(toPermissionShape(g));
              const cfg      = STATUS_CONFIG[ds];

              return (
                  <>
                    {/* 헤더 */}
                    <div style={{
                      ...panelBase,
                      background: 'linear-gradient(135deg, #ff8a3d 0%, #ff5500 100%)',
                      padding: '20px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: 'white', lineHeight: 1.35 }}>
                          {g.title}
                        </h3>
                        <span style={{
                          flexShrink: 0, fontSize: '10px', fontWeight: '800',
                          padding: '3px 9px', borderRadius: '20px',
                          backgroundColor: 'rgba(255,255,255,0.25)', color: 'white',
                        }}>
                    {cfg.label}
                  </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>
                        {g.event && `🎟️ ${g.event}`}
                      </div>

                      {/* 진행 바 */}
                      <div style={{ marginTop: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', fontWeight: '700' }}>참여 현황</span>
                          <span style={{ fontSize: '12px', color: 'white', fontWeight: '900' }}>{cur}/{max}명 ({pct}%)</span>
                        </div>
                        <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '99px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, backgroundColor: 'white', borderRadius: '99px', transition: 'width 0.4s' }} />
                        </div>
                      </div>
                    </div>

                    {/* 상세 정보 그리드 */}
                    <div style={{ ...panelBase, padding: '16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {[
                          { icon: '📍', label: '장소', value: g.location || '미정' },
                          { icon: '📅', label: '날짜', value: g.meetingDate || '미정' },
                          { icon: '⏰', label: '시간', value: g.meetingTime || '미정' },
                          { icon: '📋', label: '조건', value: g.condition || '제한 없음' },
                        ].map(({ icon, label, value }) => (
                            <div key={label} style={{ padding: '10px 12px', backgroundColor: '#faf9f7', borderRadius: '10px' }}>
                              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', marginBottom: '3px' }}>{icon} {label}</div>
                              <div style={{ fontSize: '12px', color: '#1a1a1a', fontWeight: '700', wordBreak: 'break-all', lineHeight: 1.4 }}>{value}</div>
                            </div>
                        ))}
                      </div>
                    </div>

                    {/* 소개 */}
                    {g.content && (
                        <div style={{ ...panelBase, padding: '16px' }}>
                          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px' }}>
                            모임 소개
                          </div>
                          <p style={{
                            margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.7',
                            whiteSpace: 'pre-wrap',
                            display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}>
                            {g.content}
                          </p>
                        </div>
                    )}

                    {/* 호스트 */}
                    <div style={{ ...panelBase, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                        backgroundColor: '#ff8a3d', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '16px', fontWeight: '900', color: 'white',
                      }}>
                        {(g.authorName || '?').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>호스트</div>
                        {g.author?.id
                            ? <button type="button" onClick={e => handleGoToHost(e, g)}
                                      style={{ border: 'none', background: 'transparent', padding: 0, color: '#ff8a3d', fontWeight: '800', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                              {g.authorName || '익명'}
                            </button>
                            : <span style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a1a' }}>{g.authorName || '익명'}</span>
                        }
                      </div>
                      {canEdit && <span style={{ fontSize: '10px', backgroundColor: '#fff4ed', color: '#ff8a3d', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>내 글</span>}
                      {isJoined && !canEdit && <span style={{ fontSize: '10px', backgroundColor: '#ecfdf5', color: '#10b981', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>참여중</span>}
                    </div>

                    {/* 미니맵 */}
                    {g.location && (
                        <div style={{ ...panelBase }}>
                          <div style={{ padding: '12px 14px', borderBottom: '1px solid #f0f0ec', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>🗺️ 위치 미리보기</span>
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{g.location}</span>
                          </div>
                          <div style={{ position: 'relative' }}>
                            <div ref={previewMapRef} style={{ width: '100%', height: '160px', backgroundColor: '#f8f8f5' }} />
                            {mapLoading && (
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(248,248,245,0.9)', fontSize: '12px', color: '#64748b', fontWeight: '700' }}>
                                  지도 불러오는 중...
                                </div>
                            )}
                            {mapError && (
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.92)', fontSize: '12px', color: '#ef4444', fontWeight: '700', textAlign: 'center', padding: '12px' }}>
                                  {mapError}
                                </div>
                            )}
                          </div>
                        </div>
                    )}

                    {/* 액션 버튼 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '8px' }}>
                      <button
                          onClick={() => navigate(`/groups/${g.id}`)}
                          style={{
                            width: '100%', padding: '13px', borderRadius: '13px', border: 'none',
                            background: isClosed
                                ? '#f1f5f9'
                                : 'linear-gradient(135deg, #ff8a3d 0%, #ff5500 100%)',
                            color: isClosed ? '#94a3b8' : 'white',
                            fontWeight: '800', fontSize: '14px', cursor: 'pointer',
                            boxShadow: isClosed ? 'none' : '0 4px 14px rgba(255,94,0,0.3)',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { if (!isClosed) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(255,94,0,0.4)' }}
                          onMouseLeave={e => { if (!isClosed) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(255,94,0,0.3)' }}
                      >
                        {isClosed ? '마감된 모집' : '상세 페이지로 이동 →'}
                      </button>

                      {canEdit && (
                          <button
                              onClick={() => navigate(`/groups/edit/${g.id}`)}
                              style={{
                                width: '100%', padding: '11px', borderRadius: '13px',
                                border: '1.5px solid #e8e5e0', backgroundColor: 'white',
                                color: '#64748b', fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                                transition: 'all 0.15s',
                              }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f8f8f5' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'white' }}
                          >
                            ✏️ 모집글 수정
                          </button>
                      )}
                    </div>
                  </>
              );
            })()}
          </aside>
        </div> {/* ▲ 3컬럼 래퍼 닫기 */}
      </div>
  )
};

export default GroupListPage;