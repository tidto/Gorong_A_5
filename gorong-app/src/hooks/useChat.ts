import { useState, useEffect } from 'react'
import { auth } from '../config/firebaseConfig'
import { sendAnonymousMessage, subscribeAnonymousChat } from '../services/firestore'
import { ChatMessage } from '../types'

const ANONYMOUS_NICKNAME_PARTS = [
  '포근한', '살금살금', '말랑한', '용감한', '졸린', '호기심 많은', '수줍은', '신나는',
  '복슬복슬', '야옹하는', '느긋한', '재빠른', '반짝이는', '장난꾸러기', '조용한', '씩씩한',
]

/** 같은 사용자는 같은 행사 채팅에서 같은 별칭을 쓰고, 행사마다 다른 익명 별칭을 쓴다. */
export function getAnonymousNickname(userId: string, venueId: string) {
  const seed = `${venueId}:${userId}`
  let hash = 2166136261
  for (let i = 0; i < seed.length; i++) {
    hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619)
  }
  const value = hash >>> 0
  const adjective = ANONYMOUS_NICKNAME_PARTS[value % ANONYMOUS_NICKNAME_PARTS.length]
  const number = String((value >>> 4) % 10000).padStart(4, '0')
  return `${adjective} 고양이 ${number}`
}

/** 이 시간 안에 서버와 동기화되지 않으면 '연결 불안정'으로 안내한다. */
const SYNC_STALL_MS = 8000

export function useChat(venueId: string | null = null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  useEffect(() => {
    // venueId가 있으면 (지오펜스 진입 시) 채팅 연결
    if (!venueId) {
      setIsConnected(false)
      setMessages([])
      setSyncError(null)
      return
    }

    if (__DEV__) console.log('[anon-chat] 구독 시작 venueId =', venueId)

    // 행사장 ID가 있다고 해서 Firestore까지 연결된 것은 아니다.
    // 서버에서 온 첫 스냅샷을 받을 때까지 전송을 막아 연결 실패를 구분한다.
    setIsConnected(false)
    setSyncError(null)

    let synced = false
    const stallTimer = setTimeout(() => {
      if (!synced) {
        setIsConnected(false)
        setSyncError('채팅 서버와 연결이 불안정해요. 네트워크를 확인해 주세요.')
      }
    }, SYNC_STALL_MS)

    const unsubscribe = subscribeAnonymousChat(venueId, setMessages, ({ fromCache, error }) => {
      if (error) {
        setIsConnected(false)
        setSyncError(
          error.code === 'permission-denied'
            ? '채팅방에 접근할 권한이 없어요.'
            : '채팅 서버와 연결이 불안정해요. 네트워크를 확인해 주세요.'
        )
        return
      }
      if (!fromCache) {
        synced = true
        clearTimeout(stallTimer)
        setIsConnected(true)
        setSyncError(null)
      }
    })

    return () => {
      clearTimeout(stallTimer)
      unsubscribe()
      setIsConnected(false)
    }
  }, [venueId])

  const sendMessage = async (text: string) => {
    const currentUser = auth.currentUser
    if (!currentUser || !venueId || !text.trim()) return

    const msg: Omit<ChatMessage, 'id'> = {
      text: text.trim(),
      userId: currentUser.uid,
      nickname: getAnonymousNickname(currentUser.uid, venueId),
      createdAt: Date.now(),
      isAnonymous: true,
    }
    await sendAnonymousMessage(venueId, msg)
  }

  const nickname = venueId && auth.currentUser
    ? getAnonymousNickname(auth.currentUser.uid, venueId)
    : '익명'

  return { messages, sendMessage, isConnected, syncError, nickname }
}
