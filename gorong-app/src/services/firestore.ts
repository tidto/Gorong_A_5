import firestore from '@react-native-firebase/firestore'
import { ChatMessage } from '../types'

// ─── 익명 채팅 (지오펜스 기반)
export const sendAnonymousMessage = (venueId: string, msg: Omit<ChatMessage, 'id'>) =>
  firestore().collection('anonymous_chats').doc(venueId).collection('messages').add(msg)

export const subscribeAnonymousChat = (
  venueId: string,
  callback: (msgs: ChatMessage[]) => void
) =>
  firestore()
    .collection('anonymous_chats')
    .doc(venueId)
    .collection('messages')
    .orderBy('createdAt', 'asc')
    .limitToLast(50)
    .onSnapshot(snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage))
      callback(msgs)
    })

// ─── 모임 채팅 (그룹 멤버 전용)
export const sendGroupMessage = (groupId: string, msg: Omit<ChatMessage, 'id'>) =>
  firestore().collection('group_chats').doc(groupId).collection('messages').add(msg)

export const subscribeGroupChat = (
  groupId: string,
  callback: (msgs: ChatMessage[]) => void
) =>
  firestore()
    .collection('group_chats')
    .doc(groupId)
    .collection('messages')
    .orderBy('createdAt', 'asc')
    .limitToLast(50)
    .onSnapshot(snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage))
      callback(msgs)
    })

// ─── 위치 공유 (버튼 누를 때만 5초간)
export const shareLocation = async (
  groupId: string,
  userId: string,
  lat: number,
  lng: number
) => {
  const ref = firestore().collection('group_locations').doc(groupId)
    .collection('members').doc(userId)

  await ref.set({ lat, lng, sharedAt: Date.now(), expires: Date.now() + 5000 })

  // 5초 후 자동 삭제
  setTimeout(() => ref.delete(), 5000)
}

export const subscribeGroupLocations = (
  groupId: string,
  callback: (locs: Record<string, { lat: number; lng: number }>) => void
) =>
  firestore()
    .collection('group_locations')
    .doc(groupId)
    .collection('members')
    .onSnapshot(snap => {
      const now = Date.now()
      const locs: Record<string, { lat: number; lng: number }> = {}
      snap.docs.forEach(d => {
        const data = d.data()
        if (data.expires > now) locs[d.id] = { lat: data.lat, lng: data.lng }
      })
      callback(locs)
    })