import { useCallback, useEffect, useRef, useState } from 'react'
import { auth } from '../config/firebaseConfig'
import { fetchGroupChatHistory, GroupChatHistoryMessage } from '../services/api'

export interface GroupChatMessage {
    id: string
    user: string
    senderEmail?: string
    senderUserId?: number | null
    text: string
    sentAt?: string
    isMe: boolean
}

type ChatFrame = {
    senderEmail?: string
    senderUserId?: number | null
    user?: string
    text?: string
    sentAt?: string | number[] | number | null
}

const formatTime = (value: GroupChatHistoryMessage['sentAt']): string | undefined => {
    if (value == null) return undefined
    if (Array.isArray(value)) {
        return `${String(value[3] ?? 0).padStart(2, '0')}:${String(value[4] ?? 0).padStart(2, '0')}`
    }
    const text = String(value)
    if (/^\d{1,2}:\d{2}/.test(text)) return text.slice(0, 5).padStart(5, '0')
    const match = text.match(/\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2})/)
    return match ? `${match[1]}:${match[2]}` : undefined
}

const toMessage = (raw: ChatFrame, index: number): GroupChatMessage => {
    const email = auth.currentUser?.email ?? ''
    const senderEmail = raw.senderEmail
    return {
        id: `${senderEmail ?? raw.user ?? 'message'}-${raw.sentAt ?? index}-${index}`,
        user: raw.user || senderEmail || '익명',
        senderEmail,
        senderUserId: raw.senderUserId ?? null,
        text: raw.text ?? '',
        sentAt: formatTime(raw.sentAt),
        isMe: Boolean(email && senderEmail === email),
    }
}

const stompFrame = (command: string, headers: Record<string, string>, body = '') =>
    `${command}\n${Object.entries(headers).map(([key, value]) => `${key}:${value}`).join('\n')}\n\n${body}\u0000`

/** Spring SockJS/STOMP 모임 채팅에 연결하고 DB 이력과 실시간 메시지를 동기화합니다. */
export function useGroupChat(groupId: number | null, enabled: boolean) {
    const [messages, setMessages] = useState<GroupChatMessage[]>([])
    const [isConnected, setIsConnected] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [retryKey, setRetryKey] = useState(0)
    const socketRef = useRef<WebSocket | null>(null)
    const activeGroupRef = useRef<number | null>(null)

    useEffect(() => {
        if (!enabled || groupId == null) {
            setMessages([])
            setIsConnected(false)
            setIsLoading(false)
            setError(null)
            activeGroupRef.current = null
            return
        }

        let disposed = false
        let connected = false
        const group = groupId
        activeGroupRef.current = group
        setMessages([])
        setIsConnected(false)
        setIsLoading(true)
        setError(null)

        const closeSocket = () => {
            const socket = socketRef.current
            socketRef.current = null
            if (socket && socket.readyState < WebSocket.CLOSING) socket.close()
        }

        const connect = async () => {
            try {
                const currentUser = auth.currentUser
                if (!currentUser?.email) throw new Error('로그인 정보를 확인할 수 없습니다.')

                // 기록을 먼저 불러와 기존 메시지를 보여준 뒤 실시간 구독을 시작합니다.
                const [historyResponse, token] = await Promise.all([
                    fetchGroupChatHistory(group),
                    currentUser.getIdToken(),
                ])
                if (disposed) return
                setMessages(historyResponse.data.map((message, index) => toMessage(message, index)))

                const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://98.84.85.31/api/v1'
                const root = apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')
                const socketHost = root
                    .replace(/^https?:\/\//, '')
                    .replace(/:\d+$/, '')
                const socketProtocol = root.startsWith('https://') ? 'wss' : 'ws'
                const session = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`

                const socket = new WebSocket(
                    `${socketProtocol}://${socketHost}:8080/api/ws-chat/000/${session}/websocket`
                )

                socket.onopen = () => {
                    // Spring SockJS는 STOMP 프레임을 JSON 배열로 감싸서 주고받습니다.
                    socket.send(JSON.stringify([stompFrame('CONNECT', {
                        'accept-version': '1.1,1.0',
                        'heart-beat': '0,0',
                        Authorization: `Bearer ${token}`,
                    })]))
                }

                socket.onmessage = (event) => {
                    if (disposed || typeof event.data !== 'string') return
                    if (event.data === 'o' || event.data === 'h') return

                    let frames: string[]
                    try {
                        frames = event.data.startsWith('a') ? JSON.parse(event.data.slice(1)) : [event.data]
                    } catch {
                        return
                    }

                    for (const frame of frames) {
                        const separator = frame.indexOf('\n\n')
                        if (separator < 0) continue
                        const commandAndHeaders = frame.slice(0, separator).split('\n')
                        const command = commandAndHeaders[0]
                        if (command === 'CONNECTED') {
                            connected = true
                            setIsConnected(true)
                            setIsLoading(false)
                            socket.send(JSON.stringify([stompFrame('SUBSCRIBE', {
                                id: `group-${group}`,
                                destination: `/topic/group/${group}`,
                                ack: 'auto',
                            })]))
                        } else if (command === 'MESSAGE') {
                            const body = frame.slice(separator + 2).replace(/\u0000$/, '')
                            try {
                                const message = toMessage(JSON.parse(body) as ChatFrame, Date.now())
                                setMessages((previous) => [...previous, message])
                            } catch {
                                // 형식이 맞지 않는 브로커 프레임은 건너뜁니다.
                            }
                        } else if (command === 'ERROR') {
                            setError('채팅 서버가 연결을 종료했습니다.')
                        }
                    }
                }

                socket.onerror = () => {
                    if (!disposed) {
                        setError('채팅 서버에 연결할 수 없습니다.')
                        setIsLoading(false)
                    }
                }
                socket.onclose = () => {
                    if (!disposed) {
                        setIsConnected(false)
                        setIsLoading(false)
                        if (connected) setError('채팅 연결이 끊겼습니다. 화면을 다시 열어 재연결해 주세요.')
                    }
                }
            } catch (cause) {
                if (!disposed) {
                    setError(cause instanceof Error ? cause.message : '채팅방에 연결하지 못했습니다.')
                    setIsLoading(false)
                }
            }
        }

        void connect()
        return () => {
            disposed = true
            closeSocket()
            if (activeGroupRef.current === group) activeGroupRef.current = null
            setIsConnected(false)
        }
    }, [groupId, enabled, retryKey])

    const sendMessage = useCallback((text: string) => {
        const socket = socketRef.current
        const group = activeGroupRef.current
        const senderEmail = auth.currentUser?.email
        if (!text.trim() || group == null || !senderEmail || !socket || socket.readyState !== WebSocket.OPEN || !isConnected) {
            throw new Error('모임 채팅방에 연결되어 있지 않습니다.')
        }
        socket.send(JSON.stringify([stompFrame('SEND', {
            destination: `/app/chat.sendMessage/${group}`,
            'content-type': 'application/json',
        }, JSON.stringify({ roomId: String(group), user: senderEmail, senderEmail, text: text.trim() }))]))
    }, [isConnected])

    return { messages, isConnected, isLoading, error, sendMessage, retry: () => setRetryKey((key) => key + 1) }
}
