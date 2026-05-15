// 리뷰 타입 정의

export interface Review {
    id: number
    rating: number
    title: string
    content?: string
    authorName: string
    userId: number
    eventId: number
    reviewDate: string
    createdAt: string
    updatedAt: string
    reviewImages: ReviewImage[]
}

export interface ReviewImage {
    id: number
    reviewId: number
    imageUrl: string
    createdAt: string
    updatedAt: string
}

export interface ReviewCreateRequest {
    rating: number
    title: string
    content?: string
    authorName: string
    userId: number
    eventId: number
}

export interface ReviewUpdateRequest {
    rating?: number
    title?: string
    content?: string
}

export interface ReviewListResponse {
    reviews: Review[]
    averageRating?: number
    totalCount?: number
}