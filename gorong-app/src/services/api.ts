// src/services/api.ts
import axios from 'axios'
import { auth } from '../config/firebaseConfig'
import { AppGroup, EventParticipation, PublicEvent, Venue } from '../types'

const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://98.84.85.31/api/v1'
const rootUrl = baseUrl.replace(/\/api\/v1$/, '')

const api = axios.create({
  baseURL: baseUrl,
  timeout: 10000,  // 10초 타임아웃 추가
})

const publicApi = axios.create({
  baseURL: rootUrl,
  timeout: 10000,
})

let unauthorizedHandler: (() => Promise<void> | void) | null = null
let lastUnauthorizedHandledAt = 0

export const setUnauthorizedHandler = (handler: (() => Promise<void> | void) | null) => {
  unauthorizedHandler = handler
}

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout:${ms}`)), ms)
    promise
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })

// 매 요청마다 최신 토큰 자동 갱신
api.interceptors.request.use(async (config) => {
  const currentUser = auth.currentUser
  if (currentUser) {
    try {
      // 네트워크/SDK 지연으로 getIdToken이 멈추는 경우 무한로딩 방지
      const token = await withTimeout(currentUser.getIdToken(), 3000)
      config.headers.Authorization = `Bearer ${token}`
    } catch (e) {
      // 토큰 갱신 실패해도 요청은 계속 보냄 (백엔드에서 401 처리)
      console.error('Firebase 토큰 갱신 실패:', e)
    }
  }
  return config
})

publicApi.interceptors.request.use(async (config) => {
  const currentUser = auth.currentUser
  if (currentUser) {
    try {
      const token = await withTimeout(currentUser.getIdToken(), 3000)
      config.headers.Authorization = `Bearer ${token}`
    } catch (e) {
      console.error('Firebase 토큰 갱신 실패:', e)
    }
  }
  return config
})

const handleUnauthorized = async () => {
  const now = Date.now()
  if (now - lastUnauthorizedHandledAt < 2000) return
  lastUnauthorizedHandledAt = now
  if (unauthorizedHandler) {
    await unauthorizedHandler()
  }
}

const handleResponseError = async (error: any) => {
  const status = error?.response?.status
  if (status === 401) {
    await handleUnauthorized()
  }
  return Promise.reject(error)
}

api.interceptors.response.use((response) => response, handleResponseError)
publicApi.interceptors.response.use((response) => response, handleResponseError)

// 주변 행사 조회 (TourAPI는 백엔드가 처리)
export const fetchNearbyVenues = (lat: number, lng: number, radius = 5000) =>
  api.get<Venue[]>('/app/venues/nearby', { params: { lat, lng, radius } })

// DB에 동기화된 행사 목록 조회
export const fetchPublicEvents = () =>
  publicApi.get<PublicEvent[]>('/api/public/map')

// 도착 인증 (위경도 포함 → 백엔드 PostGIS 검증)
export const verifyArrival = (venueId: string, lat: number, lng: number) =>
  api.post<string>('/app/arrivals', { venueId, lat, lng })

// 앱 그룹 목록 조회 (웹에서 생성된 그룹 포함)
export const fetchAppGroups = () =>
  api.get<AppGroup[]>('/app/groups')

export const fetchMyParticipations = () =>
  api.get<EventParticipation[]>('/event-participation/me')

// 앱 그룹 참가
export const joinAppGroup = (groupId: number) =>
  api.post<AppGroup>(`/app/groups/${groupId}/join`)

// 앱 그룹 모였다 인증
export const gatherAppGroup = (groupId: number) =>
  api.post<AppGroup>(`/app/groups/${groupId}/gather`)

export type UploadSourceType = 'APP_PHOTO' | 'TRAIL_ART' | 'POST_PHOTO'

export const checkArrivalStatus = (venueId: string) =>
  api.get<{ verified: boolean }>(`/app/arrivals/${venueId}/me`)

// 앱 사진/러닝아트 업로드 공용 API
export const uploadFileToS3 = async (
  uri: string,
  fileName: string,
  sourceType: UploadSourceType = 'APP_PHOTO',
  autoSaveToGallery = true,
  referenceId?: string,
) => {
  const formData = new FormData()
  formData.append('file', {
    uri,
    name: fileName,
    type: 'image/jpeg',
  } as any)

  return api.post('/files/upload', formData, {
    params: { sourceType, autoSaveToGallery, referenceId },
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

// GPS 동선 저장
export const saveTrail = (
  venueId: string,
  trail: { lat: number; lng: number; timestamp: number }[]
) => api.post('/app/trails', { venueId, trail })

export default api
