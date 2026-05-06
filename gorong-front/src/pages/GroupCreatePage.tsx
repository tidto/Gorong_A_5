import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';


const GroupCreatePage = () => {
    const navigate = useNavigate();

    // 스토리보드에 맞춘 입력 상태 관리
    const [formData, setFormData] = useState({
        title: '',
        event: '',
        content: '',
        maxCapacity: 4,
        meetingDate: '',
        meetingTime: '',
        condition: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // 행사 선택 버튼 클릭 시 처리
    const handleEventSelect = (eventName) => {
        setFormData({ ...formData, event: eventName });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // 백엔드 엔티티 필드와 맞추기 위해 데이터 가공
            // (백엔드에 event, meetingDate 등이 없다면 content나 location에 합쳐서 보낼 수도 있습니다)
            await axios.post('http://localhost:8080/api/groups', formData);
            alert("모집글이 성공적으로 등록되었습니다! 🐈");
            navigate('/groups');
        } catch (err) {
            console.error(err);
            alert("등록 실패! 백엔드 서버 상태를 확인해주세요.");
        }
    };

    return (
        <div style={{ backgroundColor: '#f4f7f9', minHeight: '100vh', fontFamily: 'Pretendard, sans-serif' }}>


            {/* 2. 메인 폼 영역 */}
            <div style={{ maxWidth: '900px', margin: '40px auto', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <div style={{ padding: '20px 30px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>모집글 작성</h2>
                    <span style={{ color: '#cbd5e1' }}>〉</span>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '40px' }}>

                    {/* 제목 입력 */}
                    <div style={{ marginBottom: '30px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>제목</label>
                        <input
                            name="title"
                            placeholder="모집글 제목을 입력해주세요"
                            onChange={handleChange}
                            style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', backgroundColor: '#f8fafc' }}
                            required
                        />
                    </div>

                    {/* 참여할 행사 선택 (스토리보드 버튼 영역) */}
                    <div style={{ marginBottom: '30px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>참여할 행사</label>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            {['초보자 요가 클래스', '현대 미술 전시회', '커뮤니티 독서 모임'].map(ev => (
                                <button
                                    type="button"
                                    key={ev}
                                    onClick={() => handleEventSelect(ev)}
                                    style={{
                                        padding: '12px 20px', borderRadius: '8px', border: '1px solid #e2e8f0',
                                        backgroundColor: formData.event === ev ? '#fff7ed' : 'white',
                                        color: formData.event === ev ? '#ff8a3d' : '#64748b',
                                        borderColor: formData.event === ev ? '#ff8a3d' : '#e2e8f0',
                                        cursor: 'pointer', fontSize: '14px', transition: '0.2s'
                                    }}
                                >
                                    {ev}
                                </button>
                            ))}
                        </div>
                        <select
                            name="event"
                            value={formData.event}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', color: '#64748b' }}
                        >
                            <option value="">행사를 선택하세요</option>
                            <option value="초보자 요가 클래스">초보자 요가 클래스</option>
                            <option value="현대 미술 전시회">현대 미술 전시회</option>
                            <option value="커뮤니티 독서 모임">커뮤니티 독서 모임</option>
                        </select>
                    </div>

                    {/* 설명 입력 */}
                    <div style={{ marginBottom: '30px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>설명</label>
                        <textarea
                            name="content"
                            placeholder="모집에 대한 자세한 설명을 입력하세요"
                            onChange={handleChange}
                            style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', height: '120px', resize: 'none' }}
                            required
                        />
                    </div>

                    {/* 인원, 날짜, 시간 (한 줄 구성) */}
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>최대 인원</label>
                            <input
                                type="number"
                                name="maxCapacity"
                                value={formData.maxCapacity}
                                min="1"  // 최소 1명
                                max="4"  // 🔥 최대 4명으로 제한
                                onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    // 4보다 큰 값을 입력하려고 하면 강제로 4로 고정하는 로직
                                    if (value > 4) {
                                        setFormData({ ...formData, maxCapacity: 4 });
                                    } else {
                                        handleChange(e);
                                    }
                                }}
                                style={{
                                    width: '100%',
                                    padding: '15px',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    outline: formData.maxCapacity > 4 ? '2px solid red' : 'none' // 시각적 경고 (선택사항)
                                }}
                            />
                            {formData.maxCapacity >= 4 && (
                                <span style={{ fontSize: '12px', color: '#ff8a3d', marginTop: '5px', display: 'block' }}>
            * 최대 4명까지만 모집 가능합니다.
        </span>
                            )}
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>모임 날짜</label>
                            <input
                                type="date" name="meetingDate" onChange={handleChange}
                                style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#64748b' }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>집합 시간</label>
                            <input
                                type="time" name="meetingTime" onChange={handleChange}
                                style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#64748b' }}
                            />
                        </div>
                    </div>

                    {/* 참여 조건 */}
                    // GroupCreatePage.jsx의 참여 조건 입력 부분
                    <div style={{ marginBottom: '40px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>참여 조건 (쉼표로 구분)</label>
                        <input
                            name="condition"
                            placeholder="예: 요가초보, 친절한분, 매너필수"
                            onChange={handleChange}
                            style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
                        />
                        <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '5px' }}>
                            * 입력하신 키워드들이 목록에서 #해시태그 형태로 보여집니다.
                        </p>
                    </div>

                    {/* 등록 버튼 */}
                    <button
                        type="submit"
                        style={{
                            width: '100%', padding: '18px', borderRadius: '12px', border: 'none',
                            backgroundColor: '#ff8a3d', color: 'white', fontWeight: 'bold', fontSize: '18px',
                            cursor: 'pointer', boxShadow: '0 4px 12px rgba(255, 138, 61, 0.3)'
                        }}
                    >
                        등록하기
                    </button>
                </form>
            </div>
        </div>
    );
};

export default GroupCreatePage;