import { useEffect, useRef } from 'react'
import { auth } from '../config/firebaseConfig'
import { useChatUnreadStore } from '../store/chatUnreadStore'

const stompFrame = (command: string, headers: Record<string, string>) =>
  `${command}\n${Object.entries(headers).map(([key, value]) => `${key}:${value}`).join('\n')}\n\n\u0000`

/** 앱이 켜져 있을 때 참여 중인 모임방 하나를 WebSocket 하나로 구독해 새 메시지를 감지한다. */
export function useGroupChatUnread(groupIds: number[], isChatTabFocused: boolean, reconnectKey: number) {
  const groupIdsKey = groupIds.join(',')
  const markNewMessage = useChatUnreadStore((state) => state.markNewMessage)
  const isChatTabFocusedRef = useRef(isChatTabFocused)
  isChatTabFocusedRef.current = isChatTabFocused

  useEffect(() => {
    if (!groupIdsKey) return

    const currentUser = auth.currentUser
    if (!currentUser?.email) return

    let disposed = false
    let socket: WebSocket | null = null

    const connect = async () => {
      try {
        const token = await currentUser.getIdToken()
        if (disposed) return

        const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://98.84.85.31/api/v1'
        const backendUrl = new URL(apiBase)
        const socketProtocol = backendUrl.protocol === 'https:' ? 'wss' : 'ws'
        const socketPort = backendUrl.port || '8080'
        const session = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
        socket = new WebSocket(
          `${socketProtocol}://${backendUrl.hostname}:${socketPort}/api/ws-chat/000/${session}/websocket`
        )

        socket.onopen = () => {
          socket?.send(JSON.stringify([stompFrame('CONNECT', {
            'accept-version': '1.1,1.0',
            'heart-beat': '0,0',
            Authorization: `Bearer ${token}`,
          })]))
        }

        socket.onmessage = (event) => {
          if (disposed || typeof event.data !== 'string' || event.data === 'o' || event.data === 'h') return
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
            if (commandAndHeaders[0] === 'CONNECTED') {
              groupIdsKey.split(',').forEach((groupId) => {
                socket?.send(JSON.stringify([stompFrame('SUBSCRIBE', {
                  id: `unread-group-${groupId}`,
                  destination: `/topic/group/${groupId}`,
                  ack: 'auto',
                })]))
              })
              continue
            }

            if (commandAndHeaders[0] !== 'MESSAGE') continue
            const body = frame.slice(separator + 2).replace(/\u0000$/, '')
            try {
              const message = JSON.parse(body) as { senderEmail?: string }
              if (message.senderEmail !== currentUser.email && !isChatTabFocusedRef.current) markNewMessage()
            } catch {
              // 메시지 JSON이 아니면 새 메시지 배지를 갱신하지 않는다.
            }
          }
        }
      } catch (error) {
        if (!disposed) console.warn('[chat-unread] 모임 채팅 알림 구독 실패:', error)
      }
    }

    void connect()
    return () => {
      disposed = true
      if (socket && socket.readyState < WebSocket.CLOSING) socket.close()
    }
  }, [groupIdsKey, reconnectKey, markNewMessage])
}
