import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import MapView from '../components/MapView'
import Button from '../components/Button'
import IconLabel from '../components/IconLabel'
import RiveCharacter from '../components/RiveCharacter'
import AccessibilityBadge from '../components/AccessibilityBadge'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Clock, Users, MapPin } from 'lucide-react'

const mockEventDetails: Record<number, {
  title: string
  description: string
  date: string
  time: string
  location: string
  capacity: number
  difficulty: string
  barrierFree: boolean
  guideDog: boolean
  details: string
}> = {
  1: {
    title: '초보자 요가 클래스',
    description: '누구나 참여 가능한 기초 요가',
    date: '2024년 4월 15일 (월)',
    time: '10:00 AM - 11:30 AM',
    location: '커뮤니티 센터 - 요가실',
    capacity: 20,
    difficulty: 'Easy',
    barrierFree: true,
    guideDog: true,
    details: `
## 행사 상세 정보

### 📋 개요
초보자를 위한 기초 요가 클래스입니다. 신체의 유연성을 향상시키고 스트레스를 해소할 수 있습니다.

### 🎯 학습 목표
- 기본 요가 자세 배우기
- 호흡법 익히기
- 신체 이완 방법 습득

### 👥 참가 대상
- 요가 초보자
- 신체 건강을 원하는 모든 사람

### 📍 준비물
- 편한 스포츠 의류
- 요가 매트 (제공됨)
- 타올`,
  },
  2: {
    title: '하프 마라톤',
    description: '21km 마라톤 이벤트',
    date: '2024년 4월 20일 (토)',
    time: '06:00 AM 시작',
    location: '한강공원',
    capacity: 500,
    difficulty: 'Hard',
    barrierFree: false,
    guideDog: false,
    details: `
## 행사 상세 정보

### 📋 개요
21km의 거리에서 진행되는 마라톤 이벤트입니다.

### 🏃 코스
- 시작점: 한강공원 여의도 지구
- 코스 거리: 21km
- 난이도: Hard`,
  },
  3: {
    title: '미술 전시회',
    description: '현대 미술 작품 전시',
    date: '2024년 4월 - 5월',
    time: '10:00 AM - 06:00 PM',
    location: '갤러리 아트스페이스',
    capacity: -1,
    difficulty: 'Easy',
    barrierFree: true,
    guideDog: false,
    details: `
## 행사 상세 정보

### 📋 개요
현대 미술 작품들을 전시하는 추도 행사입니다.

### 🎨 전시 품목
- 회화
- 조각
- 설치 미술`,
  },
}

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const eventId = parseInt(id || '1', 10)
  const [characterState, setCharacterState] = useState<'idle' | 'happy' | 'thinking' | 'celebrating'>('idle')
  const [characterMessage, setCharacterMessage] = useState('')

  const auth = useAuth()
  const event = mockEventDetails[eventId] || mockEventDetails[1]

  const handleParticipate = () => {
    if (auth.user?.isMinor) {
      setCharacterMessage('미성년자는 부모 인증이 필요합니다.')
      setCharacterState('thinking')
      return
    }

    setCharacterMessage('동행 모집 페이지로 이동합니다.')
    setCharacterState('happy')
    setTimeout(() => navigate(`/events/${eventId}/join`), 600)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 뒤로가기 버튼 */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-6 font-medium"
      >
        <ArrowLeft className="w-5 h-5" />
        뒤로가기
      </button>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* 헤더 섹션 */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-8">
          <h1 className="text-4xl font-bold mb-2">{event.title}</h1>
          <p className="text-lg opacity-90">{event.description}</p>
        </div>

        <div className="p-8 space-y-8">
          {/* 주요 정보 */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Clock className="w-5 h-5" />
                <span className="font-semibold">날짜 & 시간</span>
              </div>
              <p className="text-sm text-gray-800">
                {event.date}
                <br />
                {event.time}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <MapPin className="w-5 h-5" />
                <span className="font-semibold">위치</span>
              </div>
              <p className="text-sm text-gray-800">{event.location}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Users className="w-5 h-5" />
                <span className="font-semibold">수용인원</span>
              </div>
              <p className="text-sm text-gray-800">
                {event.capacity > 0 ? `${event.capacity}명` : '무제한'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <span className="font-semibold text-gray-600">난이도</span>
              <p className="text-sm text-gray-800 mt-2">{event.difficulty}</p>
            </div>
          </div>

          {/* 지도 */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📍 행사 위치</h2>
            <MapView
              path={[
                { lat: 37.5665, lng: 126.978, label: '현재 위치' },
                { lat: 37.5572, lng: 126.9944, label: '행사 장소' },
              ]}
              markerColor="orange"
            />
          </div>

          {/* 접근성 정보 */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">♿ 접근성 정보</h2>
            <div className="flex flex-wrap gap-3 mb-4">
              {event.barrierFree && <IconLabel type="barrierFree" />}
              {event.guideDog && <IconLabel type="guideDog" />}
              {!event.barrierFree && <span className="text-sm text-gray-600">배리어프리 미제공</span>}
            </div>

            {/* 상세 접근성 배지 */}
            <div className="grid md:grid-cols-2 gap-4">
              <AccessibilityBadge
                type={event.barrierFree ? 'verified' : 'unavailable'}
                label="휠체어 접근성"
                description={event.barrierFree ? '휠체어 접근이 가능합니다' : '휠체어 접근이 제한될 수 있습니다'}
              />
              <AccessibilityBadge
                type={event.guideDog ? 'verified' : 'partial'}
                label="안내견 동반"
                description={event.guideDog ? '안내견과 함께 참여 가능합니다' : '사전 상담 필요'}
              />
              <AccessibilityBadge
                type="info"
                label="시각 장애인 지원"
                description="음성 안내 및 점자 자료 문의: 02-xxxx-xxxx"
              />
              <AccessibilityBadge
                type="info"
                label="청각 장애인 지원"
                description="수화 통역 및 자막 제공 가능 (사전 예약 필요)"
              />
            </div>
          </div>

          {/* 상세 정보 */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📖 상세 정보</h2>
            <div className="prose prose-sm max-w-none text-gray-700">
              {event.details.split('\n').map((line, idx) => (
                <div key={idx} className="mb-2">
                  {line.startsWith('#') ? (
                    <div className={line.startsWith('###') ? 'font-bold text-lg mt-4' : 'font-bold text-xl mt-4'}>
                      {line.replace(/^#+\s/, '')}
                    </div>
                  ) : line.startsWith('-') ? (
                    <div className="ml-4 text-gray-700">• {line.replace(/^-\s/, '')}</div>
                  ) : line.startsWith('- ') ? (
                    <div className="ml-4 text-gray-700">• {line.replace(/^- /, '')}</div>
                  ) : (
                    line && <div>{line}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Go냥이 캐릭터 & 참여 버튼 */}
          <div className="bg-gradient-to-br from-orange-50 to-white rounded-2xl p-8 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">🎯 이 행사 참여하기</h2>
                <p className="text-gray-600 mb-6">
                  Go냥이와 함께 이 행사에 참여해보세요! 새로운 경험과 추억을 만들 수 있습니다.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button onClick={() => navigate(`/events/${eventId}/join`)} variant="secondary" className="w-full">
                    동행 모집 보기
                  </Button>
                  <Button onClick={handleParticipate} className="w-full">
                    참여하기
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <RiveCharacter
                  stateMachine={characterState}
                  message={characterMessage}
                />
              </div>
            </div>

            {auth.user?.isMinor && (
              <div className="rounded-3xl bg-yellow-50 border border-yellow-200 p-4 text-yellow-900">
                미성년자는 부모 인증이 필요합니다. 신청 전 부모님과 상의해주세요.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
