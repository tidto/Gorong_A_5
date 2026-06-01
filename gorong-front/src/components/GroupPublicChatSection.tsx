// 경로: src/components/GroupPublicChatSection.tsx
// 변경사항:
//  4. 내 메시지는 오른쪽 정렬로 표시 (isMe 판별 추가)
//  5. 퇴장하기 클릭 시 슬롯에서 내 캐릭터 즉시 제거
//     새로고침 시에도 isEntered = false(초기값)이므로 슬롯에 미표시

import { useRef, useState, useEffect, useMemo } from 'react'
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

function ParticipantSlot({ participant }: { participant: ChatParticipant | null }) {
    const colorKey = participant?.catColor?.toUpperCase() ?? 'CREAM'
    const stageKey = participant?.characterType?.toUpperCase() ?? 'BASIC'
    const colors   = CAT_COLOR_MAP[colorKey] ?? CAT_COLOR_MAP.CREAM
    const stage    = STAGE_MAP[stageKey]     ?? STAGE_MAP.BASIC
    const faceSrc  = STAGE_TO_FACE[stageKey] ?? STAGE_TO_FACE.BASIC

    if (!participant) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '8px 4px', borderRadius: '12px', border: '2px dashed rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.08)', minWidth: 0 }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: 'rgba(255,255,255,0.3)' }}>✕</div>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: '600' }}>준비</span>
            </div>
        )
    }

    return (
        <div
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '8px 4px', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.12)', minWidth: 0, cursor: 'default', transition: 'transform 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            title={`${participant.catName} · ${stage.label} · ${participant.nickname}`}
        >
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: colors.bg, border: `2px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                <img src={faceSrc} alt={participant.catName}
                     style={{ width: '32px', height: '32px', objectFit: 'contain', filter: catColorFilter(colorKey) }}
                     onError={e => { e.currentTarget.style.display = 'none'; const p = e.currentTarget.parentElement; if (p) p.innerHTML = `<span style="font-size:24px">${stage.emoji}</span>` }}
                />
                <div style={{ position: 'absolute', bottom: '-3px', right: '-3px', backgroundColor: stage.bg, border: `1.5px solid ${colors.border}`, borderRadius: '6px', padding: '0 3px', fontSize: '9px', fontWeight: '800', color: stage.color, lineHeight: '14px', whiteSpace: 'nowrap' }}>
                    {stage.emoji}
                </div>
            </div>
            <span style={{ fontSize: '10px', color: 'white', fontWeight: '700', maxWidth: '56px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }} title={participant.nickname || participant.catName}>
        {participant.nickname || participant.catName}
      </span>
            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.45)', maxWidth: '56px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
        {participant.catName}
      </span>
        </div>
    )
}

// ✅ 4. isMe prop을 실제로 활용 — 내 메시지는 오른쪽 정렬
function MessageRow({ msg, isMe }: { msg: PublicChatMsg; isMe: boolean }) {
    const colorKey = msg.catColor?.toUpperCase() ?? 'CREAM'
    const stageKey = msg.characterType?.toUpperCase() ?? 'BASIC'
    const colors   = CAT_COLOR_MAP[colorKey] ?? CAT_COLOR_MAP.CREAM
    const stage    = STAGE_MAP[stageKey]     ?? STAGE_MAP.BASIC
    const faceSrc  = STAGE_TO_FACE[stageKey] ?? STAGE_TO_FACE.BASIC

    return (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexDirection: isMe ? 'row-reverse' : 'row', marginBottom: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: colors.bg, border: `2px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }} title={`${msg.nickname || msg.catName || msg.user} · ${msg.catName}`}>
                <img src={faceSrc} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain', filter: catColorFilter(colorKey) }}
                     onError={e => { e.currentTarget.style.display = 'none'; const p = e.currentTarget.parentElement; if (p) p.innerHTML = `<span style="font-size:18px">${stage.emoji}</span>` }}
                />
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'baseline', marginBottom: '3px', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: isMe ? '#1565c0' : colors.text }}>
                        {isMe ? '나' : (msg.nickname || msg.catName || msg.user || '익명')}
                    </span>
                    <span style={{ fontSize: '9px', color: '#94a3b8' }}>{msg.sentAt}</span>
                </div>
                <div style={{
                    fontSize: '13px',
                    color: isMe ? 'white' : '#1e293b',
                    lineHeight: '1.55',
                    // ✅ 내 메시지: 파란 말풍선 오른쪽 / 상대: 흰 말풍선 왼쪽
                    background: isMe ? 'linear-gradient(135deg, #1a5c9c, #1565c0)' : 'white',
                    padding: '8px 12px',
                    borderRadius: isMe ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    wordBreak: 'break-word',
                    maxWidth: '80%',
                }}>
                    {msg.text}
                </div>
            </div>
        </div>
    )
}

interface Props { groupId: string | number }

export default function GroupPublicChatSection({ groupId }: Props) {
    const [input, setInput]         = useState('')
    const [isEntered, setIsEntered] = useState(false)
    const msgEndRef = useRef<HTMLDivElement>(null)

    const { messages, participants, connected, sending, myCat, sendMessage } =
        usePublicGroupWebSocketChat(groupId)

    // ✅ 현재 로그인 유저 이메일 (isMe 판별 + 슬롯 필터링에 사용)
    const currentUserEmail = auth.currentUser?.email ?? ''

    // ✅ 5. displayParticipants:
    //    - isEntered = false → 내 이메일을 participants에서 제거 (퇴장 / 새로고침 시 슬롯 비워짐)
    //    - isEntered = true  → 내 고냥이를 슬롯에 즉시 표시 (메시지를 보내기 전에도)
    const displayParticipants = useMemo<ChatParticipant[]>(() => {
        // 퇴장 상태 또는 새로고침 시: 내 이메일을 슬롯에서 제외
        const base = isEntered
            ? participants
            : participants.filter(p =>
                p.email !== currentUserEmail &&
                p.nickname !== currentUserEmail  // 이메일을 닉네임으로 쓰는 경우 대비
            )

        if (!isEntered || !myCat || !currentUserEmail) return base

        // 입장 상태이고, 아직 슬롯에 없으면 즉시 추가
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
        }
        return [self, ...base].slice(0, MAX_SLOTS)
    }, [isEntered, myCat, currentUserEmail, participants])

    const slots: (ChatParticipant | null)[] = [
        ...displayParticipants.slice(0, MAX_SLOTS),
        ...Array(Math.max(0, MAX_SLOTS - displayParticipants.length)).fill(null),
    ]

    useEffect(() => {
        msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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

    return (
        <div style={{ marginTop: '28px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(21,101,192,0.15)', border: '1px solid rgba(26,92,156,0.2)', fontFamily: 'Pretendard, sans-serif', maxWidth: '725px', width: '100%', marginRight: 'auto', marginLeft: 'auto' }}>

            {/* ── 헤더 ── */}
            <div style={{ background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 60%, #1976d2 100%)', padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>💬</span>
                    <span style={{ color: 'white', fontWeight: '800', fontSize: '14px', letterSpacing: '-0.2px' }}>공개 그룹 채팅</span>
                    <span style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', borderRadius: '20px', padding: '2px 8px', fontSize: '11px', fontWeight: '700' }}>
            👥 {displayParticipants.length} / {MAX_SLOTS}
          </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: connected ? '#86efac' : '#fca5a5', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: connected ? '#4ade80' : '#f87171', boxShadow: connected ? '0 0 6px #4ade80' : 'none' }} />
                        {connected ? '연결됨' : '연결 중...'}
          </span>

                    {/* ── 입장 / 퇴장 버튼 ── */}
                    {!isEntered ? (
                        <button
                            type="button"
                            onClick={() => setIsEntered(true)}
                            style={{ border: 'none', borderRadius: '10px', padding: '6px 14px', backgroundColor: 'rgba(255,255,255,0.9)', color: '#1565c0', fontWeight: '800', fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s' }}
                        >
                            입장하기
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setIsEntered(false)}  // ✅ 퇴장 → displayParticipants에서 내 캐릭터 제거
                            style={{ border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: '10px', padding: '6px 14px', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.85)', fontWeight: '800', fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s' }}
                        >
                            퇴장하기
                        </button>
                    )}
                </div>
            </div>

            {/* ── 참여자 슬롯 ── */}
            <div style={{ background: 'linear-gradient(180deg, #1565c0 0%, #1976d2 100%)', padding: '14px 16px 12px', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginBottom: '10px' }}>
                    {slots.map((p, i) => <ParticipantSlot key={i} participant={p} />)}
                </div>
                <p style={{ margin: 0, fontSize: '10px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontWeight: '600' }}>
                    메시지를 보내면 슬롯에 고냥이가 나타나요 🐱
                </p>
            </div>

            {/* ── 탭 헤더 ── */}
            <div style={{ backgroundColor: '#EEF2FF', padding: '8px 16px 0', display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#1565c0', borderBottom: '2px solid #1565c0', paddingBottom: '7px', paddingRight: '4px' }}>전체 채팅</span>
                {!isEntered && (
                    <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#94a3b8', fontWeight: '600', paddingBottom: '7px', alignSelf: 'flex-end' }}>
            👀 열람 중 · 입장하면 채팅 참여 가능
          </span>
                )}
            </div>

            {/* ── 메시지 목록 ── */}
            <div style={{ height: '260px', overflowY: 'auto', backgroundColor: '#f0f4ff', padding: '14px 14px 6px', display: 'flex', flexDirection: 'column', scrollbarWidth: 'thin', scrollbarColor: '#c7d2fe #f0f4ff' }}>
                {messages.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px', textAlign: 'center', gap: '8px' }}>
                        <img src="/assets/cat/faces/matching_cat_faces/sad.png" alt="" style={{ width: '40px', opacity: 0.5 }} onError={e => { e.currentTarget.style.display = 'none' }} />
                        <span>아직 대화가 없어요 👀<br />첫 메시지를 남겨보세요!</span>
                    </div>
                ) : (
                    // ✅ 4. isMe 판별: 내 이메일과 발신자 이메일 비교
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
                <div ref={msgEndRef} />
            </div>

            {/* ── 입장 상태일 때만 입력창 표시 ── */}
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
                        onFocus={e => { e.currentTarget.style.borderColor = '#1565c0' }}
                        onBlur={e =>  { e.currentTarget.style.borderColor = '#dde3ef' }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!connected || !input.trim() || sending}
                        style={{
                            padding: '9px 18px', borderRadius: '12px', border: 'none',
                            background: connected && input.trim() && !sending ? 'linear-gradient(135deg, #1565c0, #1976d2)' : '#e2e8f0',
                            color: connected && input.trim() && !sending ? 'white' : '#94a3b8',
                            fontWeight: '700', fontSize: '13px',
                            cursor: connected && input.trim() && !sending ? 'pointer' : 'default',
                            flexShrink: 0, fontFamily: 'inherit', transition: 'all 0.2s',
                            boxShadow: connected && input.trim() && !sending ? '0 2px 8px rgba(21,101,192,0.3)' : 'none',
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
                        style={{ border: 'none', borderRadius: '10px', padding: '8px 18px', background: 'linear-gradient(135deg, #1565c0, #1976d2)', color: 'white', fontWeight: '800', fontSize: '13px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(21,101,192,0.25)' }}
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
