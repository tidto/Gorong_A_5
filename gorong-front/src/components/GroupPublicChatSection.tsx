// 경로: src/components/GroupPublicChatSection.tsx
//
// 공개 그룹 채팅 섹션 v2 (크기 및 레이아웃 버그 수정 버전)
// - 참여자를 슬롯 그리드로 표시 (최근 메시지 발신자 기반)
// - 미니홈 GoCat 캐릭터 색상 & 성장 단계 시각화
// - 고양이 얼굴 이미지(/assets/cat/faces/...) 활용

import { useRef, useState, useEffect } from 'react'
import {
    usePublicGroupWebSocketChat,
    type ChatParticipant,
    type PublicChatMsg,
} from '../hooks/usePublicGroupWebSocketChat'

// ── 상수 ────────────────────────────────────────────────────────────

const MAX_SLOTS = 6

/** GoCat 색상 → 슬롯 배경색 & 테두리색 */
const CAT_COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
    ORANGE: { bg: '#FFF0E6', border: '#FB923C', text: '#EA580C' },
    CREAM:  { bg: '#FEFCE8', border: '#FCD34D', text: '#D97706' },
    BLACK:  { bg: '#E5E7EB', border: '#374151', text: '#111827' },
    GRAY:   { bg: '#F3F4F6', border: '#9CA3AF', text: '#4B5563' },
    WHITE:  { bg: '#F8FAFC', border: '#CBD5E1', text: '#475569' },
}

/** 성장 단계 → 뱃지 정보 */
const STAGE_MAP: Record<string, { emoji: string; label: string; bg: string; color: string }> = {
    BASIC:  { emoji: '🌱', label: '기본',   bg: '#FFF7ED', color: '#EA580C' },
    TEEN:   { emoji: '✨', label: '성장1',  bg: '#FFFBEB', color: '#D97706' },
    ADULT:  { emoji: '⭐', label: '성장2',  bg: '#FFF7ED', color: '#C2410C' },
    MASTER: { emoji: '👑', label: '마스터', bg: '#FEF9C3', color: '#92400E' },
}

/** 성장 단계 → 고양이 얼굴 표정 */
const STAGE_TO_FACE: Record<string, string> = {
    BASIC:  '/assets/cat/faces/matching_cat_faces/normal.png',
    TEEN:   '/assets/cat/faces/matching_cat_faces/happy.png',
    ADULT:  '/assets/cat/faces/matching_cat_faces/happy.png',
    MASTER: '/assets/cat/faces/matching_cat_faces/happy.png',
}

// ── 참여자 슬롯 ─────────────────────────────────────────────────────

function ParticipantSlot({ participant }: { participant: ChatParticipant | null }) {
    const colorKey = participant?.catColor?.toUpperCase() ?? 'CREAM'
    const stageKey = participant?.characterType?.toUpperCase() ?? 'BASIC'
    const colors   = CAT_COLOR_MAP[colorKey] ?? CAT_COLOR_MAP.CREAM
    const stage    = STAGE_MAP[stageKey]     ?? STAGE_MAP.BASIC
    const faceSrc  = STAGE_TO_FACE[stageKey] ?? STAGE_TO_FACE.BASIC

    if (!participant) {
        return (
            <div
                style={{
                    display:         'flex',
                    flexDirection:   'column',
                    alignItems:      'center',
                    gap:             '4px',
                    padding:         '8px 4px',
                    borderRadius:    '12px',
                    border:          '2px dashed rgba(255,255,255,0.25)',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    minWidth:        0,
                }}
            >
                <div
                    style={{
                        width:          '44px',
                        height:         '44px',
                        borderRadius:   '10px',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        display:         'flex',
                        alignItems:      'center',
                        justifyContent:  'center',
                        fontSize:        '20px',
                        color:           'rgba(255,255,255,0.3)',
                    }}
                >
                    ✕
                </div>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: '600' }}>
                    준비
                </span>
            </div>
        )
    }

    return (
        <div
            style={{
                display:         'flex',
                flexDirection:   'column',
                alignItems:      'center',
                gap:             '4px',
                padding:         '8px 4px',
                borderRadius:    '12px',
                border:          `2px solid rgba(255,255,255,0.3)`,
                backgroundColor: 'rgba(255,255,255,0.12)',
                minWidth:        0,
                cursor:          'default',
                transition:      'transform 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            title={`${participant.catName} · ${stage.label} · ${participant.nickname}`}
        >
            {/* 캐릭터 아이콘 */}
            <div
                style={{
                    width:           '44px',
                    height:          '44px',
                    borderRadius:    '10px',
                    backgroundColor: colors.bg,
                    border:          `2px solid ${colors.border}`,
                    display:         'flex',
                    alignItems:      'center',
                    justifyContent:  'center',
                    overflow:        'hidden',
                    position:        'relative',
                    flexShrink:      0,
                }}
            >
                <img
                    src={faceSrc}
                    alt={participant.catName}
                    style={{
                        width:       '32px',
                        height:      '32px',
                        objectFit:   'contain',
                        filter:      catColorFilter(colorKey),
                    }}
                    onError={e => {
                        e.currentTarget.style.display = 'none'
                        const parent = e.currentTarget.parentElement
                        if (parent) parent.innerHTML = `<span style="font-size:24px">${stage.emoji}</span>`
                    }}
                />
                {/* 성장 단계 뱃지 */}
                <div
                    style={{
                        position:        'absolute',
                        bottom:          '-3px',
                        right:           '-3px',
                        backgroundColor: stage.bg,
                        border:          `1.5px solid ${colors.border}`,
                        borderRadius:    '6px',
                        padding:         '0 3px',
                        fontSize:        '9px',
                        fontWeight:      '800',
                        color:           stage.color,
                        lineHeight:      '14px',
                        whiteSpace:      'nowrap',
                    }}
                >
                    {stage.emoji}
                </div>
            </div>

            {/* 고냥이 이름 */}
            <span
                style={{
                    fontSize:    '10px',
                    color:       'white',
                    fontWeight:  '700',
                    maxWidth:    '56px',
                    overflow:    'hidden',
                    textOverflow:'ellipsis',
                    whiteSpace:  'nowrap',
                    textAlign:   'center',
                }}
            >
                {participant.catName}
            </span>
            <span
                style={{
                    fontSize:     '9px',
                    color:        'rgba(255,255,255,0.55)',
                    maxWidth:     '56px',
                    overflow:     'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace:   'nowrap',
                }}
            >
                {stage.label}
            </span>
        </div>
    )
}

/** 고냥이 색상 → CSS filter (face 이미지에 색상 입히기) */
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

// ── 채팅 메시지 한 줄 ────────────────────────────────────────────────

function MessageRow({ msg, isMe }: { msg: PublicChatMsg; isMe: boolean }) {
    const colorKey = msg.catColor?.toUpperCase() ?? 'CREAM'
    const stageKey = msg.characterType?.toUpperCase() ?? 'BASIC'
    const colors   = CAT_COLOR_MAP[colorKey] ?? CAT_COLOR_MAP.CREAM
    const stage    = STAGE_MAP[stageKey]     ?? STAGE_MAP.BASIC
    const faceSrc  = STAGE_TO_FACE[stageKey] ?? STAGE_TO_FACE.BASIC

    return (
        <div
            style={{
                display:        'flex',
                gap:            '8px',
                alignItems:     'flex-start',
                flexDirection:  isMe ? 'row-reverse' : 'row',
                marginBottom:   '10px',
            }}
        >
            {/* 아바타 */}
            <div
                style={{
                    width:           '34px',
                    height:          '34px',
                    borderRadius:    '10px',
                    backgroundColor: colors.bg,
                    border:          `2px solid ${colors.border}`,
                    display:         'flex',
                    alignItems:      'center',
                    justifyContent:  'center',
                    flexShrink:      0,
                    overflow:        'hidden',
                }}
                title={`${msg.catName ?? msg.user} · ${stage.label}`}
            >
                <img
                    src={faceSrc}
                    alt=""
                    style={{
                        width:     '24px',
                        height:    '24px',
                        objectFit: 'contain',
                        filter:    catColorFilter(colorKey),
                    }}
                    onError={e => {
                        e.currentTarget.style.display = 'none'
                        const p = e.currentTarget.parentElement
                        if (p) p.innerHTML = `<span style="font-size:18px">${stage.emoji}</span>`
                    }}
                />
            </div>

            {/* 말풍선 */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                <div
                    style={{
                        display:    'flex',
                        gap:        '5px',
                        alignItems: 'baseline',
                        marginBottom: '3px',
                        flexDirection: isMe ? 'row-reverse' : 'row',
                    }}
                >
                    <span style={{ fontSize: '11px', fontWeight: '700', color: colors.text }}>
                        {msg.catName || msg.user || '익명'}
                    </span>
                    <span style={{ fontSize: '9px', color: '#94a3b8' }}>{msg.sentAt}</span>
                </div>
                <div
                    style={{
                        fontSize:     '13px',
                        color:        isMe ? 'white' : '#1e293b',
                        lineHeight:   '1.55',
                        background:   isMe
                            ? 'linear-gradient(135deg, #1a5c9c, #1565c0)'
                            : 'white',
                        padding:      '8px 12px',
                        borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                        boxShadow:    '0 1px 4px rgba(0,0,0,0.08)',
                        wordBreak:    'break-word',
                        maxWidth:     '80%',
                    }}
                >
                    {msg.text}
                </div>
            </div>
        </div>
    )
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────

interface Props { groupId: string | number }

export default function GroupPublicChatSection({ groupId }: Props) {
    const [input, setInput] = useState('')
    const msgEndRef          = useRef<HTMLDivElement>(null)
    const { currentUser }    = { currentUser: null as any }

    const { messages, participants, connected, sending, sendMessage } =
        usePublicGroupWebSocketChat(groupId)

    const slots: (ChatParticipant | null)[] = [
        ...participants.slice(0, MAX_SLOTS),
        ...Array(Math.max(0, MAX_SLOTS - participants.length)).fill(null),
    ]

    useEffect(() => {
        msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = async () => {
        if (!input.trim() || sending) return
        const text = input
        setInput('')
        await sendMessage(text)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div
            style={{
                marginTop:    '28px',
                borderRadius: '20px',
                overflow:     'hidden',
                boxShadow:    '0 8px 32px rgba(21,101,192,0.15)',
                border:       '1px solid rgba(26,92,156,0.2)',
                fontFamily:   'Pretendard, sans-serif',

                // ── [수정 및 추가된 크기 보정 스타일] ──
                maxWidth:     '725px',       // 상단 오렌지 버튼 배너의 가로 폭과 유사하게 맞춰 안정감을 줌
                width:        '100%',        // 모바일이나 좁은 해상도 환경 대응
                marginRight:  'auto',        // 수평 가운데 정렬
                marginLeft:   'auto',         // 수평 가운데 정렬
            }}
        >
            {/* ── 헤더 ─────────────────────────────────────────────── */}
            <div
                style={{
                    background:     'linear-gradient(135deg, #0d47a1 0%, #1565c0 60%, #1976d2 100%)',
                    padding:        '13px 18px',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'space-between',
                    borderBottom:   '1px solid rgba(255,255,255,0.12)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>💬</span>
                    <span style={{ color: 'white', fontWeight: '800', fontSize: '14px', letterSpacing: '-0.2px' }}>
                        공개 그룹 채팅
                    </span>
                    <span
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.15)',
                            color:           'rgba(255,255,255,0.8)',
                            borderRadius:    '20px',
                            padding:         '2px 8px',
                            fontSize:        '11px',
                            fontWeight:      '700',
                        }}
                    >
                        👥 {participants.length} / {MAX_SLOTS}
                    </span>
                </div>
                <span
                    style={{
                        fontSize:  '11px',
                        fontWeight: '700',
                        color:      connected ? '#86efac' : '#fca5a5',
                        display:    'flex',
                        alignItems: 'center',
                        gap:        '4px',
                    }}
                >
                    <span style={{
                        display:         'inline-block',
                        width:           '6px',
                        height:          '6px',
                        borderRadius:    '50%',
                        backgroundColor: connected ? '#4ade80' : '#f87171',
                        boxShadow:       connected ? '0 0 6px #4ade80' : 'none',
                    }} />
                    {connected ? '연결됨' : '연결 중...'}
                </span>
            </div>

            {/* ── 참여자 슬롯 그리드 ───────────────────────────────── */}
            <div
                style={{
                    background:  'linear-gradient(180deg, #1565c0 0%, #1976d2 100%)',
                    padding:     '14px 16px 12px',
                    borderBottom: '2px solid rgba(255,255,255,0.1)',
                }}
            >
                {/* 슬롯 그리드 */}
                <div
                    style={{
                        display:             'grid',
                        gridTemplateColumns: 'repeat(6, 1fr)',
                        gap:                 '8px',
                        marginBottom:        '10px',
                    }}
                >
                    {slots.map((p, i) => (
                        <ParticipantSlot key={i} participant={p} />
                    ))}
                </div>

                {/* 안내 */}
                <p
                    style={{
                        margin:     0,
                        fontSize:   '10px',
                        color:      'rgba(255,255,255,0.5)',
                        textAlign:  'center',
                        fontWeight: '600',
                    }}
                >
                    메시지를 보내면 슬롯에 고냥이가 나타나요 🐱
                </p>
            </div>

            {/* ── 채팅 탭 헤더 ────────────────────────────────────── */}
            <div
                style={{
                    backgroundColor: '#EEF2FF',
                    padding:         '8px 16px 0',
                    display:         'flex',
                    borderBottom:    '1px solid #e2e8f0',
                }}
            >
                <span
                    style={{
                        fontSize:        '12px',
                        fontWeight:      '700',
                        color:           '#1565c0',
                        borderBottom:    '2px solid #1565c0',
                        paddingBottom:   '7px',
                        paddingRight:    '4px',
                    }}
                >
                    전체 채팅
                </span>
            </div>

            {/* ── 메시지 목록 ──────────────────────────────────────── */}
            <div
                style={{
                    height:          '260px',
                    overflowY:       'auto',
                    backgroundColor: '#f0f4ff',
                    padding:         '14px 14px 6px',
                    display:         'flex',
                    flexDirection:   'column',
                    scrollbarWidth:  'thin',
                    scrollbarColor:  '#c7d2fe #f0f4ff',
                }}
            >
                {messages.length === 0 ? (
                    <div
                        style={{
                            flex:           1,
                            display:        'flex',
                            flexDirection:  'column',
                            alignItems:     'center',
                            justifyContent: 'center',
                            color:          '#94a3b8',
                            fontSize:       '13px',
                            textAlign:      'center',
                            gap:            '8px',
                        }}
                    >
                        <img
                            src="/assets/cat/faces/matching_cat_faces/sad.png"
                            alt=""
                            style={{ width: '40px', opacity: 0.5 }}
                            onError={e => { e.currentTarget.style.display = 'none' }}
                        />
                        <span>
                            아직 대화가 없어요 👀<br />
                            첫 메시지를 남겨보세요!
                        </span>
                    </div>
                ) : (
                    messages.map((msg, i) => (
                        <MessageRow
                            key={i}
                            msg={msg}
                            isMe={false}
                        />
                    ))
                )}
                <div ref={msgEndRef} />
            </div>

            {/* ── 입력창 ───────────────────────────────────────────── */}
            <div
                style={{
                    padding:         '10px 12px',
                    borderTop:       '1px solid #e2e8f0',
                    display:         'flex',
                    gap:             '8px',
                    backgroundColor: '#FAFBFF',
                    alignItems:      'center',
                }}
            >
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                        connected
                            ? '메시지 입력 후 Enter (로그인 필요)'
                            : '연결 중...'
                    }
                    disabled={!connected || sending}
                    maxLength={500}
                    style={{
                        flex:            1,
                        border:          '1.5px solid #dde3ef',
                        borderRadius:    '12px',
                        padding:         '9px 14px',
                        fontSize:        '13px',
                        outline:         'none',
                        fontFamily:      'inherit',
                        backgroundColor: !connected ? '#f8fafc' : 'white',
                        color:           '#1e293b',
                        transition:      'border-color 0.2s',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#1565c0' }}
                    onBlur={e =>  { e.currentTarget.style.borderColor = '#dde3ef' }}
                />
                <button
                    onClick={handleSend}
                    disabled={!connected || !input.trim() || sending}
                    style={{
                        padding:         '9px 18px',
                        borderRadius:    '12px',
                        border:          'none',
                        background:
                            connected && input.trim() && !sending
                                ? 'linear-gradient(135deg, #1565c0, #1976d2)'
                                : '#e2e8f0',
                        color:
                            connected && input.trim() && !sending
                                ? 'white'
                                : '#94a3b8',
                        fontWeight:  '700',
                        fontSize:    '13px',
                        cursor:
                            connected && input.trim() && !sending
                                ? 'pointer'
                                : 'default',
                        flexShrink:  0,
                        fontFamily:  'inherit',
                        transition:  'all 0.2s',
                        boxShadow:
                            connected && input.trim() && !sending
                                ? '0 2px 8px rgba(21,101,192,0.3)'
                                : 'none',
                    }}
                >
                    {sending ? '...' : '전송'}
                </button>
            </div>

            {/* ── 하단 안내 ─────────────────────────────────────────── */}
            <div
                style={{
                    backgroundColor: '#f8fafc',
                    padding:         '6px 16px',
                    borderTop:       '1px solid #f1f5f9',
                    fontSize:        '10px',
                    color:           '#94a3b8',
                    textAlign:       'center',
                }}
            >
                🔒 로그인 사용자만 전송 가능 · 참여 신청 없이 누구나 열람 · 최근 60개 표시
            </div>
        </div>
    )
}