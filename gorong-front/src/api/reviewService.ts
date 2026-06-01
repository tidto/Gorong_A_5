import axiosInstance from './axiosInstance'

export type ReviewImage = {
  id: number
  imageUrl: string
  createdAt?: string
  updatedAt?: string
}

export type Review = {
  id: number
  rating: number
  title: string
  content?: string
  authorName: string
  reviewDate: string
  userId: number
  eventId: number
  createdAt?: string
  updatedAt?: string
  reviewImages?: ReviewImage[]
}

export type CreateReviewRequest = {
  rating: number
  title: string
  content?: string
  authorName: string
  eventId: number
  userId?: number
}

export async function createReview(payload: CreateReviewRequest): Promise<Review> {
  const { data } = await axiosInstance.post('/v1/reviews', payload)
  return data
}

export async function getReviewsByEventId(eventId: number): Promise<Review[]> {
  const { data } = await axiosInstance.get(`/v1/reviews/event/${eventId}`)
  return Array.isArray(data) ? data : []
}

export async function getReviewById(reviewId: number): Promise<Review> {
  const { data } = await axiosInstance.get(`/v1/reviews/${reviewId}`)
  return data
}

export async function deleteReview(reviewId: number): Promise<void> {
  await axiosInstance.delete(`/v1/reviews/${reviewId}`)
}

export async function getReviewImages(reviewId: number): Promise<ReviewImage[]> {
  const { data } = await axiosInstance.get(`/v1/reviews/${reviewId}/images`)
  return Array.isArray(data) ? data : []
}

export async function addReviewImage(reviewId: number, imageUrl: string): Promise<ReviewImage> {
  const { data } = await axiosInstance.post(`/v1/reviews/${reviewId}/images`, { imageUrl })
  return data
}

export async function deleteReviewImage(reviewId: number, imageId: number): Promise<void> {
  await axiosInstance.delete(`/v1/reviews/${reviewId}/images/${imageId}`)
}
