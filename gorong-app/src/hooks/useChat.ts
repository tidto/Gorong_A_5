import { useState, useEffect, useRef } from 'react'
import { auth } from '../config/firebaseConfig'
import { sendAnonymousMessage, subscribeAnonymousChat } from '../services/firestore'
import { ChatMessage } from '../types'

export function useChat(venueId: string | null = null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // venueId가 있으면 (지오펜스 진입 시) 채팅 연결
    if (!venueId) {
      setIsConnected(false)
      setMessages([])
      unsubscribeRef.current?.()
      return
    }

    setIsConnected(true)
    unsubscribeRef.current = subscribeAnonymousChat(venueId, setMessages)

    return () => {
      unsubscribeRef.current?.()
      setIsConnected(false)
    }
  }, [venueId])

  const sendMessage = async (text: string) => {
    const currentUser = auth.currentUser
    if (!currentUser || !venueId || !text.trim()) return

    const msg: Omit<ChatMessage, 'id'> = {
      text: text.trim(),
      userId: currentUser.uid,
      nickname: '익명',  // 익명 채팅
      createdAt: Date.now(),
      isAnonymous: true,
    }
    await sendAnonymousMessage(venueId, msg)
  }

  return { messages, sendMessage, isConnected }
}