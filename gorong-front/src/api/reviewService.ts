import axiosInstance from './axiosInstance'

export type PostingImage = {
  id?: number
  imageUrl: string
  originalImgName?: string
  saveImgName?: string
  displayOrder?: number
}

export type ReviewSummary = {
  id: number
  eventId: number
  eventTitle: string
  userId: number
  authorName: string
  rating: number
  title: string
  reviewText: string
  contents?: string | null
  status: 'REVIEW_ONLY' | 'PUBLISHED'
  reviewMetaEditable: boolean
  postingPath?: string | null
  createdAt: string
  updatedAt?: string
  images: PostingImage[]
}

export type ReviewDetail = ReviewSummary

export type PagedResponse<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

export type ImagePayload = {
  imageUrl: string
  originalImgName: string
  saveImgName: string
}

export type QuickReviewPayload = {
  rating: number
  reviewText: string
  authorName: string
  images: ImagePayload[]
}

export type PublishPostingPayload = {
  reviewId?: number | null
  eventId: number
  title: string
  reviewText: string
  rating: number
  contents: string
  authorName: string
  images: ImagePayload[]
}

export type ParticipatedEvent = {
  eventId: number
  title: string
  appliedAt?: string | null
}

export async function getEventReviews(eventId: number, page = 0, size = 10) {
  const { data } = await axiosInstance.get<PagedResponse<ReviewSummary>>(`/v1/reviews/event/${eventId}`, {
    params: { page, size },
  })
  return data
}

export async function saveQuickReview(eventId: number, payload: QuickReviewPayload) {
  const { data } = await axiosInstance.post<ReviewDetail>(`/v1/reviews/event/${eventId}/quick`, payload)
  return data
}

export async function getPostingTemplate(eventId: number) {
  const { data } = await axiosInstance.get<ReviewDetail | null>(`/v1/reviews/template/${eventId}`)
  return data
}

export async function getParticipatedEvents() {
  const { data } = await axiosInstance.get<ParticipatedEvent[]>('/v1/reviews/my/events')
  return Array.isArray(data) ? data : []
}

export async function getMyVerifiedVenueIds() {
  const { data } = await axiosInstance.get<string[]>('/v1/app/arrivals/me')
  return Array.isArray(data) ? data : []
}

export async function getPublishedPosts(page = 0, size = 10) {
  const { data } = await axiosInstance.get<PagedResponse<ReviewSummary>>('/v1/reviews/posts', {
    params: { page, size },
  })
  return data
}

export async function getPostingDetail(reviewId: number) {
  const { data } = await axiosInstance.get<ReviewDetail>(`/v1/reviews/posts/${reviewId}`)
  return data
}

export async function publishPosting(payload: PublishPostingPayload) {
  const { data } = await axiosInstance.post<ReviewDetail>('/v1/reviews/posts', payload)
  return data
}

export async function updatePosting(reviewId: number, payload: PublishPostingPayload) {
  const { data } = await axiosInstance.put<ReviewDetail>(`/v1/reviews/posts/${reviewId}`, payload)
  return data
}

export async function deleteReview(reviewId: number) {
  await axiosInstance.delete(`/v1/reviews/posts/${reviewId}`)
}