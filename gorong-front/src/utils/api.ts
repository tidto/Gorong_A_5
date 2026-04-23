/**
 * API 헬퍼 함수
 * 백엔드 API 호출을 관리하는 유틸리티 함수
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

// 타입 정의
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  status: number
}

export interface CompilerRequest {
  code: string
  language: 'python' | 'javascript'
  input?: string
}

export interface CompilerResponse {
  stdout?: string
  stderr?: string
  status_code: number
}

/**
 * 제네릭 API 요청 함수
 */
export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    })

    const data = await response.json()

    return {
      success: response.ok,
      data: response.ok ? data : undefined,
      error: response.ok ? undefined : data?.error || 'API 오류',
      status: response.status,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '네트워크 오류',
      status: 0,
    }
  }
}

/**
 * 이벤트 목록 조회
 */
export async function getEvents(filters?: {
  difficulty?: string
  maxDistance?: number
  barrierFree?: boolean
}) {
  const params = new URLSearchParams()
  if (filters?.difficulty) params.append('difficulty', filters.difficulty)
  if (filters?.maxDistance) params.append('maxDistance', filters.maxDistance.toString())
  if (filters?.barrierFree) params.append('barrierFree', 'true')

  return fetchApi('/events?' + params.toString())
}

/**
 * 이벤트 상세 정보 조회
 */
export async function getEventDetail(eventId: number) {
  return fetchApi(`/events/${eventId}`)
}

/**
 * 코드 컴파일 및 실행
 */
export async function compileCode(request: CompilerRequest) {
  return fetchApi<CompilerResponse>('/compiler', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

/**
 * 사용자 프로필 조회
 */
export async function getUserProfile(userId: string) {
  return fetchApi(`/users/${userId}`)
}

/**
 * 사용자 프로필 업데이트
 */
export async function updateUserProfile(userId: string, data: any) {
  return fetchApi(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * 행사 참여 신청
 */
export async function joinEvent(eventId: number, userId: string) {
  return fetchApi(`/events/${eventId}/join`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
}

/**
 * 리뷰 작성
 */
export async function postReview(eventId: number, data: any) {
  return fetchApi(`/events/${eventId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * 지도 경로 데이터 조회 (PostGIS 기반)
 */
export async function getMapPath(eventId: number, userId?: string) {
  const endpoint = userId ? `/map/path/${eventId}?userId=${userId}` : `/map/path/${eventId}`
  return fetchApi(endpoint)
}

/**
 * 사용자 활동 히스토리 조회
 */
export async function getActivityHistory(userId: string) {
  return fetchApi(`/users/${userId}/activity`)
}

/**
 * 배리어프리 정보 조회
 */
export async function getBarrierFreeInfo(eventId: number) {
  return fetchApi(`/events/${eventId}/barrier-free`)
}
