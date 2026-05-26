// ============================================================
// 경로: src/pages/Group/GroupDetailPage.tsx
//
// 변경 사항:
//  - axios → axiosInstance 로 교체 (토큰 자동 주입)
//  - post 상태 any → GroupPost 타입으로 교체
//  - isMyGroup 으로 수정/삭제 버튼 권한 제어 추가
//  - handleDelete 추가
// ============================================================

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance'; // ✅ axios → axiosInstance (토큰 자동 주입)
import { useChatRoom } from '../../hooks/useChatRoom';

// ────────────────────────────────────────────────────────────
// 타입 정의
// ────────────────────────────────────────────────────────────

/** 백엔드 GroupPost 직렬화 구조 */
interface GroupPost {
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
    authorName?: string
    author?: {
        id?: number
        email?: string
    }
}

const GroupDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [post, setPost] = useState<GroupPost | null>(null);
    const [isJoining, setIsJoining] = useState(false);

    // ✅ 권한 판정 훅
    const { isMyGroup } = useChatRoom();

    // ────────────────────────────────────────────────────────────
    // 데이터 로드
    // ────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!id) return;
        axiosInstance.get<GroupPost>(`/groups/${id}`)
            .then(res => setPost(res.data))
            .catch(err => console.error('데이터 로딩 실패:', err));
    }, [id]);

    // ────────────────────────────────────────────────────────────
    // 권한 판정 어댑터
    // ────────────────────────────────────────────────────────────

    /** GroupPost → isMyGroup 이 이해할 수 있는 형태로 변환 */
    const canEdit = post
        ? isMyGroup({ authorEmail: post.author?.email, authorName: post.authorName })
        : false;

    // ────────────────────────────────────────────────────────────
    // 액션 핸들러
    // ────────────────────────────────────────────────────────────

    const handleJoin = useCallback(async () => {
        try {
            setIsJoining(true);
            await axiosInstance.put(`/groups/${id}/join`);
            alert('참여 신청 완료!');
        } catch (err) {
            console.error('참여 신청 실패:', err);
            alert('참여 신청 중 오류가 발생했습니다.');
        } finally {
            setIsJoining(false);
        }
    }, [id]);

    const handleDelete = useCallback(async () => {
        // ✅ 작성자 본인만 삭제 가능 (이중 방어)
        if (!canEdit) {
            alert('작성자 본인만 삭제할 수 있습니다.');
            return;
        }
        if (!window.confirm('정말 이 모집글을 삭제하시겠습니까?')) return;
        try {
            await axiosInstance.delete(`/groups/${id}`);
            alert('삭제되었습니다.');
            navigate('/groups', { replace: true });
        } catch (err) {
            console.error('삭제 실패:', err);
            alert('삭제 중 오류가 발생했습니다.');
        }
    }, [id, canEdit, navigate]);

    // ────────────────────────────────────────────────────────────
    // 로딩 상태
    // ────────────────────────────────────────────────────────────

    if (!post) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontFamily: 'Pretendard, sans-serif' }}>
                데이터를 불러오는 중입니다...
            </div>
        );
    }

    const isFull = (post.currentCapacity ?? 0) >= (post.maxCapacity ?? 0);

    // ────────────────────────────────────────────────────────────
    // 렌더
    // ────────────────────────────────────────────────────────────

    return (
        <div style={{
            maxWidth: '700px',
            margin: '40px auto',
            padding: '0 20px',
            fontFamily: 'Pretendard, sans-serif',
        }}>
            {/* 헤더 */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                padding: '32px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                marginBottom: '20px',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#1e293b' }}>
                        {post.title}
                    </h1>
                    <span style={{
                        backgroundColor: isFull ? '#f1f5f9' : '#ecfdf5',
                        color: isFull ? '#94a3b8' : '#10b981',
                        padding: '4px 14px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: '700',
                        flexShrink: 0,
                        marginLeft: '12px',
                    }}>
            {isFull ? '모집완료' : '모집중'}
          </span>
                </div>

                <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
                    호스트: {post.authorName || '익명'}
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

                <p style={{ fontSize: '16px', color: '#334155', lineHeight: '1.7', margin: '0 0 24px 0' }}>
                    {post.content}
                </p>

                <div style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    fontSize: '14px',
                    color: '#475569',
                    lineHeight: '1.8',
                }}>
                    <div>📍 <strong>장소:</strong> {post.location || '미정'}</div>
                    <div>👥 <strong>정원:</strong> {post.currentCapacity || 1} / {post.maxCapacity || 4}명</div>
                    <div>📅 <strong>날짜:</strong> {post.meetingDate || '미정'}</div>
                    <div>⏰ <strong>시간:</strong> {post.meetingTime || '미정'}</div>
                    <div>🎟️ <strong>행사:</strong> {post.event || '정보 없음'}</div>
                    <div>📋 <strong>조건:</strong> {post.condition || '제한 없음'}</div>
                </div>
            </div>

            {/* 액션 버튼 영역 */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {/* 참여하기 — 작성자 본인 제외 (본인이 아닐 때만 표시) */}
                {!canEdit && (
                    <button
                        onClick={handleJoin}
                        disabled={isFull || isJoining}
                        style={{
                            flex: 1,
                            padding: '16px',
                            borderRadius: '14px',
                            border: 'none',
                            backgroundColor: isFull || isJoining ? '#cbd5e1' : '#ff8a3d',
                            color: 'white',
                            fontWeight: '700',
                            fontSize: '16px',
                            cursor: isFull || isJoining ? 'default' : 'pointer',
                        }}
                    >
                        {isJoining ? '신청 중...' : isFull ? '모집이 마감되었습니다' : '참여하기'}
                    </button>
                )}

                {/* ✅ 수정/삭제 — 작성자 본인(canEdit)에게만 표시 */}
                {canEdit && (
                    <>
                        <button
                            onClick={() => navigate(`/groups/edit/${post.id}`)}
                            style={{
                                flex: 1,
                                padding: '16px',
                                borderRadius: '14px',
                                border: 'none',
                                backgroundColor: '#f1f5f9',
                                color: '#64748b',
                                fontWeight: '700',
                                fontSize: '16px',
                                cursor: 'pointer',
                            }}
                        >
                            ✏️ 수정하기
                        </button>
                        <button
                            onClick={handleDelete}
                            style={{
                                flex: 1,
                                padding: '16px',
                                borderRadius: '14px',
                                border: 'none',
                                backgroundColor: '#fee2e2',
                                color: '#ef4444',
                                fontWeight: '700',
                                fontSize: '16px',
                                cursor: 'pointer',
                            }}
                        >
                            🗑️ 삭제하기
                        </button>
                    </>
                )}

                <button
                    onClick={() => navigate(-1)}
                    style={{
                        padding: '16px 24px',
                        borderRadius: '14px',
                        border: '1.5px solid #e2e8f0',
                        backgroundColor: 'white',
                        color: '#64748b',
                        fontWeight: '600',
                        fontSize: '15px',
                        cursor: 'pointer',
                    }}
                >
                    ← 목록으로
                </button>
            </div>
        </div>
    );
};

export default GroupDetailPage;
