// 경로: src/pages/Group/GroupListPage.tsx
// 리디자인: 상단 헤더 + 필터바 / 2컬럼(카드 그리드 | 상세 패널)

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

const STATUS_CONFIG = {
  open:       { label: '모집중', dot: '#10b981', bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
  inProgress: { label: '진행중', dot: '#3b82f6', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  closed:     { label: '마감',   dot: '#94a3b8', bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
  joined:     { label: '참여중', dot: '#10b981', bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
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
  const [showFilters, setShowFilters]                 = useState(false);
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
      [groups]);

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

  // ── 공통 스타일 상수 ────────────────────────────────────────
  const ORANGE = '#ff6b2b';
  const ORANGE_LIGHT = '#fff4ee';
  const SURFACE = '#ffffff';
  const BG = '#f7f6f3';
  const BORDER = '#ece9e4';
  const TEXT_PRIMARY = '#18181b';
  const TEXT_SECONDARY = '#71717a';
  const TEXT_MUTED = '#a1a1aa';

  return (
      <div style={{
        backgroundColor: BG,
        minHeight: 'calc(100vh - 64px)',
        marginTop: '-64px',
        paddingTop: '64px',
        fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
      }}>

        {/* ── 페이지 헤더 ───────────────────────────────────────── */}
        <div style={{
          backgroundColor: SURFACE,
          borderBottom: `1px solid ${BORDER}`,
          padding: '20px 32px',
          position: 'sticky',
          top: '64px',
          zIndex: 10,
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* 상단 행: 타이틀 + 작성 버튼 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: ORANGE, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '2px' }}>
                  GORONG
                </div>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: TEXT_PRIMARY }}>
                  모집 게시판
                </h1>
              </div>
              <button
                  onClick={() => navigate('/groups/create')}
                  style={{
                    padding: '10px 20px', borderRadius: '10px', border: 'none',
                    background: `linear-gradient(135deg, #ff8a3d 0%, #ff5500 100%)`,
                    color: 'white', fontWeight: '800', fontSize: '14px', cursor: 'pointer',
                    boxShadow: '0 3px 10px rgba(255,94,0,0.3)',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    transition: 'box-shadow 0.15s, transform 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 5px 16px rgba(255,94,0,0.4)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 3px 10px rgba(255,94,0,0.3)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
              >
                <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> 모집글 작성
              </button>
            </div>

            {/* 하단 행: 상태 탭 + 검색 + 정렬 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>

              {/* 상태 탭 */}
              <div style={{ display: 'flex', gap: '4px', backgroundColor: BG, borderRadius: '10px', padding: '4px' }}>
                {(['open', 'inProgress', 'closed', 'joined'] as StatusTab[]).map(key => {
                  const cfg = STATUS_CONFIG[key];
                  const isActive = statusTab === key;
                  const cnt = key === 'joined' ? counts.joined : counts[key as 'open'|'inProgress'|'closed'];
                  return (
                      <button key={key} onClick={() => setStatusTab(key)}
                              style={{
                                padding: '6px 14px', borderRadius: '7px', border: 'none',
                                cursor: 'pointer', fontSize: '13px', fontWeight: isActive ? '800' : '600',
                                backgroundColor: isActive ? SURFACE : 'transparent',
                                color: isActive ? TEXT_PRIMARY : TEXT_SECONDARY,
                                boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.15s',
                                display: 'flex', alignItems: 'center', gap: '5px',
                                whiteSpace: 'nowrap',
                              }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isActive ? cfg.dot : TEXT_MUTED, flexShrink: 0, display: 'inline-block' }} />
                        {cfg.label}
                        <span style={{
                          fontSize: '11px', fontWeight: '700', padding: '1px 6px', borderRadius: '20px',
                          backgroundColor: isActive ? cfg.bg : '#f1f5f9',
                          color: isActive ? cfg.color : TEXT_MUTED,
                        }}>{cnt}</span>
                      </button>
                  );
                })}
              </div>

              {/* 검색 */}
              <div style={{ flex: 1, minWidth: '180px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', opacity: 0.4, pointerEvents: 'none' }}>🔍</span>
                <input
                    type="text"
                    placeholder="제목, 행사명, 장소 검색"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 12px 8px 34px',
                      borderRadius: '9px', border: `1.5px solid ${BORDER}`,
                      boxSizing: 'border-box', outline: 'none', fontSize: '13px',
                      backgroundColor: SURFACE, fontFamily: 'inherit',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = ORANGE }}
                    onBlur={e =>  { e.currentTarget.style.borderColor = BORDER }}
                />
              </div>

              {/* 정렬 */}
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                {([
                  { key: 'createdAt' as SortOrder, label: '최신순' },
                  { key: 'meetingDate' as SortOrder, label: '일정순' },
                ]).map(({ key, label }) => (
                    <button key={key} onClick={() => setSortOrder(key)}
                            style={{
                              padding: '7px 13px', borderRadius: '8px', fontSize: '12px', fontWeight: '700',
                              cursor: 'pointer', border: `1.5px solid ${sortOrder === key ? ORANGE : BORDER}`,
                              backgroundColor: sortOrder === key ? ORANGE_LIGHT : SURFACE,
                              color: sortOrder === key ? ORANGE : TEXT_SECONDARY,
                              transition: 'all 0.15s', whiteSpace: 'nowrap',
                            }}
                    >{label}</button>
                ))}
              </div>

              {/* 필터 토글 버튼 */}
              <button onClick={() => setShowFilters(v => !v)}
                      style={{
                        padding: '7px 13px', borderRadius: '8px', fontSize: '12px', fontWeight: '700',
                        cursor: 'pointer', border: `1.5px solid ${showFilters ? ORANGE : BORDER}`,
                        backgroundColor: showFilters ? ORANGE_LIGHT : SURFACE,
                        color: showFilters ? ORANGE : TEXT_SECONDARY,
                        transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0,
                      }}
              >
                ⚙️ 필터 {(dateFilter !== 'ALL' || selectedEventFilter !== 'ALL') && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: ORANGE, display: 'inline-block' }} />}
              </button>
            </div>

            {/* 펼쳐지는 부가 필터 행 */}
            {showFilters && (
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: '16px',
                  padding: '14px 16px', backgroundColor: BG, borderRadius: '10px',
                  borderTop: `1px solid ${BORDER}`,
                }}>
                  {/* 날짜 필터 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: TEXT_MUTED, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>날짜</span>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {dateFilterOptions.map(({ key, label }) => {
                        const isActive = dateFilter === key;
                        return (
                            <button key={key} onClick={() => setDateFilter(key)}
                                    style={{
                                      padding: '5px 11px', borderRadius: '20px', border: `1.5px solid ${isActive ? ORANGE : BORDER}`,
                                      cursor: 'pointer', fontSize: '12px', fontWeight: isActive ? '800' : '600',
                                      backgroundColor: isActive ? ORANGE_LIGHT : SURFACE,
                                      color: isActive ? ORANGE : TEXT_SECONDARY,
                                      transition: 'all 0.15s', whiteSpace: 'nowrap',
                                    }}
                            >{label}</button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 행사 분류 */}
                  {eventCategories.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: TEXT_MUTED, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>행사</span>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {['ALL', ...eventCategories].map(ev => {
                            const isActive = selectedEventFilter === ev;
                            return (
                                <button key={ev} onClick={() => setSelectedEventFilter(ev)}
                                        title={ev === 'ALL' ? '전체' : ev}
                                        style={{
                                          padding: '5px 11px', borderRadius: '20px', border: `1.5px solid ${isActive ? ORANGE : BORDER}`,
                                          cursor: 'pointer', fontSize: '12px', fontWeight: isActive ? '800' : '600',
                                          backgroundColor: isActive ? ORANGE_LIGHT : SURFACE,
                                          color: isActive ? ORANGE : TEXT_SECONDARY,
                                          transition: 'all 0.15s', maxWidth: '120px',
                                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}
                                >{ev === 'ALL' ? '전체' : ev}</button>
                            );
                          })}
                        </div>
                      </div>
                  )}
                </div>
            )}

          </div>
        </div>

        {/* ── 본문 2컬럼 ─────────────────────────────────────── */}
        <div style={{
          maxWidth: '1400px', margin: '0 auto',
          display: 'flex', gap: '0',
          minHeight: 'calc(100vh - 64px)',
        }}>

          {/* ══ 왼쪽: 카드 목록 ══════════════════════════════════ */}
          <main style={{
            flex: 1, minWidth: 0,
            padding: '24px 28px',
            overflowY: 'auto',
          }}>
            {/* 결과 카운트 + 통계 요약 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', color: TEXT_MUTED, fontWeight: '600' }}>
              {sortedGroups.length > 0 ? `총 ${sortedGroups.length}개` : ''}
            </span>
              {/* 미니 통계 칩 */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { label: '모집중', count: counts.open, color: '#10b981' },
                  { label: '진행중', count: counts.inProgress, color: '#3b82f6' },
                  { label: '마감', count: counts.closed, color: '#94a3b8' },
                  { label: '내 참여', count: counts.joined, color: ORANGE },
                ].map(({ label, count, color }) => (
                    <div key={label} style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '4px 10px', backgroundColor: SURFACE, borderRadius: '20px', border: `1px solid ${BORDER}`,
                      fontSize: '11px', fontWeight: '700', color: TEXT_SECONDARY,
                    }}>
                      <span style={{ fontWeight: '900', color }}>{count}</span>
                      {label}
                    </div>
                ))}
              </div>
            </div>

            {/* 카드 그리드 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
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
                          backgroundColor: SURFACE,
                          borderRadius: '14px',
                          cursor: 'pointer',
                          border: `1.5px solid ${isSelected ? ORANGE : urgent ? '#fed7aa' : BORDER}`,
                          boxShadow: isSelected
                              ? `0 0 0 3px rgba(255,138,61,0.15), 0 4px 16px rgba(255,94,0,0.1)`
                              : '0 1px 3px rgba(0,0,0,0.05)',
                          transition: 'all 0.15s',
                          overflow: 'hidden',
                          display: 'flex', flexDirection: 'column',
                          opacity: isClosed ? 0.75 : 1,
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) {
                            (e.currentTarget as HTMLDivElement).style.borderColor = '#ffc499';
                            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.09)';
                            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) {
                            (e.currentTarget as HTMLDivElement).style.borderColor = urgent ? '#fed7aa' : BORDER;
                            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                          }
                        }}
                    >
                      {/* 마감임박 강조 바 */}
                      {urgent && (
                          <div style={{ height: '3px', background: 'linear-gradient(90deg, #ff5e00, #ffb347)' }} />
                      )}

                      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>

                        {/* 1행: 상태 뱃지 + 내 글 / 참여중 + 마감임박 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{
                        fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '20px',
                        backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                        display: 'flex', alignItems: 'center', gap: '3px',
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: cfg.dot, display: 'inline-block' }} />
                        {cfg.label}
                      </span>
                          {urgent && (
                              <span style={{ fontSize: '10px', backgroundColor: '#fff4ed', color: '#ff5e00', padding: '2px 7px', borderRadius: '20px', fontWeight: '800', border: '1px solid #ffcca3' }}>
                          마감임박
                        </span>
                          )}
                          <div style={{ flex: 1 }} />
                          {canEdit && (
                              <span style={{ fontSize: '10px', backgroundColor: '#fff4ed', color: ORANGE, padding: '2px 7px', borderRadius: '20px', fontWeight: '700', border: '1px solid #ffcca3' }}>내 글</span>
                          )}
                          {isJoined && !canEdit && (
                              <span style={{ fontSize: '10px', backgroundColor: '#ecfdf5', color: '#10b981', padding: '2px 7px', borderRadius: '20px', fontWeight: '700', border: '1px solid #a7f3d0' }}>참여중</span>
                          )}
                        </div>

                        {/* 2행: 제목 */}
                        <div style={{
                          fontSize: '14px', fontWeight: '800',
                          color: isClosed ? TEXT_MUTED : TEXT_PRIMARY,
                          lineHeight: 1.4,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {group.title}
                        </div>

                        {/* 3행: 메타 정보 — 장소 · 날짜 · 행사 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {group.location && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: TEXT_SECONDARY }}>
                                <span style={{ opacity: 0.7, flexShrink: 0 }}>📍</span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.location}</span>
                              </div>
                          )}
                          {group.meetingDate && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: isPassed ? TEXT_MUTED : TEXT_SECONDARY }}>
                                <span style={{ opacity: 0.7, flexShrink: 0 }}>📅</span>
                                <span>{group.meetingDate}{group.meetingTime ? ` ${group.meetingTime}` : ''}</span>
                              </div>
                          )}
                          {group.event && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: TEXT_SECONDARY }}>
                                <span style={{ opacity: 0.7, flexShrink: 0 }}>🎟️</span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.event}</span>
                              </div>
                          )}
                        </div>

                        {/* 하단: 진행바 + 인원 + 호스트 */}
                        <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: `1px solid ${BG}` }}>
                          {/* 진행바 */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <span style={{ fontSize: '11px', color: TEXT_MUTED, fontWeight: '600' }}>참여 현황</span>
                            <span style={{ fontSize: '12px', fontWeight: '900', color: isClosed ? TEXT_MUTED : urgent ? '#f97316' : ORANGE }}>
                          {cur}/{max}명
                        </span>
                          </div>
                          <div style={{ height: '4px', backgroundColor: BG, borderRadius: '99px', overflow: 'hidden', marginBottom: '8px' }}>
                            <div style={{
                              height: '100%', width: `${pct}%`,
                              backgroundColor: isClosed ? '#cbd5e1' : urgent ? '#f97316' : ORANGE,
                              borderRadius: '99px', transition: 'width 0.4s',
                            }} />
                          </div>
                          {/* 호스트 */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div style={{
                              width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                              backgroundColor: ORANGE, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '10px', fontWeight: '900', color: 'white',
                            }}>
                              {(group.authorName || '?').charAt(0).toUpperCase()}
                            </div>
                            {group.author?.id
                                ? <button type="button" onClick={e => handleGoToHost(e, group)}
                                          style={{ border: 'none', background: 'transparent', padding: 0, color: ORANGE, fontWeight: '700', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                                  {group.authorName || '익명'}
                                </button>
                                : <span style={{ fontSize: '11px', fontWeight: '600', color: TEXT_SECONDARY }}>{group.authorName || '익명'}</span>
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center', gap: '10px' }}>
                  <div style={{ fontSize: '44px', opacity: 0.5 }}>
                    {dateFilter !== 'ALL' ? '📅' : statusTab === 'joined' ? '🤝' : statusTab === 'open' ? '🔍' : '📭'}
                  </div>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#64748b' }}>
                    {dateFilter !== 'ALL' ? '해당 날짜에 열리는 모임이 없습니다.'
                        : statusTab === 'joined' ? '참여 중인 모임이 없습니다.'
                            : statusTab === 'open' ? '현재 모집 중인 게시글이 없습니다.'
                                : statusTab === 'inProgress' ? '진행 중인 모임이 없습니다.'
                                    : '마감된 게시글이 없습니다.'}
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: TEXT_MUTED }}>필터를 변경해보세요.</p>
                </div>
            )}

            {/* 페이지네이션 */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', paddingTop: '24px', paddingBottom: '24px' }}>
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                          style={{ padding: '7px 14px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: currentPage === 1 ? 'default' : 'pointer', border: `1px solid ${BORDER}`, backgroundColor: currentPage === 1 ? BG : SURFACE, color: currentPage === 1 ? TEXT_MUTED : TEXT_SECONDARY }}>
                    이전
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                      <button key={n} onClick={() => setCurrentPage(n)}
                              style={{ minWidth: '34px', padding: '7px', borderRadius: '8px', fontWeight: '800', fontSize: '12px', cursor: 'pointer', border: `1.5px solid ${currentPage === n ? ORANGE : BORDER}`, backgroundColor: currentPage === n ? ORANGE_LIGHT : SURFACE, color: currentPage === n ? ORANGE : TEXT_SECONDARY }}>
                        {n}
                      </button>
                  ))}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                          style={{ padding: '7px 14px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: currentPage === totalPages ? 'default' : 'pointer', border: `1px solid ${BORDER}`, backgroundColor: currentPage === totalPages ? BG : SURFACE, color: currentPage === totalPages ? TEXT_MUTED : TEXT_SECONDARY }}>
                    다음
                  </button>
                </div>
            )}
          </main>

          {/* ══ 오른쪽: 상세 미리보기 패널 ══════════════════════ */}
          <aside style={{
            width: '380px',
            flexShrink: 0,
            borderLeft: `1px solid ${BORDER}`,
            backgroundColor: SURFACE,
            position: 'sticky',
            top: 'calc(64px + 113px)', // 헤더 높이만큼 오프셋 (필터 닫힘 기준)
            height: `calc(100vh - 64px)`,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {!selectedGroup ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '40px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '52px', opacity: 0.25 }}>📋</div>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: TEXT_MUTED, lineHeight: 1.6 }}>
                    모집글을 선택하면<br />상세 정보를 볼 수 있어요
                  </p>
                </div>
            ) : (() => {
              const g = selectedGroup;
              const cur = g.currentCapacity ?? 0;
              const max = g.maxCapacity ?? 4;
              const pct = Math.min(100, Math.round((cur / max) * 100));
              const ds       = getDisplayStatus(g);
              const isClosed = ds === 'closed';
              const urgent   = ds === 'open' && isUrgent(g);
              const isJoined = joinedGroupIds.includes(g.id);
              const canEdit  = isMyGroup(toPermissionShape(g));
              const cfg      = STATUS_CONFIG[ds];

              return (
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>

                    {/* 패널 헤더 */}
                    <div style={{
                      padding: '20px 22px',
                      background: isClosed
                          ? 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)'
                          : 'linear-gradient(135deg, #ff8a3d 0%, #ff5500 100%)',
                      flexShrink: 0,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '12px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: 'white', lineHeight: 1.4, flex: 1 }}>
                          {g.title}
                        </h3>
                        <span style={{ flexShrink: 0, fontSize: '11px', fontWeight: '800', padding: '3px 10px', borderRadius: '20px', backgroundColor: 'rgba(255,255,255,0.25)', color: 'white' }}>
                      {cfg.label}
                    </span>
                      </div>
                      {g.event && (
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', fontWeight: '700', marginBottom: '12px' }}>
                            🎟️ {g.event}
                          </div>
                      )}
                      {/* 참여 현황 */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', fontWeight: '700' }}>참여 현황</span>
                          <span style={{ fontSize: '13px', color: 'white', fontWeight: '900' }}>{cur}/{max}명 ({pct}%)</span>
                        </div>
                        <div style={{ height: '5px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '99px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, backgroundColor: 'white', borderRadius: '99px', transition: 'width 0.4s' }} />
                        </div>
                      </div>
                    </div>

                    {/* 상세 내용 스크롤 영역 */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                      {/* 상세 정보 그리드 */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {[
                          { icon: '📍', label: '장소', value: g.location || '미정' },
                          { icon: '📅', label: '날짜', value: g.meetingDate || '미정' },
                          { icon: '⏰', label: '시간', value: g.meetingTime || '미정' },
                          { icon: '📋', label: '조건', value: g.condition || '제한 없음' },
                        ].map(({ icon, label, value }) => (
                            <div key={label} style={{ padding: '10px 12px', backgroundColor: BG, borderRadius: '10px', border: `1px solid ${BORDER}` }}>
                              <div style={{ fontSize: '10px', color: TEXT_MUTED, fontWeight: '700', marginBottom: '3px' }}>{icon} {label}</div>
                              <div style={{ fontSize: '12px', color: TEXT_PRIMARY, fontWeight: '700', wordBreak: 'break-all', lineHeight: 1.4 }}>{value}</div>
                            </div>
                        ))}
                      </div>

                      {/* 호스트 */}
                      <div style={{ padding: '12px 14px', backgroundColor: BG, borderRadius: '10px', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                          backgroundColor: ORANGE, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '15px', fontWeight: '900', color: 'white',
                        }}>
                          {(g.authorName || '?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '10px', color: TEXT_MUTED, fontWeight: '700', marginBottom: '2px' }}>호스트</div>
                          {g.author?.id
                              ? <button type="button" onClick={e => handleGoToHost(e, g)}
                                        style={{ border: 'none', background: 'transparent', padding: 0, color: ORANGE, fontWeight: '800', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                                {g.authorName || '익명'}
                              </button>
                              : <span style={{ fontSize: '13px', fontWeight: '700', color: TEXT_PRIMARY }}>{g.authorName || '익명'}</span>
                          }
                        </div>
                        {canEdit && <span style={{ fontSize: '10px', backgroundColor: ORANGE_LIGHT, color: ORANGE, padding: '2px 8px', borderRadius: '6px', fontWeight: '700', border: `1px solid #ffcca3` }}>내 글</span>}
                        {isJoined && !canEdit && <span style={{ fontSize: '10px', backgroundColor: '#ecfdf5', color: '#10b981', padding: '2px 8px', borderRadius: '6px', fontWeight: '700', border: '1px solid #a7f3d0' }}>참여중</span>}
                      </div>

                      {/* 모임 소개 */}
                      {g.content && (
                          <div style={{ padding: '12px 14px', backgroundColor: BG, borderRadius: '10px', border: `1px solid ${BORDER}` }}>
                            <div style={{ fontSize: '10px', color: TEXT_MUTED, fontWeight: '800', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '7px' }}>모임 소개</div>
                            <p style={{
                              margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.7',
                              whiteSpace: 'pre-wrap',
                              display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                            }}>
                              {g.content}
                            </p>
                          </div>
                      )}

                      {/* 미니맵 */}
                      {g.location && (
                          <div style={{ borderRadius: '10px', border: `1px solid ${BORDER}`, overflow: 'hidden', backgroundColor: BG }}>
                            <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '12px', fontWeight: '700', color: TEXT_PRIMARY }}>🗺️ 위치 미리보기</span>
                              <span style={{ fontSize: '11px', color: TEXT_MUTED, fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>{g.location}</span>
                            </div>
                            <div style={{ position: 'relative' }}>
                              <div ref={previewMapRef} style={{ width: '100%', height: '160px', backgroundColor: '#eef0ec' }} />
                              {mapLoading && (
                                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(238,240,236,0.9)', fontSize: '12px', color: TEXT_SECONDARY, fontWeight: '700' }}>
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

                    </div>

                    {/* 하단 고정 액션 버튼 */}
                    <div style={{ padding: '14px 20px', borderTop: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0, backgroundColor: SURFACE }}>
                      <button
                          onClick={() => navigate(`/groups/${g.id}`)}
                          style={{
                            width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
                            background: isClosed ? '#f1f5f9' : 'linear-gradient(135deg, #ff8a3d 0%, #ff5500 100%)',
                            color: isClosed ? '#94a3b8' : 'white',
                            fontWeight: '800', fontSize: '14px', cursor: 'pointer',
                            boxShadow: isClosed ? 'none' : '0 3px 10px rgba(255,94,0,0.28)',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { if (!isClosed) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 5px 16px rgba(255,94,0,0.38)' }}
                          onMouseLeave={e => { if (!isClosed) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 3px 10px rgba(255,94,0,0.28)' }}
                      >
                        {isClosed ? '마감된 모집' : '상세 페이지로 이동 →'}
                      </button>
                      {canEdit && (
                          <button
                              onClick={() => navigate(`/groups/edit/${g.id}`)}
                              style={{
                                width: '100%', padding: '10px', borderRadius: '10px',
                                border: `1.5px solid ${BORDER}`, backgroundColor: SURFACE,
                                color: TEXT_SECONDARY, fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                                transition: 'all 0.15s',
                              }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = BG }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = SURFACE }}
                          >
                            ✏️ 모집글 수정
                          </button>
                      )}
                    </div>

                  </div>
              );
            })()}
          </aside>

        </div>
      </div>
  );
};

export default GroupListPage;