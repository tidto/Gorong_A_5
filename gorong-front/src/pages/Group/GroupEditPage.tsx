import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';  // ← 추가
import axios from 'axios';  // ← GET 조회용으로 유지

const API_BASE_URL = 'http://98.84.85.31:8080';
// const API_BASE_URL = 'http://localhost:8080';

const GroupEditPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        location: '',
        maxCapacity: 4,
        event: '',
        condition: '',
        meetingDate: '',
        meetingTime: '',
        tags: ''
    });

    // 기존 데이터 불러오기 (GET은 인증 불필요 → axios 그대로)
    useEffect(() => {
        axios.get(`${API_BASE_URL}/api/groups/${id}`)
            .then(res => {
                setFormData(res.data);
            })
            .catch(err => {
                console.error("데이터 로딩 실패:", err);
                alert("글 정보를 불러올 수 없습니다.");
                navigate('/group');
            });
    }, [id, navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // 수정 완료 (PUT은 인증 필요 → axiosInstance 사용)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axiosInstance.put(`/groups/${id}`, formData);  // ← 이게 핵심 변경점
            alert("수정이 완료되었습니다! ✨");
            navigate('/group');
        } catch (err) {
            console.error("수정 실패:", err);
            alert("수정 중 오류가 발생했습니다.");
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px', backgroundColor: 'white', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#334155' }}>📝 모집글 수정하기</h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>제목</label>
                    <input type="text" name="title" value={formData.title} onChange={handleChange} style={inputStyle} required />
                </div>

                <div>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>행사명</label>
                    <input type="text" name="event" value={formData.event} onChange={handleChange} style={inputStyle} />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>날짜</label>
                        <input type="date" name="meetingDate" value={formData.meetingDate} onChange={handleChange} style={inputStyle} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>시간</label>
                        <input type="time" name="meetingTime" value={formData.meetingTime} onChange={handleChange} style={inputStyle} />
                    </div>
                </div>

                <div>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>장소</label>
                    <input type="text" name="location" value={formData.location} onChange={handleChange} style={inputStyle} />
                </div>

                <div>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>내용</label>
                    <textarea name="content" value={formData.content} onChange={handleChange} style={{ ...inputStyle, height: '120px', resize: 'none' }} required />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                    <button type="button" onClick={() => navigate(-1)} style={cancelButtonStyle}>취소</button>
                    <button type="submit" style={submitButtonStyle}>수정 완료</button>
                </div>
            </form>
        </div>
    );
};

const inputStyle = {
    width: '100%',
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    boxSizing: 'border-box' as 'border-box',
    outline: 'none'
};

const submitButtonStyle = {
    backgroundColor: '#ff8a3d',
    color: 'white',
    border: 'none',
    padding: '12px 30px',
    borderRadius: '10px',
    fontWeight: 'bold',
    cursor: 'pointer'
};

const cancelButtonStyle = {
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    border: 'none',
    padding: '12px 30px',
    borderRadius: '10px',
    fontWeight: 'bold',
    cursor: 'pointer'
};

export default GroupEditPage;