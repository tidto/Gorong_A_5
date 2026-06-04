// ============================================================
// ChatNotificationContext.tsx
//
// 목적: 채팅 알림을 앱 전역에서 단 하나의 STOMP 연결로 관리
//
// 부하 최소화 전략:
//  - 단일 SockJS/STOMP 연결 (기존 /ws-chat 엔드포인트 재사용)
//  - 참여 중인 그룹 토픽만 구독 (불필요한 구독 없음)
//  - HTTP 폴링 없음 — 그룹 목록은 로그인 시 1회만 fetch
//  - 현재 열린 채팅 페이지의 메시지는 무시 (중복 알림 방지)
//  - 탭 포커스 시 배지만 표시, 오버레이는 메모리 큐로 최대 1개 유지
// ============================================================

import React, {
    createContext, useContext, useState, useRef,
    useCallback, useEffect, type ReactNode,
} from 'react'
import SockJS from 'sockjs-client'
import Stomp, { type Client, type Subscription } from 'stompjs'
import { auth } from '../firebase/firebaseConfig'
import axiosInstance from '../api/axiosInstance'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://98.84.85.31:8080'

// ── 타입 ────────────────────────────────────────────────────

export interface ChatNotification {
    id: number
    groupId: number
    groupTitle: string
    sender: string
    text: string
    receivedAt: number // Date.now()
    /** 'group' = Chat.tsx 모임채팅, 'public' = GroupDetailPage 공개채팅 */
    source: 'group' | 'public'
}

interface ChatNotificationContextType {
    /** 읽지 않은 알림 목록 */
    notifications: ChatNotification[]
    /** 읽지 않은 개수 */
    unreadCount: number
    /** 3초 오버레이로 표시 중인 최신 알림 (null이면 숨김) */
    toastNotification: ChatNotification | null
    /** 모든 알림을 읽음 처리 */
    markAllRead: () => void
    /** 특정 그룹 알림만 읽음 처리 (그룹 단위 일괄 삭제) */
    markGroupRead: (groupId: number) => void
    /** 알림 1개만 읽음 처리 (id 기준 개별 삭제) */
    markRead: (id: number) => void
}

const ChatNotificationContext = createContext<ChatNotificationContextType | undefined>(undefined)

export function useChatNotification() {
    const ctx = useContext(ChatNotificationContext)
    if (!ctx) throw new Error('useChatNotification must be used within ChatNotificationProvider')
    return ctx
}

// ── Provider ────────────────────────────────────────────────

export function ChatNotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<ChatNotification[]>([])
    const [toastNotification, setToastNotification] = useState<ChatNotification | null>(null)

    const stompRef = useRef<Client | null>(null)
    const subsRef  = useRef<Map<number, Subscription>>(new Map())
    const idRef    = useRef(0)
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // 현재 열려있는 채팅 그룹 ID (중복 알림 방지용)
    // /chat/:id  → 모임 채팅 (Chat.tsx)
    // /groups/:id → 공개 채팅 (GroupDetailPage)
    const getActiveChatGroupId = (): number | null => {
        const chatMatch   = window.location.pathname.match(/^\/chat\/(\d+)/)
        const groupMatch  = window.location.pathname.match(/^\/groups\/(\d+)/)
        const m = chatMatch ?? groupMatch
        return m ? Number(m[1]) : null
    }

    // ── 알림 push ──────────────────────────────────────────────
    const pushNotification = useCallback((notif: Omit<ChatNotification, 'id' | 'receivedAt'>) => {
        // 현재 그 채팅방을 보고 있으면 무시
        if (getActiveChatGroupId() === notif.groupId) return

        const newNotif: ChatNotification = {
            ...notif,
            id: ++idRef.current,
            receivedAt: Date.now(),
        }

        setNotifications(prev => [newNotif, ...prev].slice(0, 50)) // 최대 50개 유지

        // 3초 오버레이 — 이전 타이머 취소 후 새 알림 표시
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        setToastNotification(newNotif)
        toastTimerRef.current = setTimeout(() => {
            setToastNotification(null)
        }, 3000)
    }, [])

    // ── 수신 메시지 공통 처리 ──────────────────────────────────
    const handleIncoming = useCallback((frame: { body: string }, groupId: number, groupTitle: string, source: 'group' | 'public') => {
        try {
            const msg = JSON.parse(frame.body)
            const myEmail = auth.currentUser?.email ?? ''
            // 내가 보낸 메시지는 알림 제외
            const senderEmail = msg.senderEmail ?? msg.sender ?? ''
            if (senderEmail && senderEmail === myEmail) return

            pushNotification({
                groupId,
                groupTitle,
                sender: msg.user || msg.nickname || msg.senderEmail || msg.sender || '알 수 없음',
                text:   msg.text || msg.content || '',
                source,
            })
        } catch { /* 파싱 실패 무시 */ }
    }, [pushNotification])

    // ── 구독 등록/해제 ─────────────────────────────────────────
    const subscribeGroup = useCallback((groupId: number, groupTitle: string) => {
        if (!stompRef.current) return

        // /topic/group/{id}  — Chat.tsx 모임 채팅
        if (!subsRef.current.has(`group-${groupId}`)) {
            const sub = stompRef.current.subscribe(
                `/topic/group/${groupId}`,
                (frame) => handleIncoming(frame, groupId, groupTitle, 'group')
            )
            subsRef.current.set(`group-${groupId}`, sub)
        }

        // /topic/public/{id} — GroupDetailPage 공개 채팅
        if (!subsRef.current.has(`public-${groupId}`)) {
            const sub = stompRef.current.subscribe(
                `/topic/public/${groupId}`,
                (frame) => handleIncoming(frame, groupId, groupTitle, 'public')
            )
            subsRef.current.set(`public-${groupId}`, sub)
        }
    }, [handleIncoming]) // handleIncoming는 위에 정의

    const unsubscribeAll = useCallback(() => {
        subsRef.current.forEach(sub => {
            try { sub.unsubscribe() } catch { /* 무시 */ }
        })
        subsRef.current.clear()
    }, [])

    // ── STOMP 연결 ─────────────────────────────────────────────
    const connect = useCallback(async (joinedGroups: { id: number; title: string }[]) => {
        // 이미 연결 중이면 구독만 추가
        if (stompRef.current?.connected) {
            joinedGroups.forEach(g => subscribeGroup(g.id, g.title))
            return
        }

        const token = await auth.currentUser?.getIdToken().catch(() => null)
        if (!token) return

        const socket = new SockJS(`${API_BASE_URL}/ws-chat`)
        const client: Client = Stomp.over(socket)
        client.debug = () => {} // 디버그 로그 비활성화

        client.connect(
            { Authorization: `Bearer ${token}` },
            () => {
                stompRef.current = client
                joinedGroups.forEach(g => subscribeGroup(g.id, g.title))
            },
            () => {
                stompRef.current = null
            }
        )
    }, [subscribeGroup])

    const disconnect = useCallback(() => {
        unsubscribeAll()
        if (stompRef.current) {
            try { stompRef.current.disconnect(() => {}) } catch { /* 무시 */ }
            stompRef.current = null
        }
    }, [unsubscribeAll])

    // ── 로그인 상태 감지 → 참여 그룹 fetch → 연결 ───────────────
    useEffect(() => {
        let cancelled = false

        const unsubAuth = auth.onAuthStateChanged(async (firebaseUser) => {
            if (!firebaseUser) {
                disconnect()
                return
            }

            try {
                const [idsRes, groupsRes] = await Promise.all([
                    axiosInstance.get<number[]>('/groups/joined-ids'),
                    axiosInstance.get<{ id: number; title: string }[]>('/groups'),
                ])
                if (cancelled) return

                const joinedIds = new Set(idsRes.data)
                const joinedGroups = groupsRes.data
                    .filter(g => joinedIds.has(g.id))
                    .map(g => ({ id: g.id, title: g.title }))

                if (joinedGroups.length > 0) {
                    await connect(joinedGroups)
                }
            } catch { /* 네트워크 오류 무시 */ }
        })

        return () => {
            cancelled = true
            unsubAuth()
            disconnect()
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        }
    }, [connect, disconnect])

    // ── 읽음 처리 ──────────────────────────────────────────────
    const markAllRead = useCallback(() => {
        setNotifications([])
    }, [])

    const markGroupRead = useCallback((groupId: number) => {
        setNotifications(prev => prev.filter(n => n.groupId !== groupId))
    }, [])

    /** 알림 1개만 삭제 (id 기준) */
    const markRead = useCallback((id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }, [])

    const unreadCount = notifications.length

    return (
        <ChatNotificationContext.Provider value={{
            notifications,
            unreadCount,
            toastNotification,
            markAllRead,
            markGroupRead,
            markRead,
        }}>
            {children}
        </ChatNotificationContext.Provider>
    )
}
