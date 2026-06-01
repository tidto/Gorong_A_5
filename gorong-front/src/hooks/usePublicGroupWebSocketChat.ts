// 경로: src/hooks/usePublicGroupWebSocketChat.ts
//
// 변경사항:
//  - 메시지 2번 뜨는 버그 수정
//    → React StrictMode에서 useEffect가 두 번 실행될 때
//      cleanup 전에 connect callback이 발화하면 구독이 중복됨
//    → `cancelled` 플래그 + SockJS socket.close() 강제 종료로 해결

import { useState, useRef, useCallback, useEffect } from 'react'
import SockJS from 'sockjs-client'
import Stomp, { Client, Subscription } from 'stompjs'
import { auth } from '../firebase/firebaseConfig'
import axiosInstance from '../api/axiosInstance'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://98.84.85.31:8080'

export interface PublicChatMsg {
    user: string
    senderEmail?: string
    nickname?: string      // 유저 닉네임
    catName?: string
    characterType?: string
    catColor?: string
    text: string
    sentAt?: string
}

export interface ChatParticipant {
    email: string
    nickname: string
    catName: string
    characterType: string
    catColor: string
}

interface MyCatCache {
    catName: string
    characterType: string
    catColor: string
    nickname: string   // 유저 닉네임 (슬롯 표시용)
}

function deriveParticipants(messages: PublicChatMsg[]): ChatParticipant[] {
    const seen = new Map<string, ChatParticipant>()
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
    return Array.from(seen.values()).reverse()
}

export function usePublicGroupWebSocketChat(groupId: string | number) {
    const [messages, setMessages]         = useState<PublicChatMsg[]>([])
    const [participants, setParticipants] = useState<ChatParticipant[]>([])
    const [connected, setConnected]       = useState(false)
    const [sending, setSending]           = useState(false)
    const [myCat, setMyCat]               = useState<MyCatCache | null>(null)

    const stompRef = useRef<Client | null>(null)
    const subRef   = useRef<Subscription | null>(null)

    // 1. 내 미니홈 캐릭터 + 닉네임 로딩
    useEffect(() => {
        if (!auth.currentUser) return
        axiosInstance.get('/minihomes/me/page')
            .then(res => {
                const data = res.data
                const cat  = data?.miniHome?.cat ?? data?.cat ?? null
                if (!cat) return
                const catColor = (cat.appearanceState?.color as string | undefined) ?? 'CREAM'

                // 닉네임: 미니홈 API 응답 여러 경로 시도 → Firebase displayName → 이메일 앞부분 순서로 폴백
                const nickname =
                    data?.miniHome?.user?.nickname ??
                    data?.user?.nickname            ??
                    data?.nickname                  ??
                    auth.currentUser?.displayName   ??
                    (auth.currentUser?.email?.split('@')[0] ?? '익명')

                setMyCat({
                    catName:       cat.catName       || '고냥이',
                    characterType: cat.characterType || 'BASIC',
                    catColor:      catColor.toUpperCase(),
                    nickname:      String(nickname),
                })
            })
            .catch(() => {})
    }, [])

    // 2. 채팅 이력 (REST)
    useEffect(() => {
        if (!groupId) return
        axiosInstance.get<PublicChatMsg[]>(`/public-chat/${groupId}/history`)
            .then(res => {
                setMessages(res.data)
                setParticipants(deriveParticipants(res.data))
            })
            .catch(() => {})
    }, [groupId])

    // 3. WebSocket 연결 & 구독
    //    ── 핵심 버그 수정 ──────────────────────────────────────
    //    React StrictMode에서는 effect가 mount → cleanup → mount 순서로
    //    두 번 실행된다. cleanup 시점에 아직 STOMP 연결이 진행 중이면
    //    disconnect()가 무시되어 첫 번째 구독이 살아남고, 두 번째 구독이
    //    추가로 생겨 메시지가 두 번 수신된다.
    //    → `cancelled` 플래그: connect callback 진입 시 확인하여
    //      cleanup된 연결이면 즉시 클라이언트를 끊는다.
    //    → `socket.close()`: STOMP disconnect보다 빠르게 TCP 소켓을
    //      강제 종료하여 재사용(zombie 연결) 방지.
    // ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!groupId) return
        let cancelled = false

        const socket = new SockJS(`${API_BASE_URL}/ws-chat`)
        const client = Stomp.over(socket)
        client.debug = () => {}

        client.connect(
            {},
            () => {
                // cleanup이 이미 실행됐으면 이 연결은 필요 없으므로 즉시 종료
                if (cancelled) {
                    try { client.disconnect(() => {}) } catch {}
                    try { socket.close() } catch {}
                    return
                }

                setConnected(true)
                subRef.current = client.subscribe(
                    `/topic/public/${groupId}`,
                    frame => {
                        if (cancelled) return  // 구독 콜백도 cancelled 체크
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
                if (!cancelled) setConnected(false)
            }
        )

        stompRef.current = client

        return () => {
            cancelled = true  // 이후 모든 callback이 무시됨
            try { subRef.current?.unsubscribe() } catch {}
            subRef.current = null
            try { if (client.connected) client.disconnect(() => {}) } catch {}
            try { socket.close() } catch {}  // TCP 강제 종료
            setConnected(false)
        }
    }, [groupId])

    // 4. 메시지 전송
    const sendMessage = useCallback(async (text: string) => {
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
                    nickname:      (myCat as any)?.nickname ?? currentUser.email?.split('@')[0] ?? '',
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
    }, [groupId, myCat])

    return { messages, participants, connected, sending, myCat, sendMessage }
}