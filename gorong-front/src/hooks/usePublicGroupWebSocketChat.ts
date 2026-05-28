// 경로: src/hooks/usePublicGroupWebSocketChat.ts
//
// 공개 그룹 채팅 훅 v2
// - 메시지 전송 시 미니홈 캐릭터 정보(catName, characterType, catColor) 포함
// - 최근 메시지 발신자를 파싱해 참여자 슬롯 목록 제공

import { useState, useRef, useCallback, useEffect } from 'react'
import SockJS from 'sockjs-client'
import Stomp, { Client, Subscription } from 'stompjs'
import { auth } from '../firebase/firebaseConfig'
import axiosInstance from '../api/axiosInstance'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://98.84.85.31:8080'

// ── 타입 ─────────────────────────────────────────────────────────────

export interface PublicChatMsg {
    user: string
    senderEmail?: string
    catName?: string
    characterType?: string   // BASIC | TEEN | ADULT | MASTER
    catColor?: string        // ORANGE | CREAM | BLACK | GRAY | WHITE
    text: string
    sentAt?: string
}

/** 슬롯에 표시할 참여자 (최근 메시지 발신자 기반) */
export interface ChatParticipant {
    email: string
    nickname: string
    catName: string
    characterType: string
    catColor: string
}

/** 내 미니홈 캐릭터 캐시 */
interface MyCatCache {
    catName: string
    characterType: string
    catColor: string
}

// ── 헬퍼: 메시지 목록 → 참여자 목록 (최근 6명 고유 발신자) ──────────
function deriveParticipants(messages: PublicChatMsg[]): ChatParticipant[] {
    const seen = new Map<string, ChatParticipant>()
    // 최신 메시지 우선 → 역순 순회
    for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i]
        const key = m.senderEmail || m.user
        if (!key || seen.has(key)) continue
        seen.set(key, {
            email:         m.senderEmail || '',
            nickname:      m.user,
            catName:       m.catName       || m.user,
            characterType: m.characterType || 'BASIC',
            catColor:      m.catColor      || 'CREAM',
        })
        if (seen.size >= 6) break
    }
    // 오래된 순서로 뒤집기 (슬롯 왼→오른쪽 배치)
    return Array.from(seen.values()).reverse()
}

// ── 훅 ───────────────────────────────────────────────────────────────

export function usePublicGroupWebSocketChat(groupId: string | number) {
    const [messages, setMessages]       = useState<PublicChatMsg[]>([])
    const [participants, setParticipants] = useState<ChatParticipant[]>([])
    const [connected, setConnected]     = useState(false)
    const [sending, setSending]         = useState(false)
    const [myCat, setMyCat]             = useState<MyCatCache | null>(null)

    const stompRef = useRef<Client | null>(null)
    const subRef   = useRef<Subscription | null>(null)

    // ── 1. 내 미니홈 캐릭터 정보 사전 로딩 ──────────────────────────
    useEffect(() => {
        const currentUser = auth.currentUser
        if (!currentUser) return
        axiosInstance
            .get('/minihomes/me/page')
            .then(res => {
                const cat = res.data?.miniHome?.cat ?? res.data?.cat ?? null
                if (!cat) return
                // appearanceState.color → catColor
                const catColor =
                    (cat.appearanceState?.color as string | undefined) ?? 'CREAM'
                setMyCat({
                    catName:       cat.catName       || '고냥이',
                    characterType: cat.characterType || 'BASIC',
                    catColor:      catColor.toUpperCase(),
                })
            })
            .catch(() => {})
    }, [])

    // ── 2. 채팅 이력 로딩 (REST) ──────────────────────────────────────
    useEffect(() => {
        if (!groupId) return
        axiosInstance
            .get<PublicChatMsg[]>(`/public-chat/${groupId}/history`)
            .then(res => {
                setMessages(res.data)
                setParticipants(deriveParticipants(res.data))
            })
            .catch(() => {})
    }, [groupId])

    // ── 3. WebSocket 연결 & 구독 ──────────────────────────────────────
    useEffect(() => {
        if (!groupId) return

        const socket = new SockJS(`${API_BASE_URL}/ws-chat`)
        const client = Stomp.over(socket)
        client.debug = () => {}

        client.connect(
            {},
            () => {
                setConnected(true)
                subRef.current = client.subscribe(
                    `/topic/public/${groupId}`,
                    frame => {
                        try {
                            const msg: PublicChatMsg = JSON.parse(frame.body)
                            setMessages(prev => {
                                const next = [...prev, msg]
                                setParticipants(deriveParticipants(next))
                                return next
                            })
                        } catch { /* ignore */ }
                    }
                )
            },
            () => {
                setConnected(false)
            }
        )

        stompRef.current = client

        return () => {
            subRef.current?.unsubscribe()
            if (client.connected) client.disconnect(() => {})
            setConnected(false)
        }
    }, [groupId])

    // ── 4. 메시지 전송 ────────────────────────────────────────────────
    const sendMessage = useCallback(
        async (text: string) => {
            const trimmed = text.trim()
            if (!trimmed) return

            const currentUser = auth.currentUser
            if (!currentUser) {
                alert('로그인 후 채팅에 참여할 수 있습니다.')
                return
            }
            if (!stompRef.current?.connected) {
                alert('채팅 서버에 연결 중입니다. 잠시 후 다시 시도해 주세요.')
                return
            }

            setSending(true)
            try {
                stompRef.current.send(
                    `/app/public.send/${groupId}`,
                    {},
                    JSON.stringify({
                        senderEmail:   currentUser.email,
                        catName:       myCat?.catName       ?? '',
                        characterType: myCat?.characterType ?? 'BASIC',
                        catColor:      myCat?.catColor      ?? 'CREAM',
                        text:          trimmed,
                        type:          'CHAT',
                    })
                )
            } finally {
                setSending(false)
            }
        },
        [groupId, myCat]
    )

    return { messages, participants, connected, sending, myCat, sendMessage }
}