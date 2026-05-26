// src/services/api.ts
import axios from 'axios'
import { auth } from '../config/firebaseConfig'
import { Venue } from '../types'

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://98.84.85.31/api/v1',
  timeout: 10000,  // 10초 타임아웃 추가
})

// 매 요청마다 최신 토큰 자동 갱신
api.interceptors.request.use(async (config) => {
  const currentUser = auth.currentUser
  if (currentUser) {
    try {
      const token = await currentUser.getIdToken()
      config.headers.Authorization = `Bearer ${token}`
    } catch (e) {
      // 토큰 갱신 실패해도 요청은 계속 보냄 (백엔드에서 401 처리)
      console.error('Firebase 토큰 갱신 실패:', e)
    }
  }
  return config
})

// 주변 행사 조회 (TourAPI는 백엔드가 처리)
export const fetchNearbyVenues = (lat: number, lng: number, radius = 5000) =>
  api.get<Venue[]>('/app/venues/nearby', { params: { lat, lng, radius } })

// 도착 인증 (위경도 포함 → 백엔드 PostGIS 검증)
export const verifyArrival = (venueId: string, lat: number, lng: number) =>
  api.post<string>('/app/arrivals', { venueId, lat, lng })

// 모임 생성
export const createGroupChat = (venueId: string, maxMembers = 4) =>
  api.post('/app/groups', { venueId, maxMembers })

// 모임 참가
export const joinGroup = (groupId: string) =>
  api.post(`/app/groups/${groupId}/join`)

// 모임 모였다 인증
export const confirmGathered = (groupId: string) =>
  api.post(`/app/groups/${groupId}/gather`)

// GPS 동선 저장
export const saveTrail = (
  venueId: string,
  trail: { lat: number; lng: number; timestamp: number }[]
) => api.post('/app/trails', { venueId, trail })

export default api