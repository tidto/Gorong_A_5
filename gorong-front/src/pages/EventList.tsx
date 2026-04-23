import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'
import IconLabel from '../components/IconLabel'
import { Filter } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const mockEventsList = [
  {
    id: 1,
    title: '초보자 요가 클래스',
    description: '누구나 참여 가능한 기초 요가',
    difficulty: 'Easy',
    distance: 0.5,
    barrierFree: true,
    guideDog: true,
  },
  {
    id: 2,
    title: '하프 마라톤',
    description: '21km 마라톤 이벤트',
    difficulty: 'Hard',
    distance: 2.3,
    barrierFree: false,
    guideDog: false,
  },
  {
    id: 3,
    title: '미술 전시회',
    description: '현대 미술 작품 전시',
    difficulty: 'Easy',
    distance: 1.2,
    barrierFree: true,
    guideDog: false,
  },
  {
    id: 4,
    title: '볼링 클럽',
    description: '친구들과 함께 즐기는 볼링',
    difficulty: 'Medium',
    distance: 0.8,
    barrierFree: true,
    guideDog: true,
  },
  {
    id: 5,
    title: '수영 레슨',
    description: '기초부터 배우는 수영 수업',
    difficulty: 'Medium',
    distance: 1.5,
    barrierFree: false,
    guideDog: false,
  },
  {
    id: 6,
    title: '독서 모임',
    description: '고전 문학 토론 모임',
    difficulty: 'Easy',
    distance: 0.3,
    barrierFree: true,
    guideDog: true,
  },
]

type DifficultyLevel = 'Easy' | 'Medium' | 'Hard' | 'All'

export default function EventList() {
  const navigate = useNavigate()
  const auth = useAuth()
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('All')
  const [maxDistance, setMaxDistance] = useState(5)
  const [barrierFreeOnly, setBarrierFreeOnly] = useState(auth.user?.requiresBarrierFree ?? false)

  const filteredEvents = useMemo(() => {
    return mockEventsList.filter((event) => {
      if (difficulty !== 'All' && event.difficulty !== difficulty) return false
      if (event.distance > maxDistance) return false
      if (barrierFreeOnly && !event.barrierFree) return false
      return true
    })
  }, [difficulty, maxDistance, barrierFreeOnly])

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">🎉 행사 둘러보기</h1>

      {/* 필터 섹션 */}
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-bold text-gray-900">필터</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* 난이도 필터 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              난이도
            </label>
            <div className="space-y-2">
              {['All', 'Easy', 'Medium', 'Hard'].map((level) => (
                <label key={level} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="difficulty"
                    value={level}
                    checked={difficulty === level}
                    onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700">{level}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 거리 필터 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              거리: {maxDistance}km 이내
            </label>
            <input
              type="range"
              min="0.5"
              max="10"
              step="0.5"
              value={maxDistance}
              onChange={(e) => setMaxDistance(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>0.5km</span>
              <span>10km</span>
            </div>
          </div>

          {/* 배리어프리 필터 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              접근성
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={barrierFreeOnly}
                onChange={(e) => setBarrierFreeOnly(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-gray-700">배리어프리만 보기</span>
            </label>
          </div>
        </div>

        {auth.user?.requiresBarrierFree && (
          <div className="rounded-3xl bg-green-50 border border-green-200 p-4 text-green-900 mb-6">
            배리어프리 우선 추천이 적용되어 있습니다. 필요시 필터를 조정하세요.
          </div>
        )}

        {/* Reset 버튼 */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={() => {
              setDifficulty('All')
              setMaxDistance(5)
              setBarrierFreeOnly(auth.user?.requiresBarrierFree ?? false)
            }}
          >
            필터 초기화
          </Button>
        </div>
      </div>

      {/* 행사 리스트 */}
      <div className="mb-4">
        <p className="text-gray-600">
          검색 결과: <span className="font-bold text-gray-900">{filteredEvents.length}</span>개
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event) => (
          <Card
            key={event.id}
            title={event.title}
            description={event.description}
            onClick={() => navigate(`/events/${event.id}`)}
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-gray-700">{event.difficulty}</span>
                <span className="text-gray-500">{event.distance}km</span>
              </div>

              {/* 접근성 표시 */}
              <div className="flex flex-wrap gap-2">
                {event.barrierFree && <IconLabel type="barrierFree" />}
                {event.guideDog && <IconLabel type="guideDog" />}
              </div>

              {/* 자세히보기 버튼 */}
              <Button
                variant="secondary"
                onClick={() => navigate(`/events/${event.id}`)}
                className="w-full"
              >
                자세히 보기
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-16">
          <p className="text-xl text-gray-500">조건에 맞는 행사가 없습니다.</p>
          <Button
            variant="primary"
            onClick={() => {
              setDifficulty('All')
              setMaxDistance(5)
              setBarrierFreeOnly(false)
            }}
            className="mt-4"
          >
            필터 초기화
          </Button>
        </div>
      )}
    </div>
  )
}
