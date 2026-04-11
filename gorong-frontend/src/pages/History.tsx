import React, { useState } from 'react'
import Button from '../components/Button'
import Card from '../components/Card'
import { useAuth } from '../contexts/AuthContext'
import { History, Calendar, MessageSquare, Heart, Star } from 'lucide-react'

const mockHistory = [
  {
    id: 1,
    type: 'event',
    title: '초보자 요가 클래스 참여',
    date: '2024-04-15',
    status: '완료',
    rating: 5,
    review: '정말 좋은 시간이었어요!',
  },
  {
    id: 2,
    type: 'review',
    title: '미술 전시회 리뷰 작성',
    date: '2024-04-12',
    status: '완료',
  },
  {
    id: 3,
    type: 'group',
    title: '요가 동행 모집 참여',
    date: '2024-04-10',
    status: '진행중',
  },
  {
    id: 4,
    type: 'post',
    title: '커뮤니티 게시글 작성',
    date: '2024-04-08',
    status: '완료',
  },
]

export default function HistoryPage() {
  const auth = useAuth()
  const [filter, setFilter] = useState<'all' | 'event' | 'review' | 'group' | 'post'>('all')

  const filteredHistory = filter === 'all'
    ? mockHistory
    : mockHistory.filter(item => item.type === filter)

  const getIcon = (type: string) => {
    switch (type) {
      case 'event': return <Calendar className="w-5 h-5" />
      case 'review': return <Star className="w-5 h-5" />
      case 'group': return <MessageSquare className="w-5 h-5" />
      case 'post': return <Heart className="w-5 h-5" />
      default: return <History className="w-5 h-5" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case '완료': return 'bg-green-100 text-green-800'
      case '진행중': return 'bg-blue-100 text-blue-800'
      case '대기중': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">📚 히스토리</h1>
          <p className="text-gray-600 mt-2">
            {auth.user?.nickname}님의 활동 기록을 확인하세요
          </p>
        </div>
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-2 overflow-x-auto">
        {[
          { id: 'all', label: '전체', count: mockHistory.length },
          { id: 'event', label: '행사 참여', count: mockHistory.filter(h => h.type === 'event').length },
          { id: 'review', label: '리뷰', count: mockHistory.filter(h => h.type === 'review').length },
          { id: 'group', label: '모집 참여', count: mockHistory.filter(h => h.type === 'group').length },
          { id: 'post', label: '게시글', count: mockHistory.filter(h => h.type === 'post').length },
        ].map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => setFilter(id as typeof filter)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              filter === id
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
            <span className="text-xs bg-white px-2 py-1 rounded-full">
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* 히스토리 리스트 */}
      <div className="space-y-4">
        {filteredHistory.map((item) => (
          <Card key={item.id}>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${
                item.type === 'event' ? 'bg-green-100 text-green-600' :
                item.type === 'review' ? 'bg-yellow-100 text-yellow-600' :
                item.type === 'group' ? 'bg-blue-100 text-blue-600' :
                'bg-purple-100 text-purple-600'
              }`}>
                {getIcon(item.type)}
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-500">{item.date}</p>
                    {item.review && (
                      <p className="text-sm text-gray-700 mt-2">"{item.review}"</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {item.rating && (
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= item.rating! ? 'text-yellow-400 fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredHistory.length === 0 && (
        <div className="text-center py-16">
          <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-xl text-gray-500">해당 카테고리의 기록이 없습니다.</p>
          <p className="text-gray-400 mt-2">더 많은 활동을 통해 기록을 쌓아보세요!</p>
        </div>
      )}

      {/* 통계 요약 */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600 mb-1">
              {mockHistory.filter(h => h.type === 'event').length}
            </div>
            <p className="text-sm text-gray-600">참여한 행사</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600 mb-1">
              {mockHistory.filter(h => h.type === 'review').length}
            </div>
            <p className="text-sm text-gray-600">작성한 리뷰</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600 mb-1">
              {mockHistory.filter(h => h.type === 'group').length}
            </div>
            <p className="text-sm text-gray-600">모집 참여</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600 mb-1">
              {mockHistory.filter(h => h.type === 'post').length}
            </div>
            <p className="text-sm text-gray-600">게시글 작성</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
