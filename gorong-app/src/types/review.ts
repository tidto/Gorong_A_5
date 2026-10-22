// ─────────────────────────────────────────────
// 리뷰 조회 타입 (gorong-app)
// 백엔드 GET /api/v1/reviews/event/{eventId} 응답 구조
//  · ReviewController.reviewImageSummary
//  · ReviewController.reviewSummaryResponse
//  · ReviewController.pageResponse
// ─────────────────────────────────────────────

// ─── 리뷰 첨부 이미지 ────────────────────────
export interface ReviewImageSummary {
  id: number
  imageUrl: string
  originalImgName: string | null
  saveImgName: string | null
  displayOrder: number
}

// ─── 리뷰 1건 (목록 조회용 요약본) ─────────────
export interface ReviewSummary {
  id: number
  eventId: number
  eventTitle: string
  userId: number
  authorName: string
  rating: number
  title: string | null
  reviewText: string | null
  // 이 조회 API는 contents를 항상 null로 내려준다 (ReviewController가 toSummary(review, false)).
  // 본문 표시는 reviewText만 사용한다.
  contents: string | null
  // 'REVIEW_ONLY' (간편리뷰) | 'PUBLISHED' (정식 포스팅) — 두 종류 모두 목록에 포함된다.
  status: string
  reviewMetaEditable: boolean
  // 웹 전용 경로. 앱에서는 사용하지 않는다.
  postingPath: string | null
  // ISO-8601 문자열 (JacksonConfig.java가 JavaTimeModule + WRITE_DATES_AS_TIMESTAMPS 해제)
  createdAt: string
  updatedAt: string
  // null이 아닌 배열 (Review.reviewImages 기본값 new ArrayList<>())
  images: ReviewImageSummary[]
}

// ─── Page 응답 ────────────────────────────────
export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}