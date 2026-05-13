import { useEffect, useState } from 'react';
import { useParams } from "react-router-dom";
import axios from "axios"; // axios 임포트 수정
import { useAuth } from '../../contexts/AuthContext.tsx';

const GroupDetailPage = () => {
    const { id } = useParams();
    const { user } = useAuth();

    // 1. 데이터를 저장할 상태(state) 추가
    const [post, setPost] = useState<any>(null);

    // 2. 페이지 로드 시 데이터를 가져오는 로직 추가
    useEffect(() => {
        const getPostDetail = async () => {
            try {
                const res = await axios.get(`/api/groups/${id}`);
                setPost(res.data);
            } catch (err) {
                console.error("데이터 로딩 실패:", err);
            }
        };
        getPostDetail();
    }, [id]);

    const handleJoin = async () => {
        if (!user) {
            alert("로그인이 필요한 서비스입니다.");
            return;
        }

        try {
            await axios.post(`/api/groups/${id}/join`);
            alert("참여 신청 완료!");
        } catch (err) {
            console.error("참여 신청 실패:", err);
            alert("참여 신청 중 오류가 발생했습니다.");
        }
    }; // handleJoin 함수 끝

    // 3. 로딩 처리
    if (!post) {
        return <div style={{ padding: '20px' }}>데이터를 불러오는 중입니다...</div>;
    }

    return (
        <div style={{ padding: '20px' }}>
            <h1>{post.title}</h1>
            <p>{post.content}</p>
            <p>📍 장소: {post.location}</p>
            <p>👥 모집 인원: {post.maxCapacity}명</p>
            <button
                onClick={handleJoin}
                style={{
                    padding: '10px 20px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                }}
            >
                참여하기
            </button>
        </div>
    );
};

export default GroupDetailPage;