// 백엔드 REST 호출
import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_BASE_URL = 'http://98.84.85.31/api/v1'

const api = axios.create({ baseURL: API_BASE_URL })

// 토큰 자동 주입
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 도착 인증
export const verifyArrival = (venueId: string) =>
  api.post('/arrivals', { venueId })

// 모임 채팅방 생성
export const createGroupChat = (venueId: string, maxMembers = 4) =>
  api.post('/groups', { venueId, maxMembers })

// 모임 참가
export const joinGroup = (groupId: string) =>
  api.post(`/groups/${groupId}/join`)

// 모임 모였다 인증
export const confirmGathered = (groupId: string) =>
  api.post(`/groups/${groupId}/gather`)

// GPS 동선 저장
export const saveTrail = (venueId: string, trail: { lat: number; lng: number; timestamp: number }[]) =>
  api.post('/trails', { venueId, trail })

export default api