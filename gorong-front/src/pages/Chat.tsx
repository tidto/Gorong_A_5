import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send, Users, MessageSquare, Wifi, WifiOff, Loader2, Home, X, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useCatTowerPreview } from '../contexts/CatTowerPreviewContext'
import { useChatRoom, fetchJoinedGroups, JoinedGroup } from '../hooks/useChatRoom'

// ─── 필터 / 정렬 타입 ─────────────────────────
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

  // ─── 필터 / 정렬 상태 ─────────────────────────
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

  // ─── 필터 + 정렬 + 검색 적용 ──────────────────
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

    // 필터
    if (filter !== 'all') {
      result = result.filter(g => getGroupStatus(g) === filter)
    }

    // 검색
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase()
      result = result.filter(g =>
          g.title.toLowerCase().includes(q) ||
          g.location?.toLowerCase().includes(q) ||
          g.event?.toLowerCase().includes(q)
      )
    }

    // 정렬
    if (sort === 'date') {
      result.sort((a, b) => (a.meetingDate ?? '').localeCompare(b.meetingDate ?? ''))
    } else if (sort === 'name') {
      result.sort((a, b) => a.title.localeCompare(b.title))
    } else if (sort === 'capacity') {
      result.sort((a, b) => b.currentCapacity - a.currentCapacity)
    }

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
    const colors = ['#FF8A65', '#66BB6A', '#42A5F5', '#AB47BC', '#EC407A', '#26C6DA', '#FFA726', '#8D6E63']
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
  }

  // 상태별 배지 스타일
  const getStatusBadgeStyle = (group: JoinedGroup) => {
    const s = getGroupStatus(group)
    if (s === 'closed') return { bg: '#f1f5f9', color: '#94a3b8' }
    if (s === 'inProgress') return { bg: '#fefce8', color: '#ca8a04' }
    return { bg: '#ecfdf5', color: '#10b981' }
  }

  return (
      <div style={{
        display: 'flex',
        height: 'calc(100vh - 116px)',
        fontFamily: 'Pretendard, -apple-system, sans-serif',
        maxWidth: '1280px',
        margin: '12px auto',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 8px 48px rgba(0,0,0,0.12)',
        backgroundColor: '#F7F3EF',
      }}>

        {/* ── 사이드바 ── */}
        <div style={{
          width: sidebarOpen ? '300px' : '0',
          flexShrink: 0,
          backgroundColor: 'white',
          borderRight: '1px solid #F0EBE3',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'width 0.25s ease',
        }}>
          {/* 사이드바 헤더 */}
          <div style={{ padding: '20px 20px 14px', background: 'linear-gradient(135deg, #FF8A3D 0%, #FF6B1A 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={16} color="white" />
                <span style={{ fontWeight: '800', fontSize: '15px', color: 'white', whiteSpace: 'nowrap' }}>채팅방</span>
              </div>
              {/* 필터 패널 토글 */}
              <button
                  onClick={() => setShowFilterPanel(v => !v)}
                  style={{
                    background: showFilterPanel ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.18)',
                    border: 'none', borderRadius: '8px', padding: '5px 8px',
                    cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: '4px',
                  }}
              >
                <SlidersHorizontal size={13} />
                <span style={{ fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>필터</span>
              </button>
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap' }}>
              {loadingGroups ? '불러오는 중..' : `${filteredGroups.length}/${joinedGroups.length}개 표시 중`}
            </div>

            {/* ─── 필터 패널 ─────────────────────────── */}
            {showFilterPanel && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* 검색창 */}
                  <input
                      type="text"
                      placeholder="방 이름, 장소 검색..."
                      value={searchText}
                      onChange={e => setSearchText(e.target.value)}
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: '10px',
                        border: 'none', fontSize: '12px', backgroundColor: 'rgba(255,255,255,0.22)',
                        color: 'white', outline: 'none', boxSizing: 'border-box',
                      }}
                  />

                  {/* 상태 필터 칩 */}
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {(['all', 'open', 'inProgress', 'closed'] as FilterType[]).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                              padding: '4px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                              fontSize: '11px', fontWeight: '700',
                              backgroundColor: filter === f ? 'white' : 'rgba(255,255,255,0.2)',
                              color: filter === f ? '#FF6B1A' : 'rgba(255,255,255,0.85)',
                              transition: 'all 0.15s',
                            }}
                        >
                          {FILTER_LABELS[f]}
                          <span style={{
                            marginLeft: '4px', fontSize: '10px',
                            opacity: filter === f ? 0.7 : 0.6,
                          }}>
                        {filterCounts[f]}
                      </span>
                        </button>
                    ))}
                  </div>

                  {/* 정렬 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', fontWeight: '600' }}>정렬</span>
                    {(['date', 'name', 'capacity'] as SortType[]).map(s => (
                        <button
                            key={s}
                            onClick={() => setSort(s)}
                            style={{
                              padding: '3px 9px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                              fontSize: '11px', fontWeight: '700',
                              backgroundColor: sort === s ? 'white' : 'rgba(255,255,255,0.2)',
                              color: sort === s ? '#FF6B1A' : 'rgba(255,255,255,0.85)',
                            }}
                        >
                          {s === 'date' ? '날짜' : s === 'name' ? '이름' : '인원'}
                        </button>
                    ))}
                  </div>
                </div>
            )}
          </div>

          {/* 채팅방 목록 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
            {loadingGroups ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                  <Loader2 size={22} color="#FF8A3D" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
            ) : joinedGroups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 16px', color: '#94a3b8' }}>
                  <Users size={36} style={{ marginBottom: '12px', opacity: 0.35, display: 'block', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: '13px', lineHeight: '1.7', margin: 0 }}>
                    참여 중인 방이 없어요.<br />
                    <span onClick={() => navigate('/group')} style={{ color: '#FF8A3D', cursor: 'pointer', fontWeight: '700' }}>
                  모집게시판
                </span>에서 참여해보세요!
                  </p>
                </div>
            ) : filteredGroups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8' }}>
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
                  const badgeStyle = getStatusBadgeStyle(group)
                  const avatarColor = getAvatarColor(group.title)
                  return (
                      <div
                          key={group.id}
                          onClick={() => handleSelectRoom(group)}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '14px',
                            cursor: 'pointer',
                            marginBottom: '4px',
                            backgroundColor: isActive ? '#FFF4ED' : 'transparent',
                            border: isActive ? '1.5px solid #FFD4A8' : '1.5px solid transparent',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.backgroundColor = '#FAF7F4' }}
                          onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                            backgroundColor: avatarColor, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '16px', fontWeight: '800', color: 'white',
                          }}>
                            {group.title.charAt(0)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontWeight: '700', fontSize: '13px',
                              color: isActive ? '#FF6B1A' : '#1e293b',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                              {group.title}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                              <span style={{
                                fontSize: '10px', padding: '1px 7px', borderRadius: '20px', fontWeight: '700',
                                backgroundColor: badgeStyle.bg, color: badgeStyle.color,
                              }}>
                                {FILTER_LABELS[getGroupStatus(group)]}
                              </span>
                              <span style={{ fontSize: '10px', color: '#cbd5e1', fontWeight: '600' }}>
                                {group.currentCapacity}/{group.maxCapacity}명
                              </span>
                              {group.meetingDate && (
                                  <span style={{ fontSize: '10px', color: '#cbd5e1', fontWeight: '500' }}>
                                  📅 {group.meetingDate}
                                </span>
                              )}
                            </div>
                          </div>
                          {isActive && <ChevronRight size={14} color="#FF8A3D" style={{ flexShrink: 0 }} />}
                        </div>
                      </div>
                  )
                })
            )}
          </div>

          {/* 새 모임 참여 버튼 */}
          <div style={{ padding: '10px', borderTop: '1px solid #F5EDE5' }}>
            <button
                onClick={() => navigate('/group')}
                style={{
                  width: '100%', padding: '11px', borderRadius: '12px',
                  border: '1.5px dashed #FFD4A8', backgroundColor: 'transparent',
                  color: '#FF8A3D', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FFF4ED')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              + 새 모임 참여하기
            </button>
          </div>
        </div>

        {/* ── 우측 채팅 영역 ── */}
        {activeGroup ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

              {/* 채팅방 헤더 */}
              <div style={{
                background: 'linear-gradient(135deg, #FF8A3D 0%, #FF6B1A 100%)',
                padding: '16px 24px',
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                      onClick={() => setSidebarOpen(v => !v)}
                      style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: '10px', padding: '7px 10px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                  >
                    <Users size={16} />
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h1 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '340px' }}>
                        {activeGroup.title}
                      </h1>
                      {isClosed && (
                          <span style={{ backgroundColor: 'rgba(239,68,68,0.25)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '20px', padding: '2px 9px', fontSize: '11px', fontWeight: '800', whiteSpace: 'nowrap' }}>
                      🔒 마감
                    </span>
                      )}
                      {isConnecting ? (
                          <Loader2 size={13} color="rgba(255,255,255,0.8)" style={{ animation: 'spin 1s linear infinite' }} />
                      ) : isConnected ? (
                          <Wifi size={13} color="rgba(255,255,255,0.85)" />
                      ) : (
                          <WifiOff size={13} color="rgba(255,255,255,0.5)" />
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.78)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      📍 {activeGroup.location}{activeGroup.event ? ` · 🎟 ${activeGroup.event}` : ''}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {isMyGroup(activeGroup) && (
                        <button
                            onClick={() => navigate(`/groups/edit/${activeGroup.id}`)}
                            style={{ padding: '6px 14px', borderRadius: '9px', border: '1.5px solid rgba(255,255,255,0.55)', backgroundColor: 'transparent', color: 'white', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                        >
                          수정
                        </button>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: '10px', padding: '6px 10px' }}>
                      <Users size={13} color="white" />
                      <span style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>{activeGroup.currentCapacity}명</span>
                    </div>
                  </div>
                </div>

                {participants.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '14px', paddingBottom: '2px' }}>
                      {participants.map((participant) => {
                        const name = getDisplayName(participant.name, participant.email)
                        const isMe = participant.email === currentUserEmail
                        const color = getAvatarColor(name)
                        return (
                            <div
                                key={participant.email || participant.name}
                                onClick={() => openProfileCard(participant)}
                                style={{
                                  flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px',
                                  padding: '7px 12px', borderRadius: '12px',
                                  border: isMe ? '1.5px solid rgba(255,255,255,0.8)' : '1.5px solid rgba(255,255,255,0.3)',
                                  backgroundColor: isMe ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)',
                                  cursor: 'pointer', transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(255,255,255,0.22)'}
                                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = isMe ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)'}
                            >
                              <div style={{
                                width: '26px', height: '26px', borderRadius: '8px',
                                backgroundColor: color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: '800', fontSize: '12px', color: 'white', flexShrink: 0,
                              }}>
                                {getInitials(name)}
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: '700', color: 'white', whiteSpace: 'nowrap' }}>
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
                flex: 1, overflowY: 'auto', padding: '20px 24px',
                backgroundColor: '#FAF7F4',
                display: 'flex', flexDirection: 'column', gap: '4px',
              }}>
                {messages.length === 0 && !isConnecting && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#b0a090', gap: '12px' }}>
                      <MessageSquare size={40} style={{ opacity: 0.3 }} />
                      <p style={{ fontSize: '14px', margin: 0, fontWeight: '600' }}>첫 번째 메시지를 보내보세요! 👋</p>
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
                      display: 'inline-block', backgroundColor: '#EDE8E2',
                      color: '#8A7A6A', fontSize: '11px', padding: '4px 14px',
                      borderRadius: '20px', fontStyle: 'italic', fontWeight: '600',
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
                      <span style={{ fontSize: '11px', color: '#A89880', backgroundColor: '#EDE8E2', padding: '3px 12px', borderRadius: '20px', fontWeight: '700' }}>
                        {msg.sentAt.slice(0, 10)}
                      </span>
                            </div>
                        )}
                        <div style={{
                          display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start',
                          marginBottom: isContinuation ? '2px' : '10px',
                          gap: '8px', alignItems: 'flex-end',
                        }}>
                          {!isMe && (
                              <div style={{ flexShrink: 0, width: '34px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                                {!isContinuation ? (
                                    <div
                                        onClick={() => openProfileCard(messageProfile)}
                                        style={{
                                          width: '34px', height: '34px', borderRadius: '10px',
                                          backgroundColor: avatarColor,
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          fontWeight: '800', fontSize: '14px', color: 'white', cursor: 'pointer',
                                          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                                        }}
                                    >
                                      {getInitials(displayName)}
                                    </div>
                                ) : <div style={{ width: '34px' }} />}
                              </div>
                          )}

                          <div style={{ maxWidth: '62%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                            {!isMe && !isContinuation && (
                                <div
                                    onClick={() => openProfileCard(messageProfile)}
                                    style={{ fontSize: '11px', color: '#6B5A4A', marginBottom: '4px', paddingLeft: '2px', cursor: 'pointer', fontWeight: '700' }}
                                >
                                  {displayName}
                                </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                              <div style={{
                                padding: '10px 14px',
                                borderRadius: isMe ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                                backgroundColor: isMe ? '#FF8A3D' : 'white',
                                color: isMe ? 'white' : '#1A1210',
                                fontSize: '14px', lineHeight: '1.55',
                                boxShadow: isMe ? '0 2px 10px rgba(255,138,61,0.25)' : '0 2px 8px rgba(0,0,0,0.07)',
                                wordBreak: 'break-word',
                                border: isMe ? 'none' : '1px solid #F0E8E0',
                              }}>
                                {msg.text}
                              </div>

                              {msg.sentAt && (
                                  <div style={{ fontSize: '10px', color: '#A89880', whiteSpace: 'nowrap', marginBottom: '2px', fontWeight: '500' }}>
                                    {msg.sentAt.slice(11, 16)}
                                  </div>
                              )}
                            </div>
                          </div>

                          {isMe && (
                              <div style={{ flexShrink: 0, width: '34px', display: 'flex', alignItems: 'flex-end' }}>
                                {!isContinuation ? (
                                    <div style={{
                                      width: '34px', height: '34px', borderRadius: '10px',
                                      backgroundColor: '#FF8A3D',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontWeight: '800', fontSize: '14px', color: 'white',
                                      boxShadow: '0 2px 8px rgba(255,138,61,0.3)',
                                    }}>
                                      {myNickname.charAt(0).toUpperCase()}
                                    </div>
                                ) : <div style={{ width: '34px' }} />}
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
                    padding: '20px', borderTop: '1px solid #F0E8E0',
                    backgroundColor: 'white', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '6px',
                  }}>
                    <span style={{ fontSize: '22px' }}>🔒</span>
                    <span style={{ fontSize: '15px', color: '#DC2626', fontWeight: '800' }}>마감된 모집입니다.</span>
                    <span style={{ fontSize: '12px', color: '#F87171', fontWeight: '600' }}>채팅 전송이 종료되었습니다.</span>
                    <button
                        onClick={() => navigate('/group')}
                        style={{ marginTop: '8px', padding: '9px 22px', borderRadius: '10px', border: 'none', backgroundColor: '#FF8A3D', color: 'white', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                    >
                      다른 모임 찾기
                    </button>
                  </div>
              ) : (
                  <div style={{ padding: '14px 18px', borderTop: '1px solid #F0E8E0', backgroundColor: 'white' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                          type="text"
                          placeholder={isConnecting ? '연결 중..' : '메시지를 입력하세요...'}
                          value={inputText}
                          onChange={e => setInputText(e.target.value)}
                          onKeyDown={handleKeyDown}
                          disabled={isConnecting || !isConnected}
                          style={{
                            flex: 1, padding: '12px 16px', borderRadius: '14px',
                            border: '1.5px solid #E8DDD4', outline: 'none',
                            fontSize: '14px', backgroundColor: isConnected ? 'white' : '#F8F5F2',
                            color: '#1A1210', transition: 'border-color 0.15s', fontFamily: 'inherit',
                          }}
                          onFocus={e => (e.target.style.borderColor = '#FF8A3D')}
                          onBlur={e => (e.target.style.borderColor = '#E8DDD4')}
                      />
                      <button
                          onClick={handleSend}
                          disabled={!inputText.trim() || isConnecting || !isConnected}
                          style={{
                            padding: '12px 18px', borderRadius: '14px', border: 'none',
                            backgroundColor: inputText.trim() && isConnected ? '#FF8A3D' : '#EDE8E2',
                            color: inputText.trim() && isConnected ? 'white' : '#B0A090',
                            cursor: inputText.trim() && isConnected ? 'pointer' : 'default',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s', boxShadow: inputText.trim() && isConnected ? '0 3px 12px rgba(255,138,61,0.3)' : 'none',
                          }}
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
              )}
            </div>
        ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', color: '#B0A090', backgroundColor: '#FAF7F4' }}>
              {loadingGroups ? (
                  <>
                    <Loader2 size={32} color="#FF8A3D" style={{ animation: 'spin 1s linear infinite' }} />
                    <p style={{ fontSize: '14px', margin: 0, color: '#A89880' }}>채팅방 불러오는 중..</p>
                  </>
              ) : (
                  <>
                    <MessageSquare size={52} style={{ opacity: 0.2 }} />
                    <p style={{ fontSize: '15px', margin: 0, fontWeight: '600' }}>왼쪽에서 채팅방을 선택하세요</p>
                    <button
                        onClick={() => navigate('/group')}
                        style={{ padding: '11px 22px', borderRadius: '12px', border: 'none', backgroundColor: '#FF8A3D', color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}
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
                style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,10,5,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: '20px' }}
            >
              <div
                  onClick={e => e.stopPropagation()}
                  style={{ width: '300px', backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden' }}
              >
                <div style={{ padding: '28px 24px 20px', background: 'linear-gradient(135deg, #FF8A3D 0%, #FF6B1A 100%)', textAlign: 'center', position: 'relative' }}>
                  <button
                      onClick={() => setSelectedProfile(null)}
                      style={{ position: 'absolute', top: '12px', right: '14px', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center' }}
                  >
                    <X size={14} />
                  </button>
                  <div style={{
                    width: '60px', height: '60px', borderRadius: '16px',
                    backgroundColor: getAvatarColor(getDisplayName(selectedProfile.name, selectedProfile.email)),
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '26px', fontWeight: '900', color: 'white', marginBottom: '12px',
                  }}>
                    {getInitials(getDisplayName(selectedProfile.name, selectedProfile.email))}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>
                    {getDisplayName(selectedProfile.name, selectedProfile.email)}
                  </div>
                  {selectedProfile.isMe && (
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', marginTop: '3px', fontWeight: '700' }}>나</div>
                  )}
                </div>
                <div style={{ padding: '16px' }}>
                  <button
                      type="button"
                      onClick={() => {
                        if (!selectedProfile.userId) return
                        setSelectedProfile(null)
                        openCatTower(selectedProfile.userId)
                      }}
                      disabled={!selectedProfile.userId}
                      style={{
                        width: '100%', border: 'none', borderRadius: '12px', padding: '13px 14px',
                        backgroundColor: selectedProfile.userId ? '#FFF4ED' : '#f1f5f9',
                        color: selectedProfile.userId ? '#FF6B1A' : '#94a3b8',
                        fontWeight: '800', cursor: selectedProfile.userId ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        fontSize: '14px', marginBottom: '8px',
                      }}
                  >
                    <Home size={16} />
                    CatTower 미리보기
                  </button>
                  <button
                      type="button"
                      onClick={() => setSelectedProfile(null)}
                      style={{ width: '100%', border: '1px solid #E8DDD4', borderRadius: '12px', padding: '12px 14px', backgroundColor: 'white', color: '#6B5A4A', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
        )}

        <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
      </div>
  )
}