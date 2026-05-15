import axiosInstance from './axiosInstance'
import type { Review, ReviewCreateRequest, ReviewUpdateRequest } from './types'

const BASE_URL = '/v1/reviews'

// ─── CREATE: 리뷰 작성 ───
export const createReview = async (request: ReviewCreateRequest): Promise<Review> => {
    try {
        const response = await axiosInstance.post<Review>(`${BASE_URL}`, request)
        return response.data
    } catch (error) {
        console.error('리뷰 작성 API 오류:', error)
        throw error
    }
}

// ─── READ: 이벤트별 리뷰 목록 (최신순) ───
export const getReviewsByEventId = async (eventId: number): Promise<Review[]> => {
    try {
        const response = await axiosInstance.get<Review[]>(`${BASE_URL}/event/${eventId}`)
        return response.data
    } catch (error) {
        console.error('리뷰 목록 조회 API 오류:', error)
        throw error
    }
}

// ─── READ: 이벤트별 평균 별점 ───
export const getAverageRatingByEventId = async (eventId: number): Promise<number> => {
    try {
        const response = await axiosInstance.get<number>(`${BASE_URL}/event/${eventId}/average-rating`)
        return response.data
    } catch (error) {
        console.error('평균 별점 조회 API 오류:', error)
        return 0
    }
}

// ─── READ: 사용자별 리뷰 목록 ───
export const getReviewsByUserId = async (userId: number): Promise<Review[]> => {
    try {
        const response = await axiosInstance.get<Review[]>(`${BASE_URL}/user/${userId}`)
        return response.data
    } catch (error) {
        console.error('사용자 리뷰 조회 API 오류:', error)
        throw error
    }
}

// ─── READ: 특정 리뷰 상세 조회 ───
export const getReviewById = async (reviewId: number): Promise<Review> => {
    try {
        const response = await axiosInstance.get<Review>(`${BASE_URL}/${reviewId}`)
        return response.data
    } catch (error) {
        console.error('리뷰 상세 조회 API 오류:', error)
        throw error
    }
}

// ─── UPDATE: 리뷰 수정 ───
export const updateReview = async (
    reviewId: number,
    request: ReviewUpdateRequest
): Promise<Review> => {
    try {
        const response = await axiosInstance.put<Review>(`${BASE_URL}/${reviewId}`, request)
        return response.data
    } catch (error) {
        console.error('리뷰 수정 API 오류:', error)
        throw error
    }
}

// ─── DELETE: 리뷰 삭제 ───
export const deleteReview = async (reviewId: number): Promise<void> => {
    try {
        await axiosInstance.delete(`${BASE_URL}/${reviewId}`)
    } catch (error) {
        console.error('리뷰 삭제 API 오류:', error)
        throw error
    }
}