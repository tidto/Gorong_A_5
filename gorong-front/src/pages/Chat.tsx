import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send, Users, MessageSquare, Wifi, WifiOff, Loader2, Home, X, ChevronRight, SlidersHorizontal, Search } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useCatTowerPreview } from '../contexts/CatTowerPreviewContext'
import { useChatRoom, fetchJoinedGroups, JoinedGroup } from '../hooks/useChatRoom'

type FilterType = 'all' | 'open' | 'inProgress' | 'closed'
type SortType = 'date' | 'name' | 'capacity'

const FILTER_LABELS: Record<FilterType, string> = {
  all: '전체',
  open: '모집중',
  inProgress: '진행중',
  closed: '마감',
}

export default function Chat() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { openCatTower } = useCatTowerPreview()
  const { user } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isDatePassed = (dateStr?: string): boolean => {
    if (!dateStr) return false
    try {
      const meeting = new Date(dateStr)
      meeting.setHours(0, 0, 0, 0)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return meeting < today
    } catch { return false }
  }

  const [joinedGroups, setJoinedGroups] = useState<JoinedGroup[]>([])
  const [activeGroup, setActiveGroup] = useState<JoinedGroup | null>(null)
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [inputText, setInputText] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedProfile, setSelectedProfile] = useState<{
    name: string
    email?: string
    userId?: number | null
    isMe?: boolean
  } | null>(null)

  const [filter, setFilter] = useState<FilterType>('all')
  const [sort, setSort] = useState<SortType>('date')
  const [searchText, setSearchText] = useState('')
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  const {
    messages,
    isConnecting,
    isConnected,
    currentUserEmail,
    connect,
    sendMessage,
    isMyGroup,
  } = useChatRoom()

  const myNickname = user?.nickname || '나'

  const isClosed = activeGroup
      ? activeGroup.status === 'CLOSED' || isDatePassed(activeGroup.meetingDate)
      : false

  const getGroupStatus = (group: JoinedGroup): FilterType => {
    if (group.status === 'CLOSED' || isDatePassed(group.meetingDate)) return 'closed'
    if (group.status === 'IN_PROGRESS') return 'inProgress'
    return 'open'
  }

  const filterCounts = useMemo(() => ({
    all: joinedGroups.length,
    open: joinedGroups.filter(g => getGroupStatus(g) === 'open').length,
    inProgress: joinedGroups.filter(g => getGroupStatus(g) === 'inProgress').length,
    closed: joinedGroups.filter(g => getGroupStatus(g) === 'closed').length,
  }), [joinedGroups])

  const filteredGroups = useMemo(() => {
    let result = [...joinedGroups]
    if (filter !== 'all') result = result.filter(g => getGroupStatus(g) === filter)
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase()
      result = result.filter(g =>
          g.title.toLowerCase().includes(q) ||
          g.location?.toLowerCase().includes(q) ||
          g.event?.toLowerCase().includes(q)
      )
    }
    if (sort === 'date') result.sort((a, b) => (a.meetingDate ?? '').localeCompare(b.meetingDate ?? ''))
    else if (sort === 'name') result.sort((a, b) => a.title.localeCompare(b.title))
    else if (sort === 'capacity') result.sort((a, b) => b.currentCapacity - a.currentCapacity)
    return result
  }, [joinedGroups, filter, sort, searchText])

  useEffect(() => {
    setLoadingGroups(true)
    fetchJoinedGroups().then(groups => {
      setJoinedGroups(groups)
      setLoadingGroups(false)
      if (id && groups.length > 0) {
        const target = groups.find(g => String(g.id) === id)
        if (target) { setActiveGroup(target); connect(target.id, target.title) }
        else { setActiveGroup(groups[0]); connect(groups[0].id, groups[0].title) }
      } else if (groups.length > 0) {
        setActiveGroup(groups[0]); connect(groups[0].id, groups[0].title)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSelectRoom = useCallback((group: JoinedGroup) => {
    if (activeGroup?.id === group.id) return
    setActiveGroup(group)
    connect(group.id, group.title)
    navigate(`/chat/${group.id}`, { replace: true })
  }, [activeGroup, connect, navigate])

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return
    sendMessage(inputText)
    setInputText('')
  }, [inputText, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const participantMap = new Map<string, { name: string; email?: string; userId?: number | null }>()
  messages
      .filter(m => m.user !== '시스템' && !m.text.includes('채팅방'))
      .forEach(m => {
        const key = m.senderEmail || m.user
        if (!participantMap.has(key)) {
          participantMap.set(key, { name: m.user, email: m.senderEmail, userId: m.senderUserId })
        }
      })
  if (currentUserEmail) {
    participantMap.set(currentUserEmail, { name: myNickname, email: currentUserEmail })
  }
  const participants = Array.from(participantMap.values())

  const getDisplayName = (name: string, email?: string) =>
      email && email === currentUserEmail ? myNickname : name

  const getInitials = (name: string) =>
      name ? name.charAt(0).toUpperCase() : '?'

  const openProfileCard = (profile: { name: string; email?: string; userId?: number | null }) => {
    setSelectedProfile({ ...profile, isMe: Boolean(profile.email && profile.email === currentUserEmail) })
  }

  const getAvatarColor = (name: string) => {
    const colors = ['#E07B54', '#5B8EAD', '#7BAD7E', '#AD7BAD', '#AD9E5B', '#5B8EAD', '#AD5B6E', '#6E7BAD']
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
  }

  const getStatusBadge = (group: JoinedGroup) => {
    const s = getGroupStatus(group)
    if (s === 'closed') return { bg: '#F1F3F5', color: '#868E96', label: '마감' }
    if (s === 'inProgress') return { bg: '#FFF9DB', color: '#F08C00', label: '진행중' }
    return { bg: '#EBFBEE', color: '#2F9E44', label: '모집중' }
  }

  return (
      <div style={{
        display: 'flex',
        height: 'calc(100vh - 116px)',
        fontFamily: "'Pretendard', -apple-system, sans-serif",
        maxWidth: '1400px',
        margin: '0 auto',
        backgroundColor: '#F8F9FA',
      }}>
        <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .room-item:hover { background-color: #F1F3F5 !important; }
        .room-item.active { background-color: #FFF4EE !important; border-left-color: #FF8A3D !important; }
        .participant-chip:hover { background-color: #F1F3F5 !important; }
        .send-btn:hover:not(:disabled) { background-color: #E8722A !important; }
        .filter-chip:hover { background-color: #F1F3F5 !important; }
        .msg-bubble-other:hover { background-color: #F1F3F5 !important; }
      `}</style>

        {/* ── 사이드바 ── */}
        <div style={{
          width: sidebarOpen ? '300px' : '0',
          flexShrink: 0,
          backgroundColor: 'white',
          borderRight: '1px solid #E9ECEF',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'width 0.2s ease',
        }}>

          {/* 사이드바 헤더 */}
          <div style={{
            padding: '20px 20px 16px',
            borderBottom: '1px solid #E9ECEF',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={16} color="#FF8A3D" />
                <span style={{ fontWeight: '700', fontSize: '15px', color: '#212529', whiteSpace: 'nowrap' }}>
                채팅방
              </span>
                {!loadingGroups && (
                    <span style={{
                      fontSize: '11px', fontWeight: '600',
                      backgroundColor: '#F1F3F5', color: '#868E96',
                      padding: '1px 7px', borderRadius: '20px',
                    }}>
                  {filteredGroups.length}
                </span>
                )}
              </div>
              <button
                  onClick={() => setShowFilterPanel(v => !v)}
                  style={{
                    background: showFilterPanel ? '#FFF4EE' : 'transparent',
                    border: '1px solid',
                    borderColor: showFilterPanel ? '#FFD4A8' : '#DEE2E6',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    color: showFilterPanel ? '#FF8A3D' : '#868E96',
                    display: 'flex', alignItems: 'center', gap: '4px',
                    transition: 'all 0.15s',
                  }}
              >
                <SlidersHorizontal size={12} />
                <span style={{ fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}>필터</span>
              </button>
            </div>

            {/* 검색창 항상 표시 */}
            <div style={{ position: 'relative' }}>
              <Search size={13} color="#ADB5BD" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                  type="text"
                  placeholder="방 이름, 장소 검색..."
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 10px 8px 30px',
                    borderRadius: '8px', border: '1px solid #DEE2E6',
                    fontSize: '13px', backgroundColor: '#F8F9FA',
                    color: '#212529', outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#FF8A3D')}
                  onBlur={e => (e.target.style.borderColor = '#DEE2E6')}
              />
            </div>

            {/* 필터 패널 */}
            {showFilterPanel && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* 상태 필터 */}
                  <div>
                    <div style={{ fontSize: '11px', color: '#ADB5BD', fontWeight: '600', marginBottom: '6px' }}>상태</div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {(['all', 'open', 'inProgress', 'closed'] as FilterType[]).map(f => (
                          <button
                              key={f}
                              className="filter-chip"
                              onClick={() => setFilter(f)}
                              style={{
                                padding: '4px 10px', borderRadius: '6px',
                                border: '1px solid',
                                borderColor: filter === f ? '#FF8A3D' : '#DEE2E6',
                                cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                                backgroundColor: filter === f ? '#FFF4EE' : 'white',
                                color: filter === f ? '#FF8A3D' : '#495057',
                                transition: 'all 0.12s',
                              }}
                          >
                            {FILTER_LABELS[f]}
                            <span style={{ marginLeft: '4px', fontSize: '10px', color: filter === f ? '#FF8A3D' : '#ADB5BD' }}>
                        {filterCounts[f]}
                      </span>
                          </button>
                      ))}
                    </div>
                  </div>

                  {/* 정렬 */}
                  <div>
                    <div style={{ fontSize: '11px', color: '#ADB5BD', fontWeight: '600', marginBottom: '6px' }}>정렬</div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {(['date', 'name', 'capacity'] as SortType[]).map(s => (
                          <button
                              key={s}
                              className="filter-chip"
                              onClick={() => setSort(s)}
                              style={{
                                padding: '4px 10px', borderRadius: '6px',
                                border: '1px solid',
                                borderColor: sort === s ? '#FF8A3D' : '#DEE2E6',
                                cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                                backgroundColor: sort === s ? '#FFF4EE' : 'white',
                                color: sort === s ? '#FF8A3D' : '#495057',
                                transition: 'all 0.12s',
                              }}
                          >
                            {s === 'date' ? '날짜' : s === 'name' ? '이름' : '인원'}
                          </button>
                      ))}
                    </div>
                  </div>
                </div>
            )}
          </div>

          {/* 채팅방 목록 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {loadingGroups ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                  <Loader2 size={20} color="#FF8A3D" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
            ) : joinedGroups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 16px', color: '#ADB5BD' }}>
                  <Users size={32} style={{ marginBottom: '10px', opacity: 0.3, display: 'block', margin: '0 auto 10px' }} />
                  <p style={{ fontSize: '13px', lineHeight: '1.7', margin: 0 }}>
                    참여 중인 방이 없어요.<br />
                    <span onClick={() => navigate('/group')} style={{ color: '#FF8A3D', cursor: 'pointer', fontWeight: '700' }}>
                  모집게시판
                </span>에서 참여해보세요!
                  </p>
                </div>
            ) : filteredGroups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#ADB5BD' }}>
                  <p style={{ fontSize: '13px', margin: 0 }}>조건에 맞는 방이 없어요.</p>
                  <button
                      onClick={() => { setFilter('all'); setSearchText('') }}
                      style={{ marginTop: '8px', fontSize: '12px', color: '#FF8A3D', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700' }}
                  >
                    필터 초기화
                  </button>
                </div>
            ) : (
                filteredGroups.map(group => {
                  const isActive = activeGroup?.id === group.id
                  const badge = getStatusBadge(group)
                  return (
                      <div
                          key={group.id}
                          className={`room-item${isActive ? ' active' : ''}`}
                          onClick={() => handleSelectRoom(group)}
                          style={{
                            padding: '12px 20px',
                            cursor: 'pointer',
                            backgroundColor: isActive ? '#FFF4EE' : 'transparent',
                            borderLeft: '3px solid',
                            borderLeftColor: isActive ? '#FF8A3D' : 'transparent',
                            transition: 'all 0.12s ease',
                          }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <div style={{
                            width: '38px', height: '38px', borderRadius: '8px', flexShrink: 0,
                            backgroundColor: getAvatarColor(group.title),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '15px', fontWeight: '700', color: 'white',
                          }}>
                            {group.title.charAt(0)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontWeight: '600', fontSize: '13px',
                              color: isActive ? '#FF6B1A' : '#212529',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              marginBottom: '4px',
                            }}>
                              {group.title}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '10px', padding: '1px 6px', borderRadius: '4px', fontWeight: '600',
                          backgroundColor: badge.bg, color: badge.color,
                        }}>
                          {badge.label}
                        </span>
                              <span style={{ fontSize: '11px', color: '#ADB5BD' }}>
                          {group.currentCapacity}/{group.maxCapacity}명
                        </span>
                              {group.meetingDate && (
                                  <span style={{ fontSize: '11px', color: '#ADB5BD' }}>
                            {group.meetingDate.slice(5)}
                          </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                  )
                })
            )}
          </div>

          {/* 새 모임 참여 버튼 */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid #E9ECEF', flexShrink: 0 }}>
            <button
                onClick={() => navigate('/group')}
                style={{
                  width: '100%', padding: '9px', borderRadius: '8px',
                  border: '1.5px dashed #DEE2E6', backgroundColor: 'transparent',
                  color: '#868E96', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF8A3D'; e.currentTarget.style.color = '#FF8A3D'; e.currentTarget.style.backgroundColor = '#FFF4EE' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#DEE2E6'; e.currentTarget.style.color = '#868E96'; e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              + 새 모임 참여하기
            </button>
          </div>
        </div>

        {/* ── 우측 채팅 영역 ── */}
        {activeGroup ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, backgroundColor: 'white' }}>

              {/* 채팅방 헤더 */}
              <div style={{
                padding: '14px 24px',
                borderBottom: '1px solid #E9ECEF',
                flexShrink: 0,
                backgroundColor: 'white',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                      onClick={() => setSidebarOpen(v => !v)}
                      style={{
                        background: 'transparent', border: '1px solid #DEE2E6',
                        borderRadius: '8px', padding: '6px 9px', cursor: 'pointer',
                        color: '#495057', display: 'flex', alignItems: 'center', flexShrink: 0,
                        transition: 'all 0.12s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF8A3D'; e.currentTarget.style.color = '#FF8A3D' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#DEE2E6'; e.currentTarget.style.color = '#495057' }}
                  >
                    <Users size={15} />
                  </button>

                  {/* 방 아이콘 */}
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '8px', flexShrink: 0,
                    backgroundColor: getAvatarColor(activeGroup.title),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '15px', fontWeight: '700', color: 'white',
                  }}>
                    {activeGroup.title.charAt(0)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h1 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#212529', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '400px' }}>
                        {activeGroup.title}
                      </h1>
                      {isClosed && (
                          <span style={{
                            backgroundColor: '#FFF5F5', color: '#E03131',
                            border: '1px solid #FFC9C9', borderRadius: '4px',
                            padding: '1px 7px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap',
                          }}>
                      마감
                    </span>
                      )}
                      {isConnecting ? (
                          <Loader2 size={12} color="#ADB5BD" style={{ animation: 'spin 1s linear infinite' }} />
                      ) : isConnected ? (
                          <Wifi size={12} color="#2F9E44" />
                      ) : (
                          <WifiOff size={12} color="#ADB5BD" />
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#868E96', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      📍 {activeGroup.location}{activeGroup.event ? ` · 🎟 ${activeGroup.event}` : ''}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {isMyGroup(activeGroup) && (
                        <button
                            onClick={() => navigate(`/groups/edit/${activeGroup.id}`)}
                            style={{
                              padding: '6px 14px', borderRadius: '7px',
                              border: '1px solid #DEE2E6', backgroundColor: 'white',
                              color: '#495057', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                              transition: 'all 0.12s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF8A3D'; e.currentTarget.style.color = '#FF8A3D' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#DEE2E6'; e.currentTarget.style.color = '#495057' }}
                        >
                          수정
                        </button>
                    )}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      backgroundColor: '#F8F9FA', borderRadius: '7px',
                      padding: '5px 10px', border: '1px solid #E9ECEF',
                    }}>
                      <Users size={12} color="#868E96" />
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#495057' }}>{activeGroup.currentCapacity}명</span>
                    </div>
                  </div>
                </div>

                {/* 참여자 목록 */}
                {participants.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginTop: '12px', paddingBottom: '2px' }}>
                      {participants.map((participant) => {
                        const name = getDisplayName(participant.name, participant.email)
                        const isMe = participant.email === currentUserEmail
                        return (
                            <div
                                key={participant.email || participant.name}
                                className="participant-chip"
                                onClick={() => openProfileCard(participant)}
                                style={{
                                  flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px',
                                  padding: '4px 10px', borderRadius: '20px',
                                  border: '1px solid',
                                  borderColor: isMe ? '#FFD4A8' : '#E9ECEF',
                                  backgroundColor: isMe ? '#FFF4EE' : '#F8F9FA',
                                  cursor: 'pointer', transition: 'all 0.12s',
                                }}
                            >
                              <div style={{
                                width: '20px', height: '20px', borderRadius: '50%',
                                backgroundColor: getAvatarColor(name),
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: '700', fontSize: '10px', color: 'white', flexShrink: 0,
                              }}>
                                {getInitials(name)}
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: '600', color: isMe ? '#FF6B1A' : '#495057', whiteSpace: 'nowrap' }}>
                        {name}{isMe ? ' (나)' : ''}
                      </span>
                            </div>
                        )
                      })}
                    </div>
                )}
              </div>

              {/* 메시지 영역 */}
              <div style={{
                flex: 1, overflowY: 'auto', padding: '24px 28px',
                backgroundColor: '#F8F9FA',
                display: 'flex', flexDirection: 'column', gap: '2px',
              }}>
                {messages.length === 0 && !isConnecting && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ADB5BD', gap: '10px' }}>
                      <MessageSquare size={36} style={{ opacity: 0.25 }} />
                      <p style={{ fontSize: '14px', margin: 0, fontWeight: '500' }}>첫 번째 메시지를 보내보세요! 👋</p>
                    </div>
                )}

                {messages.map((msg, idx) => {
                  const isSystem = msg.user === '시스템' || msg.text.includes('채팅방')
                  const isMe = msg.isMe ?? (msg.user === currentUserEmail)

                  const prevMsg = idx > 0 ? messages[idx - 1] : null
                  const showDateDivider = (() => {
                    if (!msg.sentAt || !prevMsg?.sentAt) return false
                    return msg.sentAt.slice(0, 10) !== prevMsg.sentAt.slice(0, 10)
                  })()

                  if (isSystem) {
                    return (
                        <div key={idx} style={{ textAlign: 'center', marginBottom: '8px', marginTop: '4px' }}>
                    <span style={{
                      display: 'inline-block', backgroundColor: '#E9ECEF',
                      color: '#868E96', fontSize: '11px', padding: '3px 12px',
                      borderRadius: '20px', fontWeight: '500',
                    }}>
                      {msg.text}
                    </span>
                        </div>
                    )
                  }

                  const messageProfile = { name: msg.user, email: msg.senderEmail, userId: msg.senderUserId }
                  const displayName = getDisplayName(msg.user, msg.senderEmail)
                  const avatarColor = getAvatarColor(displayName)

                  const prevNonSystem = messages.slice(0, idx).reverse().find(m => m.user !== '시스템' && !m.text.includes('채팅방'))
                  const isContinuation = prevNonSystem &&
                      (prevNonSystem.senderEmail || prevNonSystem.user) === (msg.senderEmail || msg.user) &&
                      !showDateDivider

                  return (
                      <React.Fragment key={idx}>
                        {showDateDivider && msg.sentAt && (
                            <div style={{ textAlign: 'center', margin: '16px 0 8px' }}>
                      <span style={{ fontSize: '11px', color: '#ADB5BD', backgroundColor: '#E9ECEF', padding: '3px 12px', borderRadius: '20px', fontWeight: '600' }}>
                        {msg.sentAt.slice(0, 10)}
                      </span>
                            </div>
                        )}
                        <div style={{
                          display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start',
                          marginBottom: isContinuation ? '2px' : '12px',
                          gap: '8px', alignItems: 'flex-end',
                          animation: 'fadeIn 0.2s ease',
                        }}>
                          {!isMe && (
                              <div style={{ flexShrink: 0, width: '32px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                                {!isContinuation ? (
                                    <div
                                        onClick={() => openProfileCard(messageProfile)}
                                        style={{
                                          width: '32px', height: '32px', borderRadius: '50%',
                                          backgroundColor: avatarColor,
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          fontWeight: '700', fontSize: '13px', color: 'white', cursor: 'pointer',
                                        }}
                                    >
                                      {getInitials(displayName)}
                                    </div>
                                ) : <div style={{ width: '32px' }} />}
                              </div>
                          )}

                          <div style={{ maxWidth: '60%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                            {!isMe && !isContinuation && (
                                <div
                                    onClick={() => openProfileCard(messageProfile)}
                                    style={{ fontSize: '12px', color: '#495057', marginBottom: '4px', paddingLeft: '2px', cursor: 'pointer', fontWeight: '600' }}
                                >
                                  {displayName}
                                </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                              <div style={{
                                padding: '9px 13px',
                                borderRadius: isMe ? '16px 16px 2px 16px' : '2px 16px 16px 16px',
                                backgroundColor: isMe ? '#FF8A3D' : 'white',
                                color: isMe ? 'white' : '#212529',
                                fontSize: '14px', lineHeight: '1.55',
                                boxShadow: isMe ? '0 1px 6px rgba(255,138,61,0.2)' : '0 1px 4px rgba(0,0,0,0.06)',
                                wordBreak: 'break-word',
                                border: isMe ? 'none' : '1px solid #E9ECEF',
                              }}>
                                {msg.text}
                              </div>

                              {msg.sentAt && (
                                  <div style={{ fontSize: '10px', color: '#ADB5BD', whiteSpace: 'nowrap', marginBottom: '2px' }}>
                                    {msg.sentAt.slice(11, 16)}
                                  </div>
                              )}
                            </div>
                          </div>

                          {isMe && (
                              <div style={{ flexShrink: 0, width: '32px', display: 'flex', alignItems: 'flex-end' }}>
                                {!isContinuation ? (
                                    <div style={{
                                      width: '32px', height: '32px', borderRadius: '50%',
                                      backgroundColor: '#FF8A3D',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontWeight: '700', fontSize: '13px', color: 'white',
                                    }}>
                                      {myNickname.charAt(0).toUpperCase()}
                                    </div>
                                ) : <div style={{ width: '32px' }} />}
                              </div>
                          )}
                        </div>
                      </React.Fragment>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* 입력창 / 마감 배너 */}
              {isClosed ? (
                  <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid #E9ECEF',
                    backgroundColor: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '16px' }}>🔒</span>
                      <div>
                        <div style={{ fontSize: '14px', color: '#E03131', fontWeight: '700' }}>마감된 모집입니다.</div>
                        <div style={{ fontSize: '12px', color: '#ADB5BD', marginTop: '1px' }}>채팅 전송이 종료되었습니다.</div>
                      </div>
                    </div>
                    <button
                        onClick={() => navigate('/group')}
                        style={{
                          padding: '8px 16px', borderRadius: '8px', border: 'none',
                          backgroundColor: '#FF8A3D', color: 'white',
                          fontWeight: '600', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                    >
                      다른 모임 찾기
                    </button>
                  </div>
              ) : (
                  <div style={{ padding: '12px 20px', borderTop: '1px solid #E9ECEF', backgroundColor: 'white' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                          type="text"
                          placeholder={isConnecting ? '연결 중..' : '메시지를 입력하세요...'}
                          value={inputText}
                          onChange={e => setInputText(e.target.value)}
                          onKeyDown={handleKeyDown}
                          disabled={isConnecting || !isConnected}
                          style={{
                            flex: 1, padding: '10px 14px', borderRadius: '8px',
                            border: '1px solid #DEE2E6', outline: 'none',
                            fontSize: '14px', backgroundColor: isConnected ? 'white' : '#F8F9FA',
                            color: '#212529', transition: 'border-color 0.15s', fontFamily: 'inherit',
                          }}
                          onFocus={e => (e.target.style.borderColor = '#FF8A3D')}
                          onBlur={e => (e.target.style.borderColor = '#DEE2E6')}
                      />
                      <button
                          className="send-btn"
                          onClick={handleSend}
                          disabled={!inputText.trim() || isConnecting || !isConnected}
                          style={{
                            padding: '10px 16px', borderRadius: '8px', border: 'none',
                            backgroundColor: inputText.trim() && isConnected ? '#FF8A3D' : '#E9ECEF',
                            color: inputText.trim() && isConnected ? 'white' : '#ADB5BD',
                            cursor: inputText.trim() && isConnected ? 'pointer' : 'default',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s',
                          }}
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
              )}
            </div>
        ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: '#ADB5BD', backgroundColor: '#F8F9FA' }}>
              {loadingGroups ? (
                  <>
                    <Loader2 size={28} color="#FF8A3D" style={{ animation: 'spin 1s linear infinite' }} />
                    <p style={{ fontSize: '14px', margin: 0, color: '#868E96' }}>채팅방 불러오는 중..</p>
                  </>
              ) : (
                  <>
                    <MessageSquare size={44} style={{ opacity: 0.15 }} />
                    <p style={{ fontSize: '14px', margin: 0, fontWeight: '500' }}>왼쪽에서 채팅방을 선택하세요</p>
                    <button
                        onClick={() => navigate('/group')}
                        style={{
                          padding: '9px 20px', borderRadius: '8px', border: 'none',
                          backgroundColor: '#FF8A3D', color: 'white',
                          fontWeight: '600', cursor: 'pointer', fontSize: '13px',
                        }}
                    >
                      모집게시판 가기
                    </button>
                  </>
              )}
            </div>
        )}

        {/* 프로필 카드 모달 */}
        {selectedProfile && (
            <div
                onClick={() => setSelectedProfile(null)}
                style={{
                  position: 'fixed', inset: 0,
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 1300, padding: '20px',
                }}
            >
              <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    width: '280px', backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    overflow: 'hidden',
                    border: '1px solid #E9ECEF',
                  }}
              >
                {/* 모달 헤더 */}
                <div style={{
                  padding: '20px 20px 16px',
                  borderBottom: '1px solid #E9ECEF',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  position: 'relative',
                }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    backgroundColor: getAvatarColor(getDisplayName(selectedProfile.name, selectedProfile.email)),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px', fontWeight: '700', color: 'white', flexShrink: 0,
                  }}>
                    {getInitials(getDisplayName(selectedProfile.name, selectedProfile.email))}
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#212529' }}>
                      {getDisplayName(selectedProfile.name, selectedProfile.email)}
                    </div>
                    {selectedProfile.isMe && (
                        <div style={{ fontSize: '11px', color: '#868E96', marginTop: '2px', fontWeight: '500' }}>내 프로필</div>
                    )}
                  </div>
                  <button
                      onClick={() => setSelectedProfile(null)}
                      style={{
                        position: 'absolute', top: '14px', right: '14px',
                        background: 'transparent', border: '1px solid #DEE2E6',
                        borderRadius: '6px', padding: '4px 7px', cursor: 'pointer',
                        color: '#868E96', display: 'flex', alignItems: 'center',
                      }}
                  >
                    <X size={13} />
                  </button>
                </div>

                <div style={{ padding: '12px' }}>
                  <button
                      type="button"
                      onClick={() => {
                        if (!selectedProfile.userId) return
                        setSelectedProfile(null)
                        openCatTower(selectedProfile.userId)
                      }}
                      disabled={!selectedProfile.userId}
                      style={{
                        width: '100%', border: '1px solid',
                        borderColor: selectedProfile.userId ? '#FFD4A8' : '#E9ECEF',
                        borderRadius: '8px', padding: '10px 14px',
                        backgroundColor: selectedProfile.userId ? '#FFF4EE' : '#F8F9FA',
                        color: selectedProfile.userId ? '#FF6B1A' : '#ADB5BD',
                        fontWeight: '600', cursor: selectedProfile.userId ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        fontSize: '13px', marginBottom: '6px', transition: 'all 0.12s',
                      }}
                  >
                    <Home size={14} />
                    CatTower 미리보기
                  </button>
                  <button
                      type="button"
                      onClick={() => setSelectedProfile(null)}
                      style={{
                        width: '100%', border: '1px solid #DEE2E6',
                        borderRadius: '8px', padding: '9px 14px',
                        backgroundColor: 'white', color: '#495057',
                        fontWeight: '600', cursor: 'pointer', fontSize: '13px',
                        transition: 'all 0.12s',
                      }}
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
        )}
      </div>
  )
}