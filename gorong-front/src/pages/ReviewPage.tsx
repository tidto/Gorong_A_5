import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Button from '../components/Button'
import Input from '../components/Input'
import Card from '../components/Card'
import { useAuth } from '../contexts/AuthContext'
import { Image, Flag, Trash2 } from 'lucide-react'
import axiosInstance from '../api/axiosInstance'

type UiReview = {
  id: number
  userId: number
  user: string
  rating: number
  comment: string
  date: string
  images: string[]
}

type UiEvent = {
  id: number
  title: string
}

const mockEventsList: UiEvent[] = [
  { id: 1, title: '초보자 요가 클래스' },
  { id: 2, title: '하프 마라톤' },
  { id: 3, title: '미술 전시회' },
  { id: 4, title: '볼링 클럽' },
  { id: 5, title: '수영 레슨' },
  { id: 6, title: '독서 모임' },
]

const mockReviews: UiReview[] = [
  {
    id: 1,
    userId: 0,
    user: '행복한고양이',
    rating: 5,
    comment: '정말 좋은 행사였어요! Go냥이와 함께해서 더 즐거웠습니다.',
    date: '2024-04-15',
    images: [],
  },
  {
    id: 2,
    userId: 0,
    user: '스포츠러버',
    rating: 4,
    comment: '시설이 깔끔하고 참가자들이 친절했어요.',
    date: '2024-04-12',
    images: [],
  },
  {
    id: 3,
    userId: 0,
    user: '요가초보',
    rating: 5,
    comment: '초보자도 쉽게 따라할 수 있었어요. 추천합니다!',
    date: '2024-04-10',
    images: [],
  },
]

export default function ReviewPage() {
  const { id } = useParams()
  const auth = useAuth()
  const [reviews, setReviews] = useState<UiReview[]>([])
  const [events] = useState<UiEvent[]>(mockEventsList)
  const [selectedEventId, setSelectedEventId] = useState<number | null>(Number(id) || null)
  const [newReview, setNewReview] = useState('')
  const [newRating, setNewRating] = useState(0)
  const [newImages, setNewImages] = useState<File[]>([])
  const [showWriteForm, setShowWriteForm] = useState(false)
  const [loading, setLoading] = useState(false)

  const hasValidEventId = Number.isFinite(selectedEventId) && Number(selectedEventId) > 0
  const currentUserId = Number((auth.user as { id?: number } | null)?.id)
  const canDeleteOwnReview = Number.isFinite(currentUserId) && currentUserId > 0

  const toUiReview = (review: any): UiReview => ({
    id: Number(review?.id),
    userId: Number(review?.userId) || 0,
    user: review?.authorName ?? '익명',
    rating: Number(review?.rating) || 0,
    comment: (review?.content?.trim() || review?.title || '').trim(),
    date: review?.reviewDate?.slice(0, 10) || review?.createdAt?.slice(0, 10) || '',
    images: Array.isArray(review?.reviewImages) ? review.reviewImages.map((img: any) => img?.imageUrl).filter(Boolean) : [],
  })

  const loadReviews = async () => {
    if (!hasValidEventId) {
      setReviews(mockReviews)
      return
    }
    setLoading(true)
    try {
      const response = await axiosInstance.get(`/v1/reviews/event/${Number(selectedEventId)}`)
      const list = Array.isArray(response.data) ? response.data.map(toUiReview) : []
      setReviews(list)
    } catch (error) {
      console.error('리뷰 조회 실패:', error)
      setReviews([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReviews()
  }, [selectedEventId])

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0
  const ratingDistribution = [5, 4, 3, 2, 1].map(rating =>
    reviews.filter(review => review.rating === rating).length
  )

  const handleSubmitReview = () => {
    if (!newReview.trim() || newRating === 0) return
    const authorName = auth.user?.nickname?.trim() || auth.user?.email?.trim() || '익명'
    if (!hasValidEventId) {
      alert('이벤트를 먼저 선택해 주세요.')
      return
    }
    axiosInstance
      .post('/v1/reviews', {
        rating: newRating,
        title: newReview.trim().slice(0, 50),
        content: newReview.trim(),
        authorName,
        eventId: Number(selectedEventId),
      })
      .then(async () => {
        setNewReview('')
        setNewRating(0)
        setNewImages([])
        setShowWriteForm(false)
        await loadReviews()
      })
      .catch((error) => {
        console.error('리뷰 등록 실패:', error)
        alert('리뷰 등록 중 오류가 발생했습니다.')
      })
  }

  const handleDeleteReview = async (reviewId: number) => {
    const confirmed = window.confirm('리뷰를 삭제하시겠습니까?')
    if (!confirmed) return
    try {
      await axiosInstance.delete(`/v1/reviews/${reviewId}`)
      await loadReviews()
    } catch (error) {
      console.error('리뷰 삭제 실패:', error)
      alert('리뷰 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleReport = (reviewId: number) => {
    alert(`리뷰 ${reviewId}번을 신고했습니다.`)
  }
  

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">💬 리뷰</h1>
          <p className="text-gray-600 mt-2">
            {hasValidEventId ? `행사 #${selectedEventId} 참여자들의 솔직한 후기` : '행사를 선택해 리뷰를 확인/작성하세요'}
          </p>
        </div>
        <Button onClick={() => setShowWriteForm(!showWriteForm)} disabled={!hasValidEventId}>
          {showWriteForm ? '취소' : '리뷰 작성'}
        </Button>
      </div>

      <Card title="이벤트 선택">
        <select
          className="w-full border border-gray-300 rounded-lg p-3 bg-white"
          value={selectedEventId ?? ''}
          onChange={(e) => setSelectedEventId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">이벤트를 선택하세요</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>
      </Card>

      {/* 리뷰 통계 */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card title="평균 젤리 점수">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-600 mb-2">
              {averageRating.toFixed(1)}
            </div>
            <div className="flex items-center justify-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-lg ${
                    star <= Math.round(averageRating)
                      ? 'text-primary-600'
                      : 'text-gray-300'
                  }`}
                >
                  🐾
                </span>
              ))}
            </div>
            <p className="text-sm text-gray-600">{reviews.length}개의 리뷰</p>
          </div>
        </Card>

        <Card title="젤리 점수 분포">
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating, index) => (
              <div key={rating} className="flex items-center gap-3">
                <span className="text-sm w-10">{rating}젤리</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-500 h-2 rounded-full"
                    style={{
                      width: reviews.length > 0 ? `${(ratingDistribution[index] / reviews.length) * 100}%` : '0%',
                    }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-8">{ratingDistribution[index]}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 리뷰 작성 폼 */}
      {showWriteForm && (
        <Card title="리뷰 작성">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">젤리 점수</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setNewRating(value)}
                    className="text-3xl transition-transform hover:-translate-y-1"
                  >
                    <span
                      className={`${
                        value <= newRating ? 'text-primary-600 opacity-100' : 'text-primary-600 opacity-30'
                      }`}
                    >
                      🐾
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="리뷰 내용"
              multiline
              rows={4}
              value={newReview}
              onChange={(e) => setNewReview(e.target.value)}
              placeholder="행사 참여 후기를 작성해주세요."
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">사진 첨부</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setNewImages(Array.from(e.target.files || []))}
                className="hidden"
                id="review-images"
              />
              <label
                htmlFor="review-images"
                className="flex items-center gap-2 cursor-pointer border border-gray-300 rounded-lg p-3 hover:border-primary-500"
              >
                <Image className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-600">사진 선택</span>
              </label>
              {newImages.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">{newImages.length}개의 파일 선택됨</p>
              )}
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSubmitReview} disabled={!newReview.trim() || newRating === 0}>
                리뷰 등록
              </Button>
              <Button variant="secondary" onClick={() => setShowWriteForm(false)}>
                취소
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 리뷰 리스트 */}
      <div className="space-y-4">
        {loading && <p className="text-sm text-gray-500">리뷰를 불러오는 중...</p>}
        {reviews.map((review) => (
          <Card key={review.id}>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary-700">
                      {review.user.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{review.user}</p>
                    <p className="text-sm text-gray-500">{review.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`text-sm ${star <= review.rating ? 'text-primary-600 opacity-100' : 'text-primary-600 opacity-30'}`}
                      >
                        🐾
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => handleReport(review.id)}
                    className="text-gray-400 hover:text-red-500 p-1"
                  >
                    <Flag className="w-4 h-4" />
                  </button>
                  {canDeleteOwnReview && review.userId === currentUserId && (
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      className="text-gray-400 hover:text-gray-700 p-1"
                      title="내 리뷰 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-gray-700">{review.comment}</p>

              {review.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {review.images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`리뷰 이미지 ${index + 1}`}
                      className="w-32 h-24 object-cover rounded-lg flex-shrink-0"
                    />
                  ))}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
