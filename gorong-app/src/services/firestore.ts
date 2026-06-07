import {
  collection, addDoc, query, orderBy,
  limitToLast, onSnapshot, doc, setDoc, deleteDoc, getDoc, updateDoc
} from 'firebase/firestore'
import { db } from '../config/firebaseConfig'
import { AppGroup, ChatMessage } from '../types'

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
  groupId: string
  title: string
  event: string
  location: string
  meetingDate: string
  meetingTime: string
  members: string[]
  maxMembers: number
  isGathered: boolean
  createdAt: number
  closedAt?: number
  source: 'WEB_GROUP' | 'APP_GROUP'
}

function parseLocalDate(value?: string | null) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d{8}$/.test(trimmed)) {
    const y = Number(trimmed.slice(0, 4))
    const m = Number(trimmed.slice(4, 6)) - 1
    const d = Number(trimmed.slice(6, 8))
    return new Date(y, m, d)
  }
  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function resolveClosedAt(meetingDate?: string | null) {
  const base = parseLocalDate(meetingDate)
  const target = base ?? new Date()
  target.setHours(23, 59, 59, 999)
  target.setDate(target.getDate() + 3)
  return target.getTime()
}

export const ensureGroupRoom = async (group: AppGroup, userId: string) => {
  const roomRef = doc(db, 'group_rooms', String(group.id))
  const snap = await getDoc(roomRef)
  const closedAt = resolveClosedAt(group.meetingDate)

  if (!snap.exists()) {
    await setDoc(roomRef, {
      groupId: String(group.id),
      title: group.title,
      event: group.event,
      location: group.location,
      meetingDate: group.meetingDate ?? '',
      meetingTime: group.meetingTime ?? '',
      members: [userId],
      maxMembers: group.maxMembers,
      isGathered: group.gathered,
      createdAt: Date.now(),
      closedAt,
      source: 'WEB_GROUP',
    } as GroupRoom)
    return String(group.id)
  }

  const room = snap.data() as GroupRoom
  if (!room.closedAt) {
    await updateDoc(roomRef, { closedAt })
  }
  await joinGroupRoom(String(group.id), userId)
  return String(group.id)
}

export const joinGroupRoom = async (groupId: string, userId: string) => {
  const roomRef = doc(db, 'group_rooms', groupId)
  const snap = await getDoc(roomRef)
  if (!snap.exists()) throw new Error('모임이 존재하지 않습니다.')

  const room = snap.data() as GroupRoom
  if (room.members.includes(userId)) return
  if (room.closedAt && Date.now() > room.closedAt) {
    throw new Error('채팅방이 종료되었습니다.')
  }
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
