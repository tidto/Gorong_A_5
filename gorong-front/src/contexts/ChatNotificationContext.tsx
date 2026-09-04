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
    /**
     * ✅ [추가] 새 그룹 생성 또는 참여 신청 완료 후 호출
     * — STOMP 연결이 살아있으면 즉시 구독, 끊겨있으면 재연결 후 구독
     */
    addGroupSubscription: (groupId: number, groupTitle: string) => void
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
    const subsRef  = useRef<Map<string, Subscription>>(new Map())
    const idRef    = useRef(0)
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // 현재 열려있는 채팅 그룹 ID (중복 알림 방지용)
    // source별로 구분:
    //  - 'group'  : /chat/:id 에 있으면 해당 그룹의 모임채팅 알림을 억제
    //  - 'public' : /groups/:id 에 있어도 공개채팅 알림은 억제하지 않음
    //               (공개채팅은 그룹 상세 페이지에 임베드된 채팅이므로,
    //                다른 사람의 입장·채팅 알림은 계속 받아야 함)
    const getActiveChatGroupId = (source: 'group' | 'public'): number | null => {
        const chatMatch = window.location.pathname.match(/^\/chat\/(\d+)/)
        if (source === 'group' && chatMatch) return Number(chatMatch[1])
        // public 채널은 /groups/:id 에 있어도 알림 허용 → null 반환
        return null
    }

    // ── 알림 push ──────────────────────────────────────────────
    const pushNotification = useCallback((notif: Omit<ChatNotification, 'id' | 'receivedAt'>) => {
        if (getActiveChatGroupId(notif.source) === notif.groupId) return

        const newNotif: ChatNotification = {
            ...notif,
            id: ++idRef.current,
            receivedAt: Date.now(),
        }

        setNotifications(prev => [newNotif, ...prev].slice(0, 50))

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
            const senderEmail = msg.senderEmail ?? msg.sender ?? ''
            if (senderEmail && senderEmail === myEmail) return

            const senderName = msg.user || msg.nickname || msg.senderEmail || msg.sender || '알 수 없음'

            // 공개 채팅방 입장 알림은 "OOO님이 공개 채팅방에 입장하였습니다."로 표시
            const isJoin = source === 'public' && (msg.type === 'JOIN' || msg.messageType === 'JOIN')
            const notifText = isJoin
                ? `${senderName}님이 공개 채팅방에 입장하였습니다.`
                : msg.text || msg.content || ''

            pushNotification({
                groupId,
                groupTitle,
                sender: senderName,
                text:   notifText,
                source,
            })
        } catch { /* 파싱 실패 무시 */ }
    }, [pushNotification])

    // ── 구독 등록/해제 ─────────────────────────────────────────
    const subscribeGroup = useCallback((groupId: number, groupTitle: string) => {
        if (!stompRef.current?.connected) return

        // /topic/group/{id}  — 모임 채팅
        const groupKey = `group-${groupId}`
        if (!subsRef.current.has(groupKey)) {
            const sub = stompRef.current.subscribe(
                `/topic/group/${groupId}`,
                (frame) => handleIncoming(frame, groupId, groupTitle, 'group')
            )
            subsRef.current.set(groupKey, sub)
        }

        // /topic/public/{id} — 공개 채팅
        const publicKey = `public-${groupId}`
        if (!subsRef.current.has(publicKey)) {
            const sub = stompRef.current.subscribe(
                `/topic/public/${groupId}`,
                (frame) => handleIncoming(frame, groupId, groupTitle, 'public')
            )
            subsRef.current.set(publicKey, sub)
        }
    }, [handleIncoming])

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
        client.debug = () => {}

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

    // ── ✅ [추가] 새 그룹 생성·참여 후 외부에서 호출하는 함수 ──────
    // 연결이 살아있으면 즉시 구독, 끊겨있으면 재연결 후 구독합니다.
    const addGroupSubscription = useCallback(async (groupId: number, groupTitle: string) => {
        if (stompRef.current?.connected) {
            // 이미 연결된 상태 → 바로 구독 추가
            subscribeGroup(groupId, groupTitle)
        } else {
            // 연결이 끊긴 상태 → 재연결하면서 구독
            await connect([{ id: groupId, title: groupTitle }])
        }
    }, [subscribeGroup, connect])

    // ── 읽음 처리 ──────────────────────────────────────────────
    const markAllRead = useCallback(() => {
        setNotifications([])
    }, [])

    const markGroupRead = useCallback((groupId: number) => {
        setNotifications(prev => prev.filter(n => n.groupId !== groupId))
    }, [])

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
            addGroupSubscription, // ✅ [추가]
        }}>
            {children}
        </ChatNotificationContext.Provider>
    )
}