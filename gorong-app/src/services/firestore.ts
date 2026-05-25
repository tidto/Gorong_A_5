import {
  collection, addDoc, query, orderBy,
  limitToLast, onSnapshot, doc, setDoc, deleteDoc, getDoc, updateDoc
} from 'firebase/firestore'
import { db } from '../config/firebaseConfig'
import { ChatMessage } from '../types'

// ─── 익명 채팅 (지오펜스 기반)
export const sendAnonymousMessage = (
  venueId: string,
  msg: Omit<ChatMessage, 'id'>
) =>
  addDoc(collection(db, 'anonymous_chats', venueId, 'messages'), msg)

export const subscribeAnonymousChat = (
  venueId: string,
  callback: (msgs: ChatMessage[]) => void
) => {
  const q = query(
    collection(db, 'anonymous_chats', venueId, 'messages'),
    orderBy('createdAt', 'asc'),
    limitToLast(50)
  )
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)))
  })
}

// ─── 모임 채팅
export const sendGroupMessage = (
  groupId: string,
  msg: Omit<ChatMessage, 'id'>
) =>
  addDoc(collection(db, 'group_chats', groupId, 'messages'), msg)

export const subscribeGroupChat = (
  groupId: string,
  callback: (msgs: ChatMessage[]) => void
) => {
  const q = query(
    collection(db, 'group_chats', groupId, 'messages'),
    orderBy('createdAt', 'asc'),
    limitToLast(50)
  )
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)))
  })
}

// ─── 위치 공유 (버튼 누를 때만 5초간)
export const shareLocation = async (
  groupId: string,
  userId: string,
  lat: number,
  lng: number
) => {
  const ref = doc(db, 'group_locations', groupId, 'members', userId)
  await setDoc(ref, { lat, lng, sharedAt: Date.now(), expires: Date.now() + 5000 })
  setTimeout(() => deleteDoc(ref), 5000)
}

export const subscribeGroupLocations = (
  groupId: string,
  callback: (locs: Record<string, { lat: number; lng: number }>) => void
) =>
  onSnapshot(collection(db, 'group_locations', groupId, 'members'), snap => {
    const now = Date.now()
    const locs: Record<string, { lat: number; lng: number }> = {}
    snap.docs.forEach(d => {
      const data = d.data()
      if (data.expires > now) locs[d.id] = { lat: data.lat, lng: data.lng }
    })
    callback(locs)
  })

type GroupRoom = {
  venueId: string
  hostId: string
  members: string[]
  maxMembers: number
  isGathered: boolean
  createdAt: number
}

export const createGroupRoom = async (venueId: string, hostId: string, maxMembers = 4) => {
  const roomRef = await addDoc(collection(db, 'group_rooms'), {
    venueId,
    hostId,
    members: [hostId],
    maxMembers,
    isGathered: false,
    createdAt: Date.now(),
  } as GroupRoom)
  return roomRef.id
}

export const joinGroupRoom = async (groupId: string, userId: string) => {
  const roomRef = doc(db, 'group_rooms', groupId)
  const snap = await getDoc(roomRef)
  if (!snap.exists()) throw new Error('모임이 존재하지 않습니다.')

  const room = snap.data() as GroupRoom
  if (room.members.includes(userId)) return
  if (room.members.length >= room.maxMembers) {
    throw new Error('정원이 가득 찼습니다.')
  }
  await updateDoc(roomRef, { members: [...room.members, userId] })
}

export const markGroupGathered = async (groupId: string) => {
  const roomRef = doc(db, 'group_rooms', groupId)
  await updateDoc(roomRef, { isGathered: true })
}

export const subscribeGroupRoom = (
  groupId: string,
  callback: (room: GroupRoom | null) => void
) =>
  onSnapshot(doc(db, 'group_rooms', groupId), (snap) => {
    callback(snap.exists() ? (snap.data() as GroupRoom) : null)
  })
