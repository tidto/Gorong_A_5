// 경로: src/components/GroupPublicChatSection.tsx
// 변경사항:
//  - 슬롯 클릭 시 해당 유저의 캣타워(/cattower/:userId)로 이동
//  - 고양이 이미지: matching_cat_faces 정적 이미지 + catColor 필터 유지
//    (기존 방식 그대로, 슬롯 크기만 확대: 44px → 60px)
//  - 빈 슬롯 크기도 동일하게 확대
//  - 내 메시지 오른쪽 정렬 유지
//  - 퇴장 시 슬롯 즉시 제거 유지
//  - [디자인 변경] 기존의 파란색 톤을 왼쪽 모집 UI와 어울리는 웜톤 오렌지/소프트 베이지/카키 톤으로 교체

import { useRef, useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    usePublicGroupWebSocketChat,
    type ChatParticipant,
    type PublicChatMsg,
} from '../hooks/usePublicGroupWebSocketChat'
import { auth } from '../firebase/firebaseConfig'

const MAX_SLOTS = 6

const CAT_COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
    ORANGE: { bg: '#FFF0E6', border: '#FB923C', text: '#EA580C' },
    CREAM:  { bg: '#FEFCE8', border: '#FCD34D', text: '#D97706' },
    BLACK:  { bg: '#E5E7EB', border: '#374151', text: '#111827' },
    GRAY:   { bg: '#F3F4F6', border: '#9CA3AF', text: '#4B5563' },
    WHITE:  { bg: '#F8FAFC', border: '#CBD5E1', text: '#475569' },
}

const STAGE_MAP: Record<string, { emoji: string; label: string; bg: string; color: string }> = {
    BASIC:  { emoji: '🌱', label: '기본',   bg: '#FFF7ED', color: '#EA580C' },
    TEEN:   { emoji: '✨', label: '성장1',  bg: '#FFFBEB', color: '#D97706' },
    ADULT:  { emoji: '⭐', label: '성장2',  bg: '#FFF7ED', color: '#C2410C' },
    MASTER: { emoji: '👑', label: '마스터', bg: '#FEF9C3', color: '#92400E' },
}

const STAGE_TO_FACE: Record<string, string> = {
    BASIC:  '/assets/cat/faces/matching_cat_faces/normal.png',
    TEEN:   '/assets/cat/faces/matching_cat_faces/happy.png',
    ADULT:  '/assets/cat/faces/matching_cat_faces/happy.png',
    MASTER: '/assets/cat/faces/matching_cat_faces/happy.png',
}

function catColorFilter(color: string): string {
    switch (color) {
        case 'ORANGE': return 'hue-rotate(18deg) saturate(1.45) brightness(1.05)'
        case 'CREAM':  return 'sepia(0.25) hue-rotate(-12deg) saturate(1.2) brightness(1.08)'
        case 'BLACK':  return 'brightness(0.35) contrast(1.15) saturate(0.3)'
        case 'GRAY':   return 'grayscale(0.6) brightness(0.9)'
        case 'WHITE':  return 'brightness(1.25) saturate(0.1)'
        default:       return ''
    }
}

// ── 참여자 슬롯 ─────────────────────────────────────────────
function ParticipantSlot({
                             participant,
                             onNavigate,
                         }: {
    participant: ChatParticipant | null
    onNavigate?: (userId: number) => void
}) {
    const colorKey = participant?.catColor?.toUpperCase() ?? 'CREAM'
    const stageKey = participant?.characterType?.toUpperCase() ?? 'BASIC'
    const colors   = CAT_COLOR_MAP[colorKey] ?? CAT_COLOR_MAP.CREAM
    const stage    = STAGE_MAP[stageKey]     ?? STAGE_MAP.BASIC
    const faceSrc  = STAGE_TO_FACE[stageKey] ?? STAGE_TO_FACE.BASIC

    const canNavigate = !!participant?.userId

    if (!participant) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '4px', padding: '8px 4px', borderRadius: '14px',
                border: '2px dashed rgba(255,255,255,0.25)',
                backgroundColor: 'rgba(255,255,255,0.08)', minWidth: 0,
            }}>
                <div style={{
                    width: '60px', height: '60px', borderRadius: '12px',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '22px', color: 'rgba(255,255,255,0.3)',
                }}>✕</div>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: '600' }}>준비</span>
            </div>
        )
    }

    return (
        <div
            onClick={() => canNavigate && onNavigate?.(participant.userId!)}
            style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '4px', padding: '8px 4px', borderRadius: '14px',
                border: '2px solid rgba(255,255,255,0.3)',
                backgroundColor: 'rgba(255,255,255,0.12)',
                minWidth: 0,
                cursor: canNavigate ? 'pointer' : 'default',
                transition: 'transform 0.15s, background-color 0.15s',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.07)'
                if (canNavigate) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.22)'
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'
            }}
            title={canNavigate
                ? `${participant.catName} · ${stage.label} · ${participant.nickname} — 캣타워 보기`
                : `${participant.catName} · ${stage.label} · ${participant.nickname}`}
        >
            {/* 고양이 이미지 영역 */}
            <div style={{
                width: '60px', height: '60px', borderRadius: '12px',
                backgroundColor: colors.bg,
                border: `2px solid ${colors.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', position: 'relative', flexShrink: 0,
            }}>
                <img
                    src={faceSrc}
                    alt={participant.catName}
                    style={{ width: '44px', height: '44px', objectFit: 'contain', filter: catColorFilter(colorKey) }}
                    onError={e => {
                        e.currentTarget.style.display = 'none'
                        const p = e.currentTarget.parentElement
                        if (p) p.innerHTML = `<span style="font-size:28px">${stage.emoji}</span>`
                    }}
                />
                {/* 성장단계 뱃지 */}
                <div style={{
                    position: 'absolute', bottom: '-3px', right: '-3px',
                    backgroundColor: stage.bg,
                    border: `1.5px solid ${colors.border}`,
                    borderRadius: '6px', padding: '0 3px',
                    fontSize: '9px', fontWeight: '800', color: stage.color,
                    lineHeight: '14px', whiteSpace: 'nowrap',
                }}>
                    {stage.emoji}
                </div>
                {/* 캣타워 이동 가능 표시 (오렌지 웜톤 매칭 배경) */}
                {canNavigate && (
                    <div style={{
                        position: 'absolute', top: '-3px', left: '-3px',
                        backgroundColor: 'rgba(212,122,85,0.9)',
                        borderRadius: '5px', padding: '1px 4px',
                        fontSize: '8px', color: 'white', fontWeight: '800',
                        lineHeight: '13px',
                    }}>
                        🏠
                    </div>
                )}
            </div>

            <span style={{
                fontSize: '10px', color: 'white', fontWeight: '700',
                maxWidth: '64px', overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap', textAlign: 'center',
            }} title={participant.nickname || participant.catName}>
                {participant.nickname || participant.catName}
            </span>
            <span style={{
                fontSize: '9px', color: 'rgba(255,255,255,0.45)',
                maxWidth: '64px', overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap', textAlign: 'center',
            }}>
                {participant.catName}
            </span>
        </div>
    )
}

// ── 메시지 행 ────────────────────────────────────────────────
function MessageRow({ msg, isMe }: { msg: PublicChatMsg; isMe: boolean }) {
    const colorKey = msg.catColor?.toUpperCase() ?? 'CREAM'
    const stageKey = msg.characterType?.toUpperCase() ?? 'BASIC'
    const colors   = CAT_COLOR_MAP[colorKey] ?? CAT_COLOR_MAP.CREAM
    const stage    = STAGE_MAP[stageKey]     ?? STAGE_MAP.BASIC
    const faceSrc  = STAGE_TO_FACE[stageKey] ?? STAGE_TO_FACE.BASIC
    const isMasked = !!msg.masked
    const messageText = isMasked ? (msg.maskedLabel || '이용이 제한된 유저입니다.') : msg.text

    return (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexDirection: isMe ? 'row-reverse' : 'row', marginBottom: '10px' }}>
            <div style={{
                width: '34px', height: '34px', borderRadius: '10px',
                backgroundColor: colors.bg, border: `2px solid ${colors.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, overflow: 'hidden',
            }} title={`${msg.nickname || msg.catName || msg.user} · ${msg.catName}`}>
                <img
                    src={faceSrc}
                    alt=""
                    style={{ width: '24px', height: '24px', objectFit: 'contain', filter: catColorFilter(colorKey) }}
                    onError={e => {
                        e.currentTarget.style.display = 'none'
                        const p = e.currentTarget.parentElement
                        if (p) p.innerHTML = `<span style="font-size:18px">${stage.emoji}</span>`
                    }}
                />
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'baseline', marginBottom: '3px', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: isMe ? '#D47A55' : colors.text }}>
                        {isMe ? '나' : (msg.nickname || msg.catName || msg.user || '익명')}
                    </span>
                    <span style={{ fontSize: '9px', color: '#94a3b8' }}>{msg.sentAt}</span>
                </div>
                <div style={{
                    fontSize: '13px',
                    color: isMasked ? '#64748b' : (isMe ? 'white' : '#1e293b'),
                    lineHeight: '1.55',
                    background: isMasked
                        ? 'linear-gradient(135deg, #f1f5f9, #e2e8f0)'
                        // 파란색 그라데이션에서 따뜻한 딥오렌지 그라데이션으로 교체
                        : (isMe ? 'linear-gradient(135deg, #E68A5C, #D47A55)' : 'white'),
                    padding: '8px 12px',
                    borderRadius: isMe ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    wordBreak: 'break-word',
                    maxWidth: '80%',
                    border: isMasked ? '1px dashed #cbd5e1' : 'none',
                    fontStyle: isMasked ? 'italic' : 'normal',
                }}>
                    {messageText}
                </div>
            </div>
        </div>
    )
}

// ── 메인 컴포넌트 ────────────────────────────────────────────
interface Props { groupId: string | number }

export default function GroupPublicChatSection({ groupId }: Props) {
    const [input, setInput]         = useState('')
    const [isEntered, setIsEntered] = useState(false)
    const messageListRef = useRef<HTMLDivElement>(null)
    const navigate  = useNavigate()

    const { messages, participants, connected, sending, myCat, sendMessage, sendJoin, sendLeave } =
        usePublicGroupWebSocketChat(groupId)

    const currentUserEmail = auth.currentUser?.email ?? ''

    const displayParticipants = useMemo<ChatParticipant[]>(() => {
        const base = isEntered
            ? participants
            : participants.filter(p =>
                p.email !== currentUserEmail &&
                p.nickname !== currentUserEmail
            )

        if (!isEntered || !myCat || !currentUserEmail) return base

        const alreadyIn = base.some(
            p => p.email === currentUserEmail || p.nickname === currentUserEmail
        )
        if (alreadyIn) return base

        const self: ChatParticipant = {
            email:         currentUserEmail,
            nickname:      (myCat as any).nickname || currentUserEmail.split('@')[0],
            catName:       myCat.catName,
            characterType: myCat.characterType,
            catColor:      myCat.catColor,
            userId:        myCat.userId,
        }
        return [self, ...base].slice(0, MAX_SLOTS)
    }, [isEntered, myCat, currentUserEmail, participants])

    const slots: (ChatParticipant | null)[] = [
        ...displayParticipants.slice(0, MAX_SLOTS),
        ...Array(Math.max(0, MAX_SLOTS - displayParticipants.length)).fill(null),
    ]

    useEffect(() => {
        const messageList = messageListRef.current
        if (messageList) messageList.scrollTop = messageList.scrollHeight
    }, [messages])

    const handleSend = async () => {
        if (!input.trim() || sending || !isEntered) return
        const text = input
        setInput('')
        await sendMessage(text)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    }

    // 슬롯 클릭 → 캣타워 이동
    const handleSlotNavigate = (userId: number) => {
        navigate(`/cattower/${userId}`)
    }

    return (
        // 파란색 그림자/테두리를 오렌지-브라운 테마에 맞게 보정
        <div style={{ borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(212,122,85,0.12)', border: '1px solid rgba(212,122,85,0.2)', fontFamily: 'Pretendard, sans-serif', maxWidth: '725px', width: '100%', marginRight: 'auto', marginLeft: 'auto' }}>

            {/* ── 헤더 (파란색 그라데이션에서 차분한 딥오렌지 브라운 톤으로 교체) ── */}
            <div style={{ background: 'linear-gradient(135deg, #C96F43 0%, #D47A55 60%, #E08B67 100%)', padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'white', fontWeight: '800', fontSize: '14px', letterSpacing: '-0.2px' }}>공개 그룹 채팅방</span>
                    <span style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', borderRadius: '20px', padding: '2px 8px', fontSize: '11px', fontWeight: '700' }}>
                        👥 {displayParticipants.length} / {MAX_SLOTS}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: connected ? '#86efac' : '#fca5a5', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: connected ? '#4ade80' : '#f87171', boxShadow: connected ? '0 0 6px #4ade80' : 'none' }} />
                        {connected ? '연결됨' : '연결 중...'}
                    </span>

                    {!isEntered ? (
                        <button
                            type="button"
                            onClick={() => { setIsEntered(true); sendJoin(); }}
                            style={{ border: 'none', borderRadius: '10px', padding: '6px 14px', backgroundColor: 'rgba(255,255,255,0.9)', color: '#D47A55', fontWeight: '800', fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s' }}
                        >
                            입장하기
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => { setIsEntered(false); sendLeave(); }}
                            style={{ border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: '10px', padding: '6px 14px', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.85)', fontWeight: '800', fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s' }}
                        >
                            퇴장하기
                        </button>
                    )}
                </div>
            </div>

            <div style={{ background: 'linear-gradient(180deg, #FBC9A0 0%, #FBC9A0 100%)', padding: '16px 16px 12px', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginBottom: '8px' }}>
                    {slots.map((p, i) => (
                        <ParticipantSlot key={i} participant={p} onNavigate={handleSlotNavigate} />
                    ))}
                </div>
                <p style={{ margin: 0, fontSize: '10px', color: 'rgba(255,255,255,0.8)', textAlign: 'center', fontWeight: '600' }}>
                    고냥이를 클릭하면 캣타워로 이동해요
                </p>
            </div>

            {/* ── 탭 헤더 ── */}
            <div style={{ backgroundColor: '#FAF7F2', padding: '8px 16px 0', display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#D47A55', borderBottom: '2px solid #D47A55', paddingBottom: '7px', paddingRight: '4px' }}>전체 채팅</span>
                {!isEntered && (
                    <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#94a3b8', fontWeight: '600', paddingBottom: '7px', alignSelf: 'flex-end' }}>
                        열람 중 · 입장하면 채팅 참여 가능
                    </span>
                )}
            </div>

            {/* ── 메시지 목록 ── */}
            <div ref={messageListRef} style={{ height: '260px', overflowY: 'auto', backgroundColor: '#FDFBF7', padding: '14px 14px 6px', display: 'flex', flexDirection: 'column', scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb #FDFBF7' }}>
                {messages.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px', textAlign: 'center', gap: '8px' }}>
                        <img
                            src="/assets/cat/faces/matching_cat_faces/sad.png"
                            alt=""
                            style={{ width: '40px', opacity: 0.5 }}
                            onError={e => { e.currentTarget.style.display = 'none' }}
                        />
                        <span>아직 대화가 없어요 ㅠ.ㅠ<br />첫 메시지를 남겨보세요!</span>
                    </div>
                ) : (
                    messages.map((msg, i) => (
                        <MessageRow
                            key={i}
                            msg={msg}
                            isMe={
                                !!currentUserEmail &&
                                (msg.senderEmail === currentUserEmail || msg.user === currentUserEmail)
                            }
                        />
                    ))
                )}
            </div>

            {/* ── 입력창 ── */}
            {isEntered ? (
                <div style={{ padding: '10px 12px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px', backgroundColor: '#FAFBFF', alignItems: 'center' }}>
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={connected ? '메시지 입력 후 Enter' : '연결 중...'}
                        disabled={!connected || sending}
                        maxLength={500}
                        style={{ flex: 1, border: '1.5px solid #dde3ef', borderRadius: '12px', padding: '9px 14px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', backgroundColor: !connected ? '#f8fafc' : 'white', color: '#1e293b', transition: 'border-color 0.2s' }}
                        onFocus={e => { e.currentTarget.style.borderColor = '#D47A55' }}
                        onBlur={e =>  { e.currentTarget.style.borderColor = '#dde3ef' }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!connected || !input.trim() || sending}
                        style={{
                            padding: '9px 18px', borderRadius: '12px', border: 'none',
                            background: connected && input.trim() && !sending ? 'linear-gradient(135deg, #E68A5C, #D47A55)' : '#e2e8f0',
                            color: connected && input.trim() && !sending ? 'white' : '#94a3b8',
                            fontWeight: '700', fontSize: '13px',
                            cursor: connected && input.trim() && !sending ? 'pointer' : 'default',
                            flexShrink: 0, fontFamily: 'inherit', transition: 'all 0.2s',
                            boxShadow: connected && input.trim() && !sending ? '0 2px 8px rgba(212,122,85,0.3)' : 'none',
                        }}
                    >
                        {sending ? '...' : '전송'}
                    </button>
                </div>
            ) : (
                <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', backgroundColor: '#FAFBFF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>채팅에 참여하려면 입장이 필요합니다</span>
                    <button
                        type="button"
                        onClick={() => setIsEntered(true)}
                        style={{ border: 'none', borderRadius: '10px', padding: '8px 18px', background: 'linear-gradient(135deg, #E68A5C, #D47A55)', color: 'white', fontWeight: '800', fontSize: '13px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(212,122,85,0.25)' }}
                    >
                        입장하기
                    </button>
                </div>
            )}

            {/* ── 하단 안내 ── */}
            <div style={{ backgroundColor: '#f8fafc', padding: '6px 16px', borderTop: '1px solid #f1f5f9', fontSize: '10px', color: '#94a3b8', textAlign: 'center' }}>
                🔒 로그인 사용자만 전송 가능 · 최근 60개 표시
            </div>
        </div>
    )
}