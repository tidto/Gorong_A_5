// 경로: pages/Group/GroupListPage.tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import axiosInstance from '../../api/axiosInstance';  // ✅ 인증 토큰 자동 첨부
import axios from 'axios';
import { auth } from '../../firebase/firebaseConfig';  // ✅ 현재 유저 이메일 참조용

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://98.84.85.31:8080';
// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

interface ChatMsg {
  user: string;
  text: string;
  sentAt?: string;
  isMe?: boolean;
}

const GroupListPage = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinedGroupIds, setJoinedGroupIds] = useState<number[]>([]);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [stompClient, setStompClient] = useState<any>(null);
  const [activeChatTitle, setActiveChatTitle] = useState('');
  const [connectedGroupId, setConnectedGroupId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchGroups();
    fetchJoinedGroupIds();
  }, []);

  // ✅ 새 메시지 오면 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchGroups = () => {
    // 일반 axios 대신 토큰이 담기는 axiosInstance 사용
    // baseURL에 이미 설정되어 있다면 /api/groups 또는 /groups 중 맞는 것을 사용하세요
    axiosInstance.get('/groups') // 만약 에러나면 '/groups' 로 변경해보세요!
        .then(res => setGroups(res.data))
        .catch(err => console.error('데이터 로딩 실패', err));
  };

  // ✅ 이미 참여한 그룹 ID 목록 서버에서 조회
  const fetchJoinedGroupIds = async () => {
    try {
      const res = await axiosInstance.get('/groups/joined-ids');
      setJoinedGroupIds(res.data);
    } catch {
      // 비로그인 상태면 무시
    }
  };

  // ✅ 채팅 이력 REST API로 불러오기
  const loadChatHistory = async (groupId: number): Promise<ChatMsg[]> => {
    try {
      const res = await axiosInstance.get(`/chat/${groupId}/history`);
      const myEmail = auth.currentUser?.email || '';
      return res.data.map((m: any) => ({
        user: m.user,
        text: m.text,
        sentAt: m.sentAt,
        isMe: m.user === myEmail,
      }));
    } catch {
      return [];
    }
  };

  // ✅ 채팅 연결 - 이력 로드 후 WebSocket 연결
  const connectChat = async (groupId: number, groupTitle: string) => {
    if (connectedGroupId === groupId) {
      setIsChatOpen(true);
      return;
    }
    if (stompClient) {
      try { stompClient.disconnect(); } catch {}
    }

    setIsConnecting(true);
    setActiveChatTitle(groupTitle);
    setConnectedGroupId(groupId);

    const history = await loadChatHistory(groupId);
    setMessages([
      { user: '시스템', text: `[${groupTitle}] 채팅방에 입장했습니다.` },
      ...history,
    ]);

    const socket = new SockJS(`${API_BASE_URL}/ws-chat`);
    const client = Stomp.over(socket);
    client.debug = () => {};

    // 1. Firebase에서 현재 로그인한 유저의 토큰 가져오기
    const token = await auth.currentUser?.getIdToken();

    // 2. connect 할 때 Authorization 헤더에 토큰 담아서 보내기
    client.connect({ Authorization: `Bearer ${token}` }, () => {
      setStompClient(client);
      setIsConnecting(false);
      setIsChatOpen(true);

      client.subscribe(`/topic/group/${groupId}`, (message) => {
        const receivedMsg = JSON.parse(message.body);
        const myEmail = auth.currentUser?.email || '';
        setMessages(prev => [...prev, {
          user: receivedMsg.user || receivedMsg.senderEmail || '익명',
          text: receivedMsg.text,
          sentAt: receivedMsg.sentAt,
          // ✅ 내가 보낸 메시지인지 판별
          isMe: (receivedMsg.senderEmail === myEmail) || (receivedMsg.user === myEmail),
        }]);
      });
    }, (err: any) => {
      console.error('WebSocket 연결 실패', err);
      setIsConnecting(false);
    });
  };

  // ✅ 참여 신청 - axiosInstance로 Firebase 토큰 자동 첨부
  const handleJoinRequest = async (group: any) => {
    if (isJoining || joinedGroupIds.includes(group.id)) return;
    if (group.currentCapacity >= group.maxCapacity) {
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
    } catch (err: any) {
      if (err.response?.status === 401) alert('로그인이 필요합니다.');
      else alert('참여 처리 중 오류가 발생했습니다.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleOpenChat = async (group: any) => {
    await connectChat(group.id, group.title);
  };

  // ✅ 메시지 전송 - senderEmail 포함
  const handleSend = async () => {
    if (!chatMessage.trim() || !stompClient || !connectedGroupId) return;
    const senderEmail = auth.currentUser?.email || '익명';
    const payload = {
      roomId: String(connectedGroupId),
      user: senderEmail,
      senderEmail: senderEmail,
      text: chatMessage,
    };
    stompClient.send(`/app/chat.sendMessage/${connectedGroupId}`, {}, JSON.stringify(payload));
    setChatMessage('');
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('정말 이 모집글을 삭제하시겠습니까?')) return;
    try {
      await axiosInstance.delete(`/groups/${id}`);
      alert('삭제되었습니다.');
      fetchGroups();
    } catch (err) { console.error('삭제 실패', err); }
  };

  const filteredGroups = groups.filter((group: any) =>
      group.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (group.event && group.event.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (group.location && group.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Pretendard, sans-serif', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px 0' }}>👥 모집게시판</h1>
              <p style={{ color: '#94a3b8', margin: 0 }}>함께 행사에 참여할 동행자를 찾아보세요</p>
            </div>
            <button onClick={() => navigate('/groups/create')}
                    style={{ backgroundColor: '#ff8a3d', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
              + 모집글 작성
            </button>
          </div>

          <input type="text" placeholder="제목, 행사명, 장소로 검색" value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '25px', boxSizing: 'border-box', outline: 'none' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredGroups.map((group: any) => {
              const isFull = group.currentCapacity >= group.maxCapacity;
              const isClosed = group.status === 'CLOSED' || isFull;
              const isAlreadyJoined = joinedGroupIds.includes(group.id);

              return (
                  <div key={group.id} style={{ backgroundColor: 'white', borderRadius: '20px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                    <div onClick={() => setSelectedId(selectedId === group.id ? null : group.id)}
                         style={{ padding: '24px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h3 style={{ margin: '0 0 5px 0', fontSize: '20px', fontWeight: '700' }}>{group.title}</h3>
                        <div style={{ fontSize: '14px', color: '#64748b' }}>📍 {group.location} | 호스트: {group.authorName || '익명'}</div>
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
                            {/* ✅ 참여 완료 시 버튼이 "채팅방 열기"로 바뀜 */}
                            {isAlreadyJoined ? (
                                <button onClick={(e) => { e.stopPropagation(); handleOpenChat(group); }}
                                        style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '15px 60px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>
                                  💬 채팅방 열기
                                </button>
                            ) : (
                                <button onClick={(e) => { e.stopPropagation(); handleJoinRequest(group); }}
                                        disabled={isClosed || isJoining}
                                        style={{ backgroundColor: isClosed || isJoining ? '#cbd5e1' : '#ff8a3d', color: 'white', border: 'none', padding: '15px 60px', borderRadius: '12px', fontWeight: 'bold', cursor: isClosed || isJoining ? 'default' : 'pointer', fontSize: '16px' }}>
                                  {isJoining ? '참여 신청 중...' : (isClosed ? '모집이 마감되었습니다' : '참여 신청')}
                                </button>
                            )}
                            <button onClick={() => navigate(`/groups/edit/${group.id}`)}
                                    style={{ backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', padding: '15px 30px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>수정하기</button>
                            <button onClick={() => handleDelete(group.id)}
                                    style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', padding: '15px 30px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>삭제하기</button>
                          </div>
                        </div>
                    )}
                  </div>
              );
            })}
          </div>
        </div>

        {/* ✅ 채팅 패널 - 내/상대 말풍선 구분, 자동 스크롤 */}
        {isChatOpen && (
            <div style={{ position: 'fixed', bottom: '20px', right: '20px', width: '360px', height: '520px', backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', zIndex: 1000, overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#ff8a3d', color: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{activeChatTitle} 채팅방</div>
                  {isConnecting && <div style={{ fontSize: '11px', opacity: 0.8 }}>연결 중...</div>}
                </div>
                <button onClick={() => setIsChatOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px' }}>✕</button>
              </div>

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

              <div style={{ padding: '15px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px' }}>
                <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)}
                       onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                       placeholder="메시지를 입력하세요" disabled={isConnecting}
                       style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px' }} />
                <button onClick={handleSend} disabled={isConnecting || !chatMessage.trim()}
                        style={{ backgroundColor: '#ff8a3d', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                  전송
                </button>
              </div>
            </div>
        )}
      </div>
  );
};

export default GroupListPage;