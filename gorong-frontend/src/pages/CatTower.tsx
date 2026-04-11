import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import IconLabel from '../components/IconLabel'
import Button from '../components/Button'
import { useAuth } from '../contexts/AuthContext'
import { Trophy, BarChart3, Sparkles, Share2 } from 'lucide-react'

const activityHistory = [
  { id: 1, title: '요가 클래스 참여', date: '2024-04-15', tag: '참여' },
  { id: 2, title: '미술 전시회 리뷰 작성', date: '2024-04-12', tag: '리뷰' },
  { id: 3, title: '동행 모집 참여', date: '2024-04-10', tag: '동행' },
  { id: 4, title: '커뮤니티 독서 모임', date: '2024-04-08', tag: '참여' },
]

const recentReviews = [
  {
    id: 1,
    event: '초보자 요가 클래스',
    rating: 5,
    date: '2024-04-15',
    location: '강남 요가 스튜디오',
    comment: '편안하게 참여할 수 있었어요. 친절한 가이드님 최고!',
    image: 'https://images.unsplash.com/photo-1526401485004-3d373b0d5e7a?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 2,
    event: '미술 전시회',
    rating: 4,
    date: '2024-04-12',
    location: '홍대 갤러리',
    comment: '작품 감상이 좋았고 분위기가 편안했어요.',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 3,
    event: '동행 모집 참여',
    rating: 5,
    date: '2024-04-10',
    location: '여의도 피크닉',
    comment: '같이 와줘서 든든했어요. 또 참여할게요!',
    image: 'https://images.unsplash.com/photo-1485217988980-11786ced9454?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 4,
    event: '커뮤니티 독서 모임',
    rating: 4,
    date: '2024-04-08',
    location: '합정 북카페',
    comment: '좋은 이야기를 나눌 수 있어서 기억에 남아요.',
    image: 'https://images.unsplash.com/photo-1496317899792-9d7dbcd928a1?auto=format&fit=crop&w=800&q=80',
  },
]

export default function CatTower() {
  const auth = useAuth()
  const navigate = useNavigate()

  const [isCustomizationMode, setIsCustomizationMode] = useState(false)
  const [selectedOutfit, setSelectedOutfit] = useState(auth.user?.customization?.outfit || '기본')
  const [selectedBadge, setSelectedBadge] = useState(auth.user?.customization?.badge || '')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedReview, setSelectedReview] = useState<typeof recentReviews[number] | null>(null)

  const outfits = ['기본', '요가복', '미술가 모자', '독서 모자']
  const badges = ['참여 신뢰 배지', '리뷰 투명성 배지', '활동 공유 배지']

  const galleryItems = [...recentReviews].sort((a, b) => b.date.localeCompare(a.date))

  const stats = [
    { label: '참여 행사', value: 14 },
    { label: '작성 리뷰', value: recentReviews.length },
    { label: '리뷰 이미지', value: galleryItems.length },
    { label: '받은 하트', value: 312 },
  ]

  const handleSave = () => {
    auth.updateUser({
      customization: {
        outfit: selectedOutfit,
        badge: selectedBadge,
      },
    })
  }

  const renderPawRating = (rating: number) => (
    <span className="inline-flex gap-1 text-lg">
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          className={index < rating ? 'text-primary-600' : 'text-gray-300'}
        >
          🐾
        </span>
      ))}
    </span>
  )

  const openGalleryItem = (item: typeof recentReviews[number]) => {
    setSelectedReview(item)
    setIsModalOpen(true)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">🐾 CatTower</h1>
          <p className="text-gray-600 mt-2">
            {auth.user?.nickname}님의 활동 기록과 리뷰가 여기에 저장됩니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/events')}>
            다음 행사 찾기
          </Button>
          <Button variant="primary" onClick={() => setIsCustomizationMode(!isCustomizationMode)}>
            꾸미기 모드 {isCustomizationMode ? '끄기' : '켜기'}
          </Button>
        </div>
      </div>

      {isCustomizationMode ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Go냥이 미리보기">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-48 h-48 bg-primary-100 rounded-full flex items-center justify-center text-6xl">
                  🐱
                </div>
                {selectedOutfit !== '기본' && (
                  <div className="absolute top-0 right-0 text-2xl">
                    {selectedOutfit === '요가복' ? '🧘' : selectedOutfit === '미술가 모자' ? '🎨' : '📖'}
                  </div>
                )}
                {selectedBadge && (
                  <div className="absolute bottom-0 left-0 text-xl">
                    {selectedBadge === '참여 신뢰 배지' ? '🏆' : selectedBadge === '리뷰 투명성 배지' ? '📊' : '📤'}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary">회전</Button>
                <Button variant="secondary">확대</Button>
              </div>
            </div>
          </Card>
          <div className="space-y-6">
            <Card title="의상 선택">
              <div className="grid gap-2">
                {outfits.map(outfit => (
                  <Button
                    key={outfit}
                    variant={selectedOutfit === outfit ? 'primary' : 'secondary'}
                    onClick={() => setSelectedOutfit(outfit)}
                  >
                    {outfit}
                  </Button>
                ))}
              </div>
            </Card>
            <Card title="뱃지 선택">
              <div className="grid gap-2">
                {badges.map(badge => (
                  <Button
                    key={badge}
                    variant={selectedBadge === badge ? 'primary' : 'secondary'}
                    onClick={() => setSelectedBadge(badge)}
                  >
                    {badge}
                  </Button>
                ))}
              </div>
            </Card>
            <Button onClick={handleSave}>저장하기</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 text-primary-600 mb-4">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium text-gray-700">{stat.label}</span>
            </div>
            <p className="text-4xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card title="활동 히스토리">
          <div className="space-y-4">
            {activityHistory.map((activity) => (
              <div key={activity.id} className="rounded-3xl border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{activity.title}</p>
                    <p className="text-sm text-gray-500">{activity.date}</p>
                  </div>
                  <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                    {activity.tag}
                  </span>
                </div>
                <p className="text-sm text-gray-600">Go냥이와 함께한 소중한 기록입니다.</p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="리뷰 리뷰">
          <div className="space-y-4">
            {recentReviews.map((review) => (
              <div key={review.id} className="rounded-3xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  {renderPawRating(review.rating)}
                </div>
                <p className="font-semibold text-gray-900">{review.event}</p>
                <p className="text-sm text-gray-600 mt-2">{review.comment}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="프로필 요약">
          <div className="space-y-3">
            <div className="text-gray-700">
              <p className="font-semibold">닉네임</p>
              <p>{auth.user?.nickname || '로그인 필요'}</p>
            </div>
            <div className="text-gray-700">
              <p className="font-semibold">이메일</p>
              <p>{auth.user?.email || '정보 없음'}</p>
            </div>
            <div className="text-gray-700">
              <p className="font-semibold">배리어프리 추천</p>
              <p>{auth.user?.requiresBarrierFree ? '적용됨' : '기본'}</p>
            </div>
            <div className="text-gray-700">
              <p className="font-semibold">미성년자 여부</p>
              <p>{auth.user?.isMinor ? '부모 인증 필요' : '성인'}</p>
            </div>
          </div>
        </Card>

        <Card title="신뢰 배지">
          <div className="grid gap-3">
            <div className="inline-flex items-center gap-2 rounded-3xl bg-primary-50 px-4 py-3 text-sm text-primary-700">
              <Trophy className="w-4 h-4" /> 참여 신뢰 배지 획득
            </div>
            <div className="inline-flex items-center gap-2 rounded-3xl bg-secondary-50 px-4 py-3 text-sm text-secondary-700">
              <BarChart3 className="w-4 h-4" /> 리뷰 투명성 배지
            </div>
            <div className="inline-flex items-center gap-2 rounded-3xl bg-green-50 px-4 py-3 text-sm text-green-700">
              <Share2 className="w-4 h-4" /> 활동 공유 배지
            </div>
          </div>
        </Card>
      </div>
        </>
      )}

      <Card title="나만의 갤러리">
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
            <div>
              <p className="font-semibold text-gray-900">리뷰를 작성하면 자동으로 갤러리가 채워집니다.</p>
              <p className="text-sm text-gray-500">최근 리뷰 이미지가 최신순으로 자동 정렬됩니다.</p>
            </div>
            <p className="text-sm text-gray-600">갤러리 이미지: {galleryItems.length}장</p>
          </div>

          {galleryItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              아직 리뷰 이미지가 없습니다. 리뷰를 작성하면 갤러리가 자동으로 채워집니다.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {galleryItems.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-3xl bg-gray-100 shadow-sm cursor-pointer transform transition duration-500 ease-out hover:-translate-y-1 hover:shadow-lg animate-fade-in"
                  onClick={() => openGalleryItem(item)}
                >
                  <img
                    src={item.image}
                    alt={item.event}
                    className="w-full h-40 object-cover"
                  />
                  <div className="p-3 border-t border-gray-200 bg-white">
                    <p className="font-semibold text-gray-900 truncate">{item.event}</p>
                    <p className="text-xs text-gray-500">{item.date} · {item.location}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {isModalOpen && selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4" onClick={() => setIsModalOpen(false)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <img src={selectedReview.image} alt={selectedReview.event} className="w-full h-[60vh] object-cover" />
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 bg-white text-black rounded-full w-10 h-10 flex items-center justify-center shadow-lg"
              >
                ×
              </button>
            </div>
            <div className="space-y-3 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xl font-semibold text-gray-900">{selectedReview.event}</p>
                  <p className="text-sm text-gray-500">{selectedReview.date} · {selectedReview.location}</p>
                </div>
                {renderPawRating(selectedReview.rating)}
              </div>
              <p className="text-gray-700">{selectedReview.comment}</p>
              <div className="rounded-2xl bg-primary-50 p-4 text-sm text-primary-700">
                이 사진은 리뷰에 첨부된 이미지입니다.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
