import React, { useState } from 'react'
import RiveCharacter from '../components/RiveCharacter'
import Card from '../components/Card'
import { Heart, Image, MessageCircle, Trophy, Zap, Target } from 'lucide-react'

const mockReviews = [
  {
    id: 1,
    event: '초보자 요가 클래스',
    rating: 5,
    comment: '정말 좋은 시간이었어요! Go냥이도 함께해서 더 재미있었습니다.',
    date: '2024-04-10',
  },
  {
    id: 2,
    event: '미술 전시회',
    rating: 4,
    comment: '멋진 작품들이 많았어요. 다음에도 참여하고 싶습니다.',
    date: '2024-04-08',
  },
  {
    id: 3,
    event: '커뮤니티 독서 모임',
    rating: 5,
    comment: '사람들과 좋은 대화를 할 수 있었습니다.',
    date: '2024-04-05',
  },
]

const mockPhotos = [
  { id: 1, event: '초보자 요가 클래스', src: 'https://via.placeholder.com/200x200?text=Yoga' },
  { id: 2, event: '미술 전시회', src: 'https://via.placeholder.com/200x200?text=Art' },
  { id: 3, event: '독서 모임', src: 'https://via.placeholder.com/200x200?text=Books' },
  { id: 4, event: '커뮤니티 이벤트', src: 'https://via.placeholder.com/200x200?text=Community' },
]

export default function MiniHome() {
  const [selectedTab, setSelectedTab] = useState<'character' | 'reviews' | 'photos'>('character')

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-4xl font-bold text-gray-900">🏠 GO냥이의 미니홈</h1>

      {/* 캐릭터 상태 & 배경 */}
      <div className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 rounded-2xl p-8 text-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-2">GO냥이 ✨</h2>
            <p className="text-lg opacity-90 mb-4">레벨: 12 | 경험치: 8,450 / 10,000</p>
            
            {/* 경험치 바 */}
            <div className="bg-white/30 rounded-full h-4 mb-4">
              <div className="bg-white rounded-full h-4 w-4/5 shadow-lg"></div>
            </div>

            <div className="space-y-2 text-sm">
              <p>📊 총 참여 행사: 12개</p>
              <p>⭐ 평가 점수: 4.8/5.0</p>
              <p>🎖️ 획득 배지: 8개</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-4">
            {/* Go냥이 캐릭터 */}
            <div className="flex justify-center">
              <RiveCharacter
                stateMachine="happy"
                message="함께 재미있는 행사들을 즐기고 있어요!"
              />
            </div>

            {/* 리워드 섹션 */}
            <div className="bg-white/20 rounded-lg p-4 backdrop-blur">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5" />
                <h3 className="font-bold">리워드</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-2xl">🍪</div>
                  <p className="text-xs mt-1">쿠키: 245</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl">💎</div>
                  <p className="text-xs mt-1">크리스탈: 12</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl">🎟️</div>
                  <p className="text-xs mt-1">티켓: 3</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-4 border-b border-gray-200">
        {[
          { id: 'character', label: '📝 정보', icon: Trophy },
          { id: 'reviews', label: '💬 리뷰', icon: MessageCircle },
          { id: 'photos', label: '📸 갤러리', icon: Image },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setSelectedTab(id as typeof selectedTab)}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              selectedTab === id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="space-y-6">
        {/* 캐릭터 정보 탭 */}
        {selectedTab === 'character' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* 배지 */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">🎖️ 획득 배지</h3>
              <div className="grid grid-cols-4 gap-4">
                {[
                  '🏅', '⭐', '🎯', '🏃',
                  '📚', '🎨', '🧘', '🌟',
                ].map((badge, idx) => (
                  <div
                    key={idx}
                    className="col-span-1 bg-white rounded-lg p-4 flex items-center justify-center text-3xl shadow hover:shadow-lg transition-shadow"
                  >
                    {badge}
                  </div>
                ))}
              </div>
            </div>

            {/* 통계 */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">📊 통계</h3>
              <div className="space-y-4">
                {[
                  { label: '참여한 행사', value: 12, max: 50 },
                  { label: '작성한 리뷰', value: 11, max: 50 },
                  { label: '올린 사진', value: 34, max: 100 },
                  { label: '받은 하트', value: 248, max: 1000 },
                ].map((stat, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-gray-700">{stat.label}</span>
                      <span className="text-gray-600">{stat.value} / {stat.max}</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-primary-400 to-primary-600 rounded-full h-3 transition-all"
                        style={{ width: `${(stat.value / stat.max) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 리뷰 탭 */}
        {selectedTab === 'reviews' && (
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">💬 골골이의 리뷰</h3>
            {mockReviews.map((review) => (
              <Card key={review.id} title={review.event}>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {'⭐'.repeat(review.rating)}
                      {'☆'.repeat(5 - review.rating)}
                    </span>
                    <span className="text-sm text-gray-600">{review.rating}/5</span>
                  </div>
                  <p className="text-gray-700 text-sm">{review.comment}</p>
                  <p className="text-xs text-gray-500">{review.date}</p>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* 갤러리 탭 */}
        {selectedTab === 'photos' && (
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">📸 개인 갤러리</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {mockPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative group rounded-lg overflow-hidden shadow hover:shadow-xl transition-shadow cursor-pointer bg-gray-200"
                >
                  <img
                    src={photo.src}
                    alt={photo.event}
                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
                    <div className="w-full p-3 bg-gradient-to-t from-black/60 to-transparent text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      {photo.event}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 하단 정보 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex gap-3">
          <Heart className="w-6 h-6 text-blue-600 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">친구들에게 공유하기</h4>
            <p className="text-sm text-blue-700">
              GO냥이의 미니홈을 친구들과 공유하고 함께 행사에 참여해보세요!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
