import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

// ✅ 서버 주소 설정 (이 부분만 수정하면 됩니다)
const API_BASE_URL = 'http://98.84.85.31:8080';

const GroupListPage = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [isJoining, setIsJoining] = useState(false);
  const [joinedGroupIds, setJoinedGroupIds] = useState<number[]>([]);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [stompClient, setStompClient] = useState<any>(null);
  const [activeChatTitle, setActiveChatTitle] = useState("");
  const [connectedGroupId, setConnectedGroupId] = useState<number | null>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  // 1. 그룹 목록 조회
  const fetchGroups = () => {
    axios.get(`${API_BASE_URL}/api/groups`)
        .then(res => setGroups(res.data))
        .catch(err => console.error("데이터 로딩 실패", err));
  };

  // 2. 채팅 연결 로직
  const connectChat = (groupId: number, groupTitle: string) => {
    if (connectedGroupId === groupId) {
      setIsChatOpen(true);
      return;
    }
    if (stompClient) stompClient.disconnect();

    const socket = new SockJS(`${API_BASE_URL}/ws-chat`);
    const client = Stomp.over(socket);
    client.debug = () => {};

    client.connect({}, () => {
      setStompClient(client);
      setConnectedGroupId(groupId);
      setActiveChatTitle(groupTitle);
      setMessages([{ user: '시스템', text: `[${groupTitle}] 채팅방에 연결되었습니다.` }]);

      client.subscribe(`/topic/group/${groupId}`, (message) => {
        const receivedMsg = JSON.parse(message.body);
        setMessages(prev => [...prev, receivedMsg]);
      });
    });
  };

  // 3. 참여 신청 핸들러
  const handleJoinRequest = async (group: any) => {
    if (isJoining || joinedGroupIds.includes(group.id)) return;

    try {
      if (group.currentCapacity < group.maxCapacity) {
        setIsJoining(true);
        await axios.put(`${API_BASE_URL}/api/groups/${group.id}/join`);
        alert(`'${group.title}' 참여 성공!`);

        setJoinedGroupIds(prev => [...prev, group.id]);
        connectChat(group.id, group.title);
        setIsChatOpen(true);
        fetchGroups();
      } else {
        alert("정원이 가득 찼습니다.");
      }
    } catch (err) {
      console.error("신청 오류", err);
      alert("참여 처리 중 오류가 발생했습니다.");
    } finally {
      setIsJoining(false);
    }
  };

  // 4. 메시지 전송
  const handleSend = () => {
    if (chatMessage.trim() === "" || !stompClient || !connectedGroupId) return;
    const payload = { roomId: connectedGroupId, user: '나', text: chatMessage };
    stompClient.send(`/app/chat.sendMessage/${connectedGroupId}`, {}, JSON.stringify(payload));
    setChatMessage("");
  };

  // 5. 삭제 핸들러
  const handleDelete = async (id: number) => {
    if (window.confirm("정말 이 모집글을 삭제하시겠습니까?")) {
      try {
        await axios.delete(`${API_BASE_URL}/api/groups/${id}`);
        alert("삭제되었습니다.");
        fetchGroups();
      } catch (err) { console.error("삭제 실패", err); }
    }
  };

  const filteredGroups = groups.filter((group: any) =>
      group.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
            <button onClick={() => navigate('/groups/create')} style={{ backgroundColor: '#ff8a3d', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>+ 모집글 작성</button>
          </div>

          <input type="text" placeholder="제목, 행사명, 장소로 검색" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '25px', boxSizing: 'border-box', outline: 'none' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredGroups.map((group: any) => {
              const isFull = group.currentCapacity >= group.maxCapacity;
              const isClosed = group.status === 'CLOSED' || isFull;
              const isAlreadyJoined = joinedGroupIds.includes(group.id);

              return (
                  <div key={group.id} style={{ backgroundColor: 'white', borderRadius: '20px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                    <div onClick={() => setSelectedId(selectedId === group.id ? null : group.id)} style={{ padding: '24px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                        <div style={{ padding: '0 30px 30px 30px', borderTop: '1px solid #f8fafc', backgroundColor: '#fff' }}>
                          <div style={{ padding: '25px 0', borderBottom: '1px solid #f1f5f9' }}>
                            <p style={{ fontSize: '16px', color: '#334155', lineHeight: '1.6', margin: 0, fontWeight: '500' }}>{group.content}</p>
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
                              <div style={{ marginBottom: '20px' }}>
                                <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '8px' }}>집합 상세 정보</div>
                                <div style={{ fontSize: '15px', color: '#334155', lineHeight: '1.8' }}>
                                  📅 <strong>날짜:</strong> {group.meetingDate || '미정'} <br/>
                                  ⏰ <strong>시간:</strong> {group.meetingTime || '미정'} <br/>
                                  🎟️ <strong>참여 행사:</strong> {group.event || '정보 없음'} <br/>
                                  📍 <strong>모임 장소:</strong> <span style={{ color: '#ff8a3d', fontWeight: 'bold' }}>{group.location || '정보 없음'}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '40px' }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleJoinRequest(group); }}
                                disabled={isClosed || isJoining || isAlreadyJoined}
                                style={{
                                  backgroundColor: isAlreadyJoined ? '#10b981' : (isClosed || isJoining ? '#cbd5e1' : '#ff8a3d'),
                                  color: 'white', border: 'none', padding: '15px 60px', borderRadius: '12px',
                                  fontWeight: 'bold', cursor: isClosed || isJoining || isAlreadyJoined ? 'default' : 'pointer', fontSize: '16px'
                                }}
                            >
                              {isJoining ? '참여 신청 중...' : (isAlreadyJoined ? '참여 완료' : (isClosed ? '모집이 마감되었습니다' : '참여 신청'))}
                            </button>
                            <button onClick={() => navigate(`/groups/edit/${group.id}`)} style={{ backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', padding: '15px 30px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>수정하기</button>
                            <button onClick={() => handleDelete(group.id)} style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', padding: '15px 30px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>삭제하기</button>
                          </div>
                        </div>
                    )}
                  </div>
              );
            })}
          </div>
        </div>

        {isChatOpen && (
            <div style={{ position: 'fixed', bottom: '20px', right: '20px', width: '350px', height: '500px', backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', zIndex: 1000, overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#ff8a3d', color: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold' }}>{activeChatTitle} 채팅방</span>
                <button onClick={() => setIsChatOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px' }}>✕</button>
              </div>
              <div style={{ flex: 1, padding: '15px', overflowY: 'auto', backgroundColor: '#fdfdfd' }}>
                {messages.map((msg, idx) => (
                    <div key={idx} style={{ marginBottom: '10px', textAlign: msg.user === '나' ? 'right' : 'left' }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>{msg.user}</div>
                      <div style={{ display: 'inline-block', padding: '8px 12px', borderRadius: '12px', backgroundColor: msg.user === '나' ? '#ff8a3d' : '#f1f5f9', color: msg.user === '나' ? 'white' : '#334155', fontSize: '14px', maxWidth: '80%' }}>
                        {msg.text}
                      </div>
                    </div>
                ))}
              </div>
              <div style={{ padding: '15px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px' }}>
                <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder="메시지를 입력하세요" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }} />
                <button onClick={handleSend} style={{ backgroundColor: '#ff8a3d', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>전송</button>
              </div>
            </div>
        )}
      </div>
  );
};

export default GroupListPage;