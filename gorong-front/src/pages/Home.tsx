import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RiveCharacter from '../components/RiveCharacter'
import MapView from '../components/MapView'
import Card from '../components/Card'
import Button from '../components/Button'
import IconLabel from '../components/IconLabel'
import { useAuth } from '../contexts/AuthContext'

const mockEvents = [
  {
    id: 1,
    title: '초보자 요가 클래스',
    description: '누구나 참여 가능한 기초 요가',
    difficulty: 'Easy',
    distance: '0.5km',
    image: '/gorong_logo.png',
    tags: ['요가', '운동'],
    accessible: true,
  },
  {
    id: 2,
    title: '커뮤니티 마라톤',
    description: '10km 마라톤 이벤트',
    difficulty: 'Medium',
    distance: '2.3km',
    image: '/gorong_logo.png',
    tags: ['스포츠', '달리기'],
    accessible: false,
  },
  {
    id: 3,
    title: '미술 전시회',
    description: '현대 미술 작품 전시',
    difficulty: 'Easy',
    distance: '1.2km',
    image: '/gorong_logo.png',
    tags: ['미술', '전시'],
    accessible: true,
  },
]

export default function Home() {
  const navigate = useNavigate()
  const auth = useAuth()
  const [characterState, setCharacterState] = useState<'idle' | 'happy' | 'excited' | 'thinking' | 'celebrating'>('idle')
  const [characterMessage, setCharacterMessage] = useState('')

  const recommendedEvents = useMemo(() => {
    const events = [...mockEvents]
    if (auth.user?.requiresBarrierFree) {
      return events.sort((a, b) => Number(b.accessible) - Number(a.accessible))
    }
    return events
  }, [auth.user])

  const handleEventClick = (eventId: number) => {
    navigate(`/events/${eventId}`)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Go냥이 캐릭터 섹션 */}
      <section className="bg-gradient-to-br from-orange-50 to-white rounded-2xl p-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              안녕, Go냥이야! 👋
            </h1>
            <p className="text-lg text-gray-600 mb-3">
              {auth.loggedIn
                ? `${auth.user?.nickname}님, 오늘은 어떤 행사를 찾고 계신가요?`
                : '함께 재미있는 행사와 동행을 찾아볼까요?'}
            </p>
            {auth.user?.requiresBarrierFree && (
              <div className="mb-4 rounded-3xl bg-green-50 border border-green-200 p-4 text-green-900">
                배리어프리 우선 추천을 적용했습니다. 안전한 행사를 먼저 보여드릴게요.
              </div>
            )}
            <Button onClick={() => navigate('/events')} className="text-lg">
              행사 둘러보기
            </Button>
          </div>
          <div className="flex-1 flex justify-center">
            <RiveCharacter
              stateMachine={characterState}
              message={characterMessage}
              onAnimationEnd={() => setCharacterState('idle')}
            />
          </div>
        </div>
      </section>

      {/* 지도 미리보기 */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">📍 주변 행사 지도</h2>
        <MapView
          path={[
            { lat: 37.5665, lng: 126.978, label: '우리 위치' },
            { lat: 37.5572, lng: 126.9944, label: '행사 장소' },
          ]}
        />
      </section>

      {/* 관심사 기반 행사 추천 */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🎯 추천 행사</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendedEvents.map((event) => (
            <Card
              key={event.id}
              title={event.title}
              description={event.description}
              image={event.image}
              tags={event.tags}
              onClick={() => handleEventClick(event.id)}
            >
              <div className="flex justify-between items-center text-sm text-gray-600 mb-3">
                <span className="font-medium">{event.difficulty}</span>
                <span>{event.distance}</span>
              </div>
              {event.accessible && (
                <div className="flex gap-2">
                  <IconLabel type="barrierFree" />
                </div>
              )}
            </Card>
          ))}
        </div>
      </section>

    </div>
  )
}
