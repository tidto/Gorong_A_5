// 경로: src/hooks/usePublicGroupWebSocketChat.ts
//
// 변경사항:
//  - 메시지 2번 뜨는 버그 수정
//  - ChatParticipant에 userId?: number 추가 (캣타워 링크용)
//  - myCat에 userId 포함 (me/page API 응답에서 cat.userId 파싱)
//  - 메시지/JOIN에서 senderId(숫자) 있으면 파싱
//  - [최적화] 미니홈 fetch + 채팅이력 fetch + WebSocket 연결을 Promise.all로 병렬 시작
//  - [최적화] WebSocket 연결은 토큰 없이 즉시 시작 (public 채널은 인증 불필요)
//  - [최적화] 채팅이력을 WebSocket 연결 대기 없이 즉시 표시

import { useState, useRef, useCallback, useEffect } from 'react'
import SockJS from 'sockjs-client'
import Stomp, { Client, Subscription } from 'stompjs'
import { auth } from '../firebase/firebaseConfig'
import axiosInstance from '../api/axiosInstance'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://98.84.85.31:8080'

export interface PublicChatMsg {
    user: string
    senderEmail?: string
    senderId?: number       // 유저 숫자 ID (캣타워 링크용)
    nickname?: string
    catName?: string
    characterType?: string
    catColor?: string
    text: string
    sentAt?: string
    masked?: boolean
    maskedLabel?: string
    type?: 'CHAT' | 'JOIN' | 'LEAVE'
}

export interface ChatParticipant {
    email: string
    nickname: string
    catName: string
    characterType: string
    catColor: string
    userId?: number         // 캣타워 이동에 사용
}

interface MyCatCache {
    catName: string
    characterType: string
    catColor: string
    nickname: string
    userId?: number         // 내 캣타워 링크용
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
            userId:        m.senderId,
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
    // WebSocket 연결 완료 전에 들어온 메시지를 버퍼링 (이력 로드 전 실시간 메시지 유실 방지)
    const pendingMsgsRef = useRef<PublicChatMsg[]>([])
    const historyLoadedRef = useRef(false)

    // ── 미니홈 fetch + 채팅 이력 fetch + WebSocket 연결을 동시에 시작 ──
    useEffect(() => {
        if (!groupId) return
        let cancelled = false

        // WebSocket 소켓을 즉시 생성 (연결 대기 시간을 fetch와 겹치도록)
        const socket = new SockJS(`${API_BASE_URL}/ws-chat`)
        const client = Stomp.over(socket)
        client.debug = () => {}
        stompRef.current = client

        // WebSocket 연결 시작 (인증 불필요한 public 채널)
        client.connect(
            {},
            () => {
                if (cancelled) {
                    try { client.disconnect(() => {}) } catch {}
                    try { socket.close() } catch {}
                    return
                }

                setConnected(true)
                subRef.current = client.subscribe(
                    `/topic/public/${groupId}`,
                    frame => {
                        if (cancelled) return
                        try {
                            const msg: PublicChatMsg = JSON.parse(frame.body)

                            if (msg.type === 'JOIN' && msg.senderEmail) {
                                setParticipants(prev => {
                                    const already = prev.some(p => p.email === msg.senderEmail)
                                    if (already) return prev
                                    const newcomer: ChatParticipant = {
                                        email:         msg.senderEmail!,
                                        nickname:      msg.user || msg.senderEmail!.split('@')[0],
                                        catName:       msg.catName       || msg.user || '고냥이',
                                        characterType: msg.characterType || 'BASIC',
                                        catColor:      msg.catColor      || 'CREAM',
                                        userId:        msg.senderId,
                                    }
                                    const next = [...prev, newcomer]
                                    return next.length > 6 ? next.slice(next.length - 6) : next
                                })
                                // JOIN 알림을 메시지 목록에도 추가
                                if (historyLoadedRef.current) {
                                    setMessages(prev => [...prev, msg])
                                } else {
                                    pendingMsgsRef.current.push(msg)
                                }
                                return
                            }

                            // 이력 로드 전이면 버퍼에 쌓아두고, 로드 완료 후 합산
                            if (!historyLoadedRef.current) {
                                pendingMsgsRef.current.push(msg)
                                return
                            }

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

        // ── 채팅 이력: 도착하는 즉시 화면에 표시 (미니홈 fetch 완료를 기다리지 않음) ──
        axiosInstance.get<PublicChatMsg[]>(`/public-chat/${groupId}/history`)
            .catch(() => ({ data: [] as PublicChatMsg[] }))
            .then(historyRes => {
                if (cancelled) return
                const history = historyRes.data ?? []
                const merged = [...history, ...pendingMsgsRef.current]
                pendingMsgsRef.current = []
                historyLoadedRef.current = true
                setMessages(merged)
                setParticipants(deriveParticipants(merged))
            })

        // ── 미니홈(캐릭터/닉네임): 독립적으로 fetch, 완료되면 그때 반영 ──
        if (auth.currentUser) {
            axiosInstance.get('/minihomes/me/page')
                .then(res => {
                    if (cancelled) return
                    const data = res.data
                    const cat  = data?.miniHome?.cat ?? data?.cat ?? null
                    if (!cat) return
                    const catColor = (cat.appearanceState?.color as string | undefined) ?? 'CREAM'
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
                        userId:        cat.userId ?? data?.miniHome?.userId ?? undefined,
                    })
                })
                .catch(() => {})
        }

        return () => {
            cancelled = true
            try { subRef.current?.unsubscribe() } catch {}
            subRef.current = null
            try { if (client.connected) client.disconnect(() => {}) } catch {}
            try { socket.close() } catch {}
            setConnected(false)
            pendingMsgsRef.current = []
            historyLoadedRef.current = false
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
                    senderId:      myCat?.userId,
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

    // 5. 입장 알림
    const sendJoin = useCallback(() => {
        const currentUser = auth.currentUser
        if (!currentUser || !stompRef.current?.connected) return
        stompRef.current.send(
            `/app/public.send/${groupId}`,
            {},
            JSON.stringify({
                senderEmail: currentUser.email,
                senderId:    myCat?.userId,
                text:        '',
                type:        'JOIN',
            })
        )
    }, [groupId, myCat])

    // 6. 퇴장
    const sendLeave = useCallback(() => {
        const currentUser = auth.currentUser
        if (!currentUser) return
        setParticipants(prev => prev.filter(p => p.email !== currentUser.email))
    }, [])

    return { messages, participants, connected, sending, myCat, sendMessage, sendJoin, sendLeave }
}
