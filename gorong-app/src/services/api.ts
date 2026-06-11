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

// 공개 행사 상세 조회
export const fetchPublicEventDetail = (id: string | number) =>
  publicApi.get<PublicEvent>(`/api/public/map/${id}`)

// 🚨 [수정됨] 도착 인증: 백엔드 DTO(PostGIS)가 요구할 확률이 높은 필드명으로 매핑합니다.
// 만약 백엔드의 @RequestBody 필드명이 여전히 lat, lng라면 기존처럼 { venueId, lat, lng }로 사용하셔도 됩니다.
export const verifyArrival = (venueId: string, lat: number, lng: number) =>
  api.post<string>('/app/arrivals', { 
    venueId, 
    latitude: lat,   
    longitude: lng 
  })

// 앱 그룹 목록 조회 (웹에서 생성된 그룹 포함)
export const fetchAppGroups = () =>
  api.get<AppGroup[]>('/app/groups')

export const fetchMyParticipations = () =>
  publicApi.get<EventParticipation[]>('/api/event-participation/me')

// 앱 그룹 참가
export const joinAppGroup = (groupId: number) =>
  api.post<AppGroup>(`/app/groups/${groupId}/join`)

// 앱 그룹 모였다 인증
export const gatherAppGroup = (groupId: number) =>
  api.post<AppGroup>(`/app/groups/${groupId}/gather`)

export type UploadSourceType = 'APP_PHOTO' | 'TRAIL_ART' | 'POST_PHOTO'

export const checkArrivalStatus = (venueId: string) =>
  api.get<{ verified: boolean }>(`/app/arrivals/${venueId}/me`)

// 🚨 [수정됨] S3 파일 업로드: Network Error 방지를 위한 axios 통일 및 FormData 수정
export const uploadFileToS3 = async (
  uri: string,
  fileName: string,
  sourceType: UploadSourceType = 'APP_PHOTO',
  autoSaveToGallery = true,
  referenceId?: string,
  type: string = 'image/jpeg' // 파라미터 추가: MIME 타입 기본값 강제
) => {
  const startedAt = Date.now()
  console.log('[uploadFileToS3] 시작:', {
    fileName,
    sourceType,
    autoSaveToGallery,
    referenceId,
    uri,
  })

  // 업로드 직전 토큰을 강제 갱신하여 만료된 토큰으로 403이 나는 것을 방지
  const currentUser = auth.currentUser
  let freshToken: string | undefined
  if (currentUser) {
    try {
      freshToken = await withTimeout(currentUser.getIdToken(true), 5000)
    } catch (e) {
      console.warn('[uploadFileToS3] 토큰 강제 갱신 실패, 기존 토큰으로 시도합니다:', e)
    }
  }

  // 💡 React Native 전용 FormData 형식 (uri, name, type 필수)
  const formData = new FormData()
  formData.append('file', {
    uri,
    name: fileName,
    type, // 필수로 들어가야 서버 단에서 드랍되지 않습니다.
  } as any)

  // 💡 fetch를 제거하고 axios(api 인스턴스) 하나로 통합하여 헤더 설정을 안전하게 관리
  const headers: Record<string, string> = {
    'Content-Type': 'multipart/form-data', // 🚨 통신 드랍(Network Error) 방지의 핵심
  }
  
  if (freshToken) {
    headers.Authorization = `Bearer ${freshToken}`
  }

  try {
    const response = await api.post('/files/upload', formData, {
      params: { sourceType, autoSaveToGallery, referenceId },
      headers,
      timeout: 60000, // 이미지 업로드는 시간이 걸릴 수 있으므로 60초 유지
    })

    console.log('[uploadFileToS3] 완료(axios):', {
      fileName,
      sourceType,
      elapsedMs: Date.now() - startedAt,
      status: response.status,
    })
    return response

  } catch (error: any) {
    // 💡 에러 상세 로깅: 이제 Network Error 대신 백엔드 에러 원인을 명확하게 볼 수 있습니다.
    console.error('[uploadFileToS3] 실패 상세:', {
      fileName,
      sourceType,
      elapsedMs: Date.now() - startedAt,
      message: error?.message,
      statusCode: error?.response?.status,
      responseData: error?.response?.data,
    })
    throw error
  }
}

// GPS 동선 저장
export const saveTrail = (
  venueId: string,
  trail: { lat: number; lng: number; timestamp: number }[]
) => api.post('/app/trails', { venueId, trail })

export default api