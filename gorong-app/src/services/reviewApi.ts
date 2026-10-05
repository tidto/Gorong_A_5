// ─────────────────────────────────────────────
// src/services/reviewApi.ts
// 행사 리뷰 조회 (읽기 전용)
//
// backend: GET /api/v1/reviews/event/{eventId}?page=&size=
//   · ReviewController.getEventReviews — 인증 필요(Bearer), page는 0-based
//   · size는 서버에서 Math.min(size, 20)으로 클램프됨
//   · createdAt DESC 정렬, status 필터 없음 (REVIEW_ONLY + PUBLISHED 혼합)
//
// api.ts의 baseURL에 /api/v1이 이미 포함되어 있으므로
// 경로에는 '/api/v1'을 붙이지 않는다. (publicApi는 루트 baseURL이라 사용 금지)
//
// → 리뷰 작성/수정/삭제/이미지 업로드는 이번 범위 밖이며 이 파일에 두지 않는다.
// ─────────────────────────────────────────────
import api from './api'
import { PageResponse, ReviewSummary } from '../types/review'

// 한 번에 가져올 개수 (백엔드 size 상한 20 이내)
export const REVIEW_PAGE_SIZE = 10

// 행사 리뷰 목록 조회 — AxiosResponse를 그대로 돌려준다 (api.ts의 fetchNearbyVenues 등과 동일한 관례)
export const fetchEventReviews = (eventId: number, page = 0, size = REVIEW_PAGE_SIZE) =>
    api.get<PageResponse<ReviewSummary>>(`/reviews/event/${eventId}`, {
        params: { page, size },
    })

// Venue.id(TourAPI contentid 문자열) → 백엔드 @PathVariable Long
// 숫자가 아니거나 JS 안전 정수 범위를 벗어나면 null을 돌려주어
// 'NaN'/'undefined'가 URL에 들어가지 않도록 막는다.
export function toEventId(venueId: string | null | undefined): number | null {
    const raw = (venueId ?? '').trim()
    if (!/^\d+$/.test(raw)) return null
    const parsed = Number(raw)
    return Number.isSafeInteger(parsed) ? parsed : null
}