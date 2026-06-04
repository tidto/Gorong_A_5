import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send, Image, Users, MessageSquare, ChevronRight, Wifi, WifiOff, Loader2, Home } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useChatRoom, fetchJoinedGroups, JoinedGroup } from '../hooks/useChatRoom'

export default function Chat() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // GroupListPage / GroupDetailPage 와 동일한 날짜 만료 체크
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
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<{
    name: string
    email?: string
    userId?: number | null
    isMe?: boolean
  } | null>(null)

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

  // 현재 활성 채팅방의 잠금 여부 — CLOSED(일정 종료/강제 마감)일 때만 잠금
  // IN_PROGRESS(정원 충족 후 진행 중)는 채팅 가능 상태 유지
  const isClosed = activeGroup
      ? activeGroup.status === 'CLOSED' || isDatePassed(activeGroup.meetingDate)
      : false

  // 참여중인 그룹 로드
  useEffect(() => {
    setLoadingGroups(true)
    fetchJoinedGroups().then(groups => {
      setJoinedGroups(groups)
      setLoadingGroups(false)

      if (id && groups.length > 0) {
        const target = groups.find(g => String(g.id) === id)
        if (target) {
          setActiveGroup(target)
          connect(target.id, target.title)
        } else {
          setActiveGroup(groups[0])
          connect(groups[0].id, groups[0].title)
        }
      } else if (groups.length > 0) {
        setActiveGroup(groups[0])
        connect(groups[0].id, groups[0].title)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 메시지 자동 스크롤
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
    if (!inputText.trim() && !selectedImage) return
    sendMessage(inputText)
    setInputText('')
    setSelectedImage(null)
  }, [inputText, selectedImage, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setSelectedImage(file)
  }

  const participantMap = new Map<string, { name: string; email?: string; userId?: number | null }>()
  messages
      .filter(m => m.user !== '시스템' && !m.text.includes('채팅방'))
      .forEach(m => {
        const key = m.senderEmail || m.user
        if (!participantMap.has(key)) {
          participantMap.set(key, {
            name: m.user,
            email: m.senderEmail,
            userId: m.senderUserId,
          })
        }
      })
  if (currentUserEmail) {
    participantMap.set(currentUserEmail, {
      name: myNickname,
      email: currentUserEmail,
    })
  }
  const participants = Array.from(participantMap.values())

  const getDisplayName = (name: string, email?: string) =>
      email && email === currentUserEmail ? myNickname : name
  const getAvatar = (name: string, email?: string) =>
      getDisplayName(name, email).charAt(0).toUpperCase()
  const openProfileCard = (profile: { name: string; email?: string; userId?: number | null }) => {
    setSelectedProfile({
      ...profile,
      isMe: Boolean(profile.email && profile.email === currentUserEmail),
    })
  }

  return (
      <div style={{
        display: 'flex',
        height: 'calc(100vh - 116px)',
        backgroundColor: '#f8fafc',
        fontFamily: 'Pretendard, -apple-system, sans-serif',
        maxWidth: '1200px',
        margin: '12px auto',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
      }}>

        <div style={{
          width: '280px',
          flexShrink: 0,
          backgroundColor: 'white',
          borderRight: '1px solid #f1f5f9',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} color="#ff8a3d" />
              <span style={{ fontWeight: '700', fontSize: '16px', color: '#1e293b' }}>참여중인 채팅방</span>
            </div>
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#94a3b8' }}>
              {loadingGroups ? '로딩중..' : `${joinedGroups.length}개 참여중`}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {loadingGroups ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                  <Loader2 size={20} color="#ff8a3d" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
            ) : joinedGroups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 16px', color: '#94a3b8' }}>
                  <Users size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
                  <p style={{ fontSize: '13px', lineHeight: '1.6' }}>
                    참여 중인 방이 없습니다.<br />
                    <span
                        onClick={() => navigate('/group')}
                        style={{ color: '#ff8a3d', cursor: 'pointer', fontWeight: '600' }}
                    >
                  모집게시판
                </span>에서 참여해보세요!
                  </p>
                </div>
            ) : (
                joinedGroups.map(group => {
                  const isActive = activeGroup?.id === group.id
                  const isGroupClosed =
                      group.status === 'CLOSED' ||
                      group.currentCapacity >= group.maxCapacity ||
                      isDatePassed(group.meetingDate)
                  return (
                      <div
                          key={group.id}
                          onClick={() => handleSelectRoom(group)}
                          style={{
                            padding: '14px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            marginBottom: '6px',
                            backgroundColor: isActive ? '#fff4ed' : 'transparent',
                            border: isActive ? '1.5px solid #ff8a3d' : '1.5px solid transparent',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={e => {
                            if (!isActive) (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f8fafc'
                          }}
                          onMouseLeave={e => {
                            if (!isActive) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'
                          }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontWeight: '600',
                              fontSize: '14px',
                              color: isActive ? '#ff8a3d' : '#1e293b',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {group.title}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                              위치: {group.location}
                            </div>
                          </div>
                          {isActive && <ChevronRight size={14} color="#ff8a3d" style={{ flexShrink: 0 }} />}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '20px',
                      backgroundColor: isGroupClosed ? '#f1f5f9' : '#ecfdf5',
                      color: isGroupClosed ? '#94a3b8' : '#10b981',
                      fontWeight: '600',
                    }}>
                      {isGroupClosed ? '마감' : '모집중'}
                    </span>
                          <span style={{ fontSize: '11px', color: '#cbd5e1' }}>
                      인원: {group.currentCapacity}/{group.maxCapacity}명
                    </span>
                        </div>
                      </div>
                  )
                })
            )}
          </div>

          {/* 모집게시판 바로가기 */}
          <div style={{ padding: '12px', borderTop: '1px solid #f1f5f9' }}>
            <button
                onClick={() => navigate('/group')}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1.5px dashed #fbd5b5',
                  backgroundColor: 'transparent',
                  color: '#ff8a3d',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
            >
              + 새 모임 참여하기
            </button>
          </div>
        </div>

        {/* 우측 채팅 영역 */}
        {activeGroup ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* 채팅방 헤더 */}
              <div style={{
                background: 'linear-gradient(135deg, #ff8a3d 0%, #ff6b1a 100%)',
                padding: '0 24px',
                color: 'white',
              }}>
                {/* 타이틀 + 상태 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '20px', paddingBottom: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>{activeGroup.title}</h1>
                      {isClosed && (
                          <span style={{
                            backgroundColor: 'rgba(239,68,68,0.2)',
                            color: '#fca5a5',
                            border: '1px solid rgba(239,68,68,0.4)',
                            borderRadius: '20px',
                            padding: '2px 10px',
                            fontSize: '11px',
                            fontWeight: '800',
                          }}>🔒 마감</span>
                      )}
                      {isConnecting ? (
                          <span style={{ fontSize: '11px', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> 연결 중..
                    </span>
                      ) : isConnected ? (
                          <Wifi size={14} style={{ opacity: 0.9 }} />
                      ) : (
                          <WifiOff size={14} style={{ opacity: 0.6 }} />
                      )}
                    </div>
                    <p style={{ fontSize: '13px', margin: '3px 0 0', opacity: 0.85 }}>
                      위치 : {activeGroup.location} {activeGroup.event ? `| 참여 행사 : ${activeGroup.event}` : ''}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* 작성자 본인에게만 수정/삭제 버튼 표시 */}
                    {isMyGroup(activeGroup) && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                              onClick={() => navigate(`/groups/edit/${activeGroup.id}`)}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                border: '1.5px solid rgba(255,255,255,0.6)',
                                backgroundColor: 'transparent',
                                color: 'white',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                              }}
                          >
                            모임 수정
                          </button>
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.9 }}>
                      <Users size={16} />
                      <span style={{ fontSize: '14px', fontWeight: '600' }}>{activeGroup.currentCapacity}명</span>
                    </div>
                  </div>
                </div>

                {/* 참여자 아바타 바 */}
                <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '16px' }}>
                  {participants.map((participant, i) => {
                    const name = getDisplayName(participant.name, participant.email)
                    const isMe = participant.email === currentUserEmail
                    return (
                        <div key={participant.email || participant.name} onClick={() => openProfileCard(participant)} style={{
                          flexShrink: 0,
                          padding: '10px 14px',
                          borderRadius: '14px',
                          border: '1.5px solid rgba(255,255,255,0.35)',
                          backgroundColor: 'rgba(255,255,255,0.12)',
                          minWidth: '100px',
                          cursor: 'pointer',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '50%',
                              backgroundColor: 'white',
                              color: '#ff8a3d',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: '700', fontSize: '13px', flexShrink: 0,
                            }}>
                              {getAvatar(participant.name, participant.email)}
                            </div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: 'white' }}>{name}</div>
                              <div style={{ fontSize: '10px', opacity: 0.75 }}>
                                {isMe ? '나' : `#${i + 1} 입장`}
                              </div>
                            </div>
                          </div>
                        </div>
                    )
                  })}
                </div>
              </div>

              {/* 메시지 목록 */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', backgroundColor: '#fafafa' }}>
                {messages.length === 0 && !isConnecting && (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '48px 0', fontSize: '14px' }}>
                      첫 번째 메시지를 보내보세요! 👋
                    </div>
                )}
                {messages.map((msg, idx) => {
                  const isSystem = msg.user === '시스템' || msg.text.includes('채팅방')
                  // msg.isMe 우선, 없으면 이메일로 보조 판정
                  const isMe = msg.isMe ?? (msg.user === currentUserEmail)

                  if (isSystem) {
                    return (
                        <div key={idx} style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <span style={{
                      display: 'inline-block',
                      backgroundColor: '#f1f5f9',
                      color: '#94a3b8',
                      fontSize: '12px',
                      padding: '4px 14px',
                      borderRadius: '20px',
                      fontStyle: 'italic',
                    }}>
                      {msg.text}
                    </span>
                        </div>
                    )
                  }

                  const messageProfile = {
                    name: msg.user,
                    email: msg.senderEmail,
                    userId: msg.senderUserId,
                  }

                  return (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: isMe ? 'flex-end' : 'flex-start',
                        marginBottom: '14px',
                        gap: '8px',
                        alignItems: 'flex-end',
                      }}>
                        {!isMe && (
                            <div onClick={() => openProfileCard(messageProfile)} style={{
                              width: '32px', height: '32px', borderRadius: '50%',
                              backgroundColor: '#ffe8d6',
                              color: '#ff8a3d',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: '700', fontSize: '13px', flexShrink: 0,
                              cursor: 'pointer',
                            }}>
                              {getAvatar(msg.user, msg.senderEmail)}
                            </div>
                        )}
                        <div style={{ maxWidth: '60%' }}>
                          {!isMe && (
                              <div
                                  onClick={() => openProfileCard(messageProfile)}
                                  style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', paddingLeft: '2px', cursor: 'pointer', fontWeight: '700' }}
                              >
                                {getDisplayName(msg.user, msg.senderEmail)}
                              </div>
                          )}
                          <div style={{
                            padding: '10px 14px',
                            borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            backgroundColor: isMe ? '#ff8a3d' : 'white',
                            color: isMe ? 'white' : '#1e293b',
                            fontSize: '14px',
                            lineHeight: '1.5',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                            wordBreak: 'break-word',
                          }}>
                            {msg.text}
                          </div>
                          {msg.sentAt && (
                              <div style={{
                                fontSize: '10px', color: '#94a3b8', marginTop: '3px',
                                textAlign: isMe ? 'right' : 'left', paddingLeft: '2px',
                              }}>
                                {msg.sentAt}
                              </div>
                          )}
                        </div>
                        {isMe && (
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '50%',
                              backgroundColor: '#ff8a3d',
                              color: 'white',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: '700', fontSize: '13px', flexShrink: 0,
                            }}>
                              {myNickname.charAt(0)}
                            </div>
                        )}
                      </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* 메시지 입력창 / 마감 배너 */}
              {isClosed ? (
                  <div style={{
                    padding: '20px',
                    borderTop: '1px solid #fecaca',
                    backgroundColor: '#fff5f5',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <span style={{ fontSize: '20px' }}>🔒</span>
                    <span style={{ fontSize: '15px', color: '#dc2626', fontWeight: '800' }}>마감된 모집입니다.</span>
                    <span style={{ fontSize: '12px', color: '#f87171', fontWeight: '600' }}>채팅 전송이 종료되었습니다.</span>
                    <button
                        onClick={() => navigate('/group')}
                        style={{
                          marginTop: '6px',
                          padding: '8px 20px',
                          borderRadius: '10px',
                          border: 'none',
                          backgroundColor: '#ff8a3d',
                          color: 'white',
                          fontWeight: '700',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                    >
                      다른 모임 찾기
                    </button>
                  </div>
              ) : (
                  <div style={{
                    padding: '16px 20px',
                    borderTop: '1px solid #f1f5f9',
                    backgroundColor: 'white',
                  }}>
                    {selectedImage && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                          <img
                              src={URL.createObjectURL(selectedImage)}
                              alt="미리보기"
                              style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px' }}
                          />
                          <button
                              onClick={() => setSelectedImage(null)}
                              style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            취소
                          </button>
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                          type="text"
                          placeholder={isConnecting ? '연결 중..' : '메시지를 입력하세요...'}
                          value={inputText}
                          onChange={e => setInputText(e.target.value)}
                          onKeyDown={handleKeyDown}
                          disabled={isConnecting || !isConnected}
                          style={{
                            flex: 1,
                            padding: '12px 16px',
                            borderRadius: '12px',
                            border: '1.5px solid #e2e8f0',
                            outline: 'none',
                            fontSize: '14px',
                            backgroundColor: isConnected ? 'white' : '#f8fafc',
                            color: '#1e293b',
                            transition: 'border-color 0.15s',
                          }}
                          onFocus={e => (e.target.style.borderColor = '#ff8a3d')}
                          onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                      />
                      <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          id="chat-image-input"
                          style={{ display: 'none' }}
                      />
                      <label
                          htmlFor="chat-image-input"
                          style={{
                            padding: '10px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                      >
                        <Image size={20} />
                      </label>
                      <button
                          onClick={handleSend}
                          disabled={(!inputText.trim() && !selectedImage) || isConnecting || !isConnected}
                          style={{
                            padding: '10px 18px',
                            borderRadius: '12px',
                            border: 'none',
                            backgroundColor: (!inputText.trim() && !selectedImage) || !isConnected ? '#e2e8f0' : '#ff8a3d',
                            color: (!inputText.trim() && !selectedImage) || !isConnected ? '#94a3b8' : 'white',
                            cursor: (!inputText.trim() && !selectedImage) || !isConnected ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'all 0.15s',
                          }}
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
              )} {/* isClosed 삼항 끝 */}
            </div>
        ) : (
            /* 채팅방 미선택 상태 */
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', color: '#94a3b8' }}>
              {loadingGroups ? (
                  <>
                    <Loader2 size={32} color="#ff8a3d" style={{ animation: 'spin 1s linear infinite' }} />
                    <p style={{ fontSize: '14px' }}>채팅방 불러오는 중..</p>
                  </>
              ) : (
                  <>
                    <MessageSquare size={48} style={{ opacity: 0.3 }} />
                    <p style={{ fontSize: '15px' }}>왼쪽에서 채팅방을 선택하세요</p>
                    <button
                        onClick={() => navigate('/group')}
                        style={{
                          padding: '10px 20px',
                          borderRadius: '10px',
                          border: 'none',
                          backgroundColor: '#ff8a3d',
                          color: 'white',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '14px',
                        }}
                    >
                      모집게시판 가기
                    </button>
                  </>
              )}
            </div>
        )}

        {selectedProfile && (
            <div
                onClick={() => setSelectedProfile(null)}
                style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: '20px' }}
            >
              <div
                  onClick={e => e.stopPropagation()}
                  style={{ width: '320px', backgroundColor: 'white', borderRadius: '18px', boxShadow: '0 18px 45px rgba(15,23,42,0.22)', overflow: 'hidden' }}
              >
                <div style={{ padding: '24px 22px', background: 'linear-gradient(135deg, #ff8a3d 0%, #ff6b1a 100%)', color: 'white', textAlign: 'center' }}>
                  <div style={{ width: '58px', height: '58px', borderRadius: '50%', backgroundColor: 'white', color: '#ff8a3d', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '900', marginBottom: '10px' }}>
                    {getAvatar(selectedProfile.name, selectedProfile.email)}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '900' }}>{getDisplayName(selectedProfile.name, selectedProfile.email)}</div>
                  {selectedProfile.email && (
                      <div style={{ fontSize: '12px', opacity: 0.82, marginTop: '3px' }}>{selectedProfile.email}</div>
                  )}
                </div>
                <div style={{ padding: '18px', display: 'grid', gap: '10px' }}>
                  <button
                      type="button"
                      onClick={() => {
                        if (!selectedProfile.userId) return
                        navigate(`/cattower/${selectedProfile.userId}`)
                      }}
                      disabled={!selectedProfile.userId}
                      style={{
                        width: '100%',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        backgroundColor: selectedProfile.userId ? '#fff4ed' : '#f1f5f9',
                        color: selectedProfile.userId ? '#ff8a3d' : '#94a3b8',
                        fontWeight: '900',
                        cursor: selectedProfile.userId ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                  >
                    <Home size={17} />
                    CatTower로 이동
                  </button>
                  <button
                      type="button"
                      onClick={() => setSelectedProfile(null)}
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '11px 14px', backgroundColor: 'white', color: '#64748b', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <Users size={17} />
                    닫기
                  </button>
                  {!selectedProfile.userId && (
                      <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 }}>
                        사용자 정보를 불러온 뒤 이동할 수 있습니다.
                      </div>
                  )}
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