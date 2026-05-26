import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

const GroupListPage = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [joinedGroupIds, setJoinedGroupIds] = useState<number[]>([]);

  // --- 💬 채팅 관련 상태 ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [stompClient, setStompClient] = useState<any>(null);
  const [activeChatTitle, setActiveChatTitle] = useState("");
  const [connectedGroupId, setConnectedGroupId] = useState<number | null>(null);

  const fetchGroups = () => {
    axios.get('http://localhost:8080/api/groups')
        .then(res => setGroups(res.data))
        .catch(err => console.error("데이터 로딩 실패", err));
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const connectChat = (groupId: number, groupTitle: string) => {
    if (connectedGroupId === groupId) return;
    const socket = new SockJS('http://localhost:8080/ws-chat');
    const client = Stomp.over(socket);
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

  const handleJoinRequest = async (group: any) => {
    // 1. 이미 참여 중인지 체크
    if (joinedGroupIds.includes(group.id)) {
      alert("이미 참여 중인 그룹입니다.");
      return;
    }

    try {
      if (group.currentCapacity < group.maxCapacity) {
        await axios.put(`http://localhost:8080/api/groups/${group.id}/join`);
        alert(`'${group.title}' 참여 성공!`);

        // ✅ 참여 목록에 추가 (버튼 상태 변경용)
        setJoinedGroupIds(prev => [...prev, group.id]);

        connectChat(group.id, group.title);
        setIsChatOpen(true);
      } else {
        alert("정원이 가득 찼습니다.");
      }
      fetchGroups();
    } catch (err) {
      console.error("신청 오류", err);
      alert("참여 처리 중 오류가 발생했습니다.");
    }
  };

  const handleSend = () => {
    if (chatMessage.trim() === "" || !stompClient || !connectedGroupId) return;
    const payload = { roomId: connectedGroupId, user: '나', text: chatMessage };
    stompClient.send(`/app/chat.sendMessage/${connectedGroupId}`, {}, JSON.stringify(payload));
    setChatMessage("");
  };

  const filteredGroups = groups.filter((group: any) =>
      group.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (group.event && group.event.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Pretendard, sans-serif' }}>

        <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px' }}>
          {/* 상단 타이틀 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px 0' }}>👥 모집게시판</h1>
              <p style={{ color: '#94a3b8', margin: 0 }}>함께 행사에 참여할 동행자를 찾아보세요</p>
            </div>
            <button onClick={() => navigate('/groups/create')} style={{ backgroundColor: '#ff8a3d', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>+ 모집글 작성</button>
          </div>

          {/* 검색바 */}
          <input type="text" placeholder="모집글 제목 또는 행사명으로 검색" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '25px', boxSizing: 'border-box', outline: 'none' }} />

          {/* 모집글 리스트 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredGroups.map((group: any) => (
                <div key={group.id} style={{ backgroundColor: 'white', borderRadius: '20px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>

                  {/* --- 💙 카드 상단 (클릭 시 펼쳐짐) --- */}
                  <div onClick={() => setSelectedId(selectedId === group.id ? null : group.id)} style={{ padding: '24px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: '0 0 5px 0', fontSize: '20px', fontWeight: '700' }}>{group.title}</h3>
                      <div style={{ fontSize: '14px', color: '#64748b' }}>호스트: {group.author || '익명'}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <span style={{ backgroundColor: '#ecfdf5', color: '#10b981', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>모집중</span>
                      <div style={{ fontSize: '20px', color: '#cbd5e1', transform: selectedId === group.id ? 'rotate(90deg)' : 'rotate(0deg)', transition: '0.3s' }}>〉</div>
                    </div>
                  </div>

                  {/* --- 🔥 펼쳐지는 상세 내용 (이미지 가이드 반영) --- */}
                  {selectedId === group.id && (
                      <div style={{ padding: '0 30px 30px 30px', borderTop: '1px solid #f8fafc', backgroundColor: '#fff' }}>
                        <div style={{ padding: '25px 0', borderBottom: '1px solid #f1f5f9' }}>
                          <p style={{ fontSize: '16px', color: '#334155', lineHeight: '1.6', margin: 0, fontWeight: '500' }}>
                            {group.content}
                          </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '25px' }}>
                          {/* 왼쪽 섹션 */}
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ marginBottom: '25px' }}>
                              <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '10px' }}>참여 현황</div>
                              <div style={{ fontSize: '17px', color: '#334155', fontWeight: '600' }}>👥 {group.currentCapacity || 1} / {group.maxCapacity || 4}명</div>
                            </div>
                            <div style={{ marginBottom: '25px' }}>
                              <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '10px' }}>참여 조건</div>
                              <div style={{ fontSize: '16px', color: '#334155' }}>{group.condition || '제한 없음'}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '10px' }}>추가 조건</div>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                {/* 해시태그 중앙 정렬 표시 */}
                                {group.tags ? group.tags.split(',').map((tag: string, index: number) => (
                                    <span key={index} style={{ backgroundColor: '#f1f5f9', color: '#64748b', padding: '5px 12px', borderRadius: '8px', fontSize: '13px' }}>
                                                        #{tag.trim()}
                                                        </span>
                                )) : <span style={{ color: '#cbd5e1', fontSize: '14px' }}>설정된 조건 없음</span>}
                              </div>
                            </div>
                          </div>
                          {/* 오른쪽 섹션 */}
                          <div>
                            <div style={{ marginBottom: '20px' }}>
                              <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '8px' }}>집합 정보</div>
                              <div style={{ fontSize: '16px', color: '#334155', lineHeight: '1.5' }}>
                                {/* 작성 시 설정한 날짜와 시간 표시 */}
                                📅 {group.meetingDate || '날짜 미정'} <br/>
                                ⏰ {group.meetingTime || '시간 미정'} <br/>
                                📍 {group.location || '상세 장소 미정'}
                              </div>
                            </div>
                            {/* 요구사항 섹션 삭제됨 */}
                          </div>
                        </div>

                        {/* 하단 버튼 */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
                          {/* ✅ 버튼 로직 수정: 참여 여부에 따른 상태 분기 */}
                          {joinedGroupIds.includes(group.id) ? (
                              // 1. 이미 참여한 경우
                              <button
                                  disabled
                                  style={{
                                    backgroundColor: '#e2e8f0', // 회색 비활성화
                                    color: '#94a3b8',
                                    border: 'none', padding: '15px 60px', borderRadius: '12px',
                                    fontWeight: 'bold', fontSize: '16px', cursor: 'default'
                                  }}
                              >
                                참여 중
                              </button>
                          ) : (
                              // 2. 미참여 상태인 경우
                              <button
                                  onClick={(e) => { e.stopPropagation(); handleJoinRequest(group); }}
                                  style={{
                                    backgroundColor: group.currentCapacity >= group.maxCapacity ? '#94a3b8' : '#ff8a3d',
                                    color: 'white', border: 'none', padding: '15px 60px', borderRadius: '12px',
                                    fontWeight: 'bold', cursor: 'pointer', fontSize: '16px',
                                    boxShadow: '0 4px 12px rgba(255,138,61,0.3)'
                                  }}
                              >
                                {group.currentCapacity >= group.maxCapacity ? '대기 신청하기' : '참여 신청'}
                              </button>
                          )}
                        </div>
                      </div>
                  )}
                </div>
            ))}
          </div>
        </div>

        {/* 채팅 팝업 (기존과 동일) */}
        <button onClick={() => setIsChatOpen(!isChatOpen)} style={{ position: 'fixed', bottom: '30px', right: '30px', width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#ff8a3d', color: 'white', border: 'none', cursor: 'pointer', fontSize: '24px', zIndex: 1001 }}>{isChatOpen ? '✖' : '💬'}</button>
        {isChatOpen && (
            <div style={{ position: 'fixed', bottom: '100px', right: '30px', width: '350px', height: '450px', backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 1000 }}>
              <div style={{ padding: '15px', backgroundColor: '#ff8a3d', color: 'white', fontWeight: 'bold' }}>🐱 {activeChatTitle ? `[${activeChatTitle}]` : 'Go냥이'} 채팅방</div>
              <div style={{ flex: 1, padding: '15px', overflowY: 'auto', backgroundColor: '#f9f9f9' }}>
                {messages.map((msg: any, i: number) => (
                    <div key={i} style={{ marginBottom: '10px', textAlign: msg.user === '나' ? 'right' : 'left' }}>
                      <div style={{ fontSize: '11px', color: '#888' }}>{msg.user}</div>
                      <div style={{ display: 'inline-block', padding: '8px 12px', borderRadius: '12px', backgroundColor: msg.user === '나' ? '#ff8a3d' : 'white', color: msg.user === '나' ? 'white' : '#333' }}>{msg.text}</div>
                    </div>
                ))}
              </div>
              <div style={{ padding: '15px', borderTop: '1px solid #eee', display: 'flex', gap: '8px' }}>
                <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder={connectedGroupId ? "메시지 입력..." : "참여 후 입력 가능"} disabled={!connectedGroupId} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none' }} />
                <button onClick={handleSend} disabled={!connectedGroupId} style={{ backgroundColor: '#ff8a3d', color: 'white', border: 'none', borderRadius: '8px', padding: '0 15px', cursor: 'pointer' }}>전송</button>
              </div>
            </div>
        )}
      </div>
  );
};

export default GroupListPage;