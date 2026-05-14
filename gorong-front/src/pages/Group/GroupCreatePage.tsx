import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// ✅ 서버 주소 설정 (이 부분만 수정하면 됩니다)
const API_BASE_URL = 'http://98.84.85.31:8080';

const GroupCreatePage = () => {
    const navigate = useNavigate();

    // 입력 상태 관리 (event와 location 분리)
    const [formData, setFormData] = useState({
        title: '',
        event: '',       // 참여할 행사 이름
        location: '',    // 구체적인 모임 장소
        content: '',
        maxCapacity: 4,
        meetingDate: '',
        meetingTime: '',
        condition: ''
    });

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        try {
            // ✅ 백엔드 주소를 API_BASE_URL 변수로 변경
            await axios.post(`${API_BASE_URL}/api/groups`, formData);
            alert("모집글이 성공적으로 등록되었습니다! 🐈");
            navigate('/group');
        } catch (err) {
            console.error(err);
            alert("등록 실패! 백엔드 서버 상태를 확인해주세요.");
        }
    };

    return (
        <div style={{ backgroundColor: '#f4f7f9', minHeight: '100vh', fontFamily: 'Pretendard, sans-serif' }}>
            <div style={{ maxWidth: '900px', margin: '40px auto', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <div style={{ padding: '20px 30px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>모집글 작성</h2>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '40px' }}>
                    {/* 제목 */}
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

                    {/* 행사명 & 장소 (2컬럼 배치) */}
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>참여할 행사</label>
                            <input
                                name="event"
                                placeholder="예: 서울 재즈 페스티벌"
                                value={formData.event}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
                                required
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>모임 장소 (상세)</label>
                            <input
                                name="location"
                                placeholder="예: 올림픽공원역 3번 출구"
                                value={formData.location}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
                                required
                            />
                        </div>
                    </div>

                    {/* 설명 */}
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

                    {/* 인원, 날짜, 시간 */}
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>최대 인원</label>
                            <input
                                type="number" name="maxCapacity" value={formData.maxCapacity} min="1" max="4"
                                onChange={handleChange}
                                style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>모임 날짜</label>
                            <input type="date" name="meetingDate" onChange={handleChange} style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>집합 시간</label>
                            <input type="time" name="meetingTime" onChange={handleChange} style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                        </div>
                    </div>

                    {/* 참여 조건 */}
                    <div style={{ marginBottom: '40px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>참여 조건</label>
                        <input
                            name="condition"
                            placeholder="예: 비흡연자, 20대 여성만"
                            onChange={handleChange}
                            style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
                        />
                    </div>

                    <button type="submit" style={{ width: '100%', padding: '18px', borderRadius: '12px', border: 'none', backgroundColor: '#ff8a3d', color: 'white', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(255, 138, 61, 0.3)' }}>
                        등록하기
                    </button>
                </form>
            </div>
        </div>
    );
};

export default GroupCreatePage;