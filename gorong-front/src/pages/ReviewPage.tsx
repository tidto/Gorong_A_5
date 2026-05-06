import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Button from '../components/Button'
import Input from '../components/Input'
import Card from '../components/Card'
import { useAuth } from '../contexts/AuthContext'
import { Send, Image, Flag, MessageCircle } from 'lucide-react'

const mockReviews = [
  {
    id: 1,
    user: '행복한고양이',
    rating: 5,
    comment: '정말 좋은 행사였어요! Go냥이와 함께해서 더 즐거웠습니다.',
    date: '2024-04-15',
    images: ['/gorong_logo.png'],
  },
  {
    id: 2,
    user: '스포츠러버',
    rating: 4,
    comment: '시설이 깔끔하고 참가자들이 친절했어요.',
    date: '2024-04-12',
    images: [],
  },
  {
    id: 3,
    user: '요가초보',
    rating: 5,
    comment: '초보자도 쉽게 따라할 수 있었어요. 추천합니다!',
    date: '2024-04-10',
    images: ['/gorong_logo.png'],
  },
]

export default function ReviewPage() {
  const { id } = useParams()
  const auth = useAuth()
  const [reviews, setReviews] = useState(mockReviews)
  const [newReview, setNewReview] = useState('')
  const [newRating, setNewRating] = useState(0)
  const [newImages, setNewImages] = useState<File[]>([])
  const [showWriteForm, setShowWriteForm] = useState(false)

  const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
  const ratingDistribution = [5, 4, 3, 2, 1].map(rating =>
    reviews.filter(review => review.rating === rating).length
  )

  const handleSubmitReview = () => {
    if (!newReview.trim() || newRating === 0) return

    const review = {
      id: reviews.length + 1,
      user: auth.user?.nickname || '익명',
      rating: newRating,
      comment: newReview,
      date: new Date().toISOString().split('T')[0],
      images: newImages.map(() => '/gorong_logo.png'),
    }

    setReviews([review, ...reviews])
    setNewReview('')
    setNewRating(0)
    setNewImages([])
    setShowWriteForm(false)
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
            행사 {id ? `#${id}` : ''} 참여자들의 솔직한 후기
          </p>
        </div>
        <Button onClick={() => setShowWriteForm(!showWriteForm)}>
          {showWriteForm ? '취소' : '리뷰 작성'}
        </Button>
      </div>

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
                    style={{ width: `${(ratingDistribution[index] / reviews.length) * 100}%` }}
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
                    <span className={`${value <= newRating ? 'text-primary-600' : 'text-gray-300'}`}>
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
                        className={`text-sm ${star <= review.rating ? 'text-primary-600' : 'text-gray-300'}`}
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
