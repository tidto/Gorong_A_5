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

const GroupListPage = () => {
  const navigate = useNavigate();

  const [groups, setGroups] = useState<Group[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinedGroupIds, setJoinedGroupIds] = useState<number[]>([]);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [activeChatTitle, setActiveChatTitle] = useState('');
  const [connectedGroupId, setConnectedGroupId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // ────────────────────────────────────────────────────────────
  // 검색 필터
  // ────────────────────────────────────────────────────────────

  const filteredGroups = groups.filter(group =>
      group.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (group.event && group.event.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (group.location && group.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredGroups.map((group) => {
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
                          📍 {group.location} | 호스트: {group.authorName || '익명'}
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
      </div>
  );
};

export default GroupListPage;
