import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import IconLabel from '../components/IconLabel'
import { useAuth } from '../contexts/AuthContext'
import { Users, MessageCircle, Clock } from 'lucide-react'

const mockGroups = [
  {
    id: 1,
    title: '요가 동행 모집',
    host: '이수지 가이드',
    status: '모집중',
    participants: 3,
    target: 5,
    details: '편안한 속도로 같이 이동하며 가벼운 요가를 즐겨요.',
  },
  {
    id: 2,
    title: '미술 전시회 함께 관람',
    host: '김민수 큐레이터',
    status: '모집중',
    participants: 5,
    target: 10,
    details: '작품 설명과 함께 천천히 전시를 둘러봅니다.',
  },
  {
    id: 3,
    title: '커뮤니티 독서 모임',
    host: '박지연 리더',
    status: '마감',
    participants: 8,
    target: 8,
    details: '편안한 분위기에서 책을 읽고 소감을 나눕니다.',
  },
]

type JoinStatus = 'pending' | 'approved' | 'rejected' | null

type GroupItem = (typeof mockGroups)[number] & {
  requestStatus: JoinStatus
}

export default function GroupJoin() {
  const { id } = useParams()
  const navigate = useNavigate()
  const auth = useAuth()
  const [groups, setGroups] = useState<GroupItem[]>(
    mockGroups.map((group) => ({ ...group, requestStatus: null }))
  )
  const [feedback, setFeedback] = useState<string>('')

  const eventId = Number(id || 1)

  const handleApply = (groupId: number) => {
    setGroups((current) =>
      current.map((group) =>
        group.id === groupId
          ? { ...group, requestStatus: 'pending' }
          : group
      )
    )
    setFeedback('신청 요청을 보냈어요. 승인을 기다려보세요.')

    setTimeout(() => {
      const approved = Math.random() > 0.4
      setGroups((current) =>
        current.map((group) => {
          if (group.id !== groupId) return group
          return {
            ...group,
            requestStatus: approved ? 'approved' : 'rejected',
            status: approved ? '모집중' : '마감',
          }
        })
      )
      setFeedback(
        approved
          ? '축하합니다! 동행 신청이 승인되었습니다. 리뷰 작성으로 이동해보세요.'
          : '죄송합니다. 해당 모집은 승인되지 않았습니다. 다른 모집에 신청해보세요.'
      )
    }, 1500)
  }

  const selectedGroup = groups.find((group) => group.requestStatus === 'approved')

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">👥 동행 모집</h1>
          <p className="text-gray-600">
            함께 이동할 사람을 찾고, 승인/거절 여부를 확인하세요.
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          뒤로가기
        </Button>
      </div>

      {auth.user?.isMinor && (
        <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-4 text-yellow-900">
          <strong>부모 인증 필요:</strong> 미성년자는 참가 신청 전에 부모 인증을 완료해야 합니다.
        </div>
      )}

      {auth.user?.requiresBarrierFree && (
        <div className="rounded-2xl bg-green-50 border border-green-200 p-4 text-green-900">
          배리어프리 우선 추천이 적용된 모집 목록입니다.
        </div>
      )}

      <div className="grid gap-6">
        {groups.map((group) => (
          <Card key={group.id} title={group.title} description={group.details}>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Users className="w-5 h-5" />
                <span>{group.participants} / {group.target} 참여 중</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Clock className="w-5 h-5" />
                <span>{group.host}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <IconLabel type="barrierFree" />
                <IconLabel type="guideDog" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    group.status === '모집중'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {group.requestStatus === 'pending'
                    ? '신청 대기 중'
                    : group.status}
                </span>
                <Button
                  onClick={() => handleApply(group.id)}
                  disabled={group.status === '마감' || group.requestStatus === 'pending'}
                >
                  {group.status === '마감'
                    ? '모집 마감'
                    : group.requestStatus === 'pending'
                      ? '대기 중'
                      : '참여 신청'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {feedback && (
        <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4 text-blue-900">
          {feedback}
        </div>
      )}

      {selectedGroup && (
        <div className="bg-white rounded-3xl shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">참여 확정!</h2>
              <p className="text-gray-600">선택하신 동행 모집이 승인되었습니다.</p>
            </div>
            <Button onClick={() => navigate(`/events/${eventId}/review`)}>
              리뷰 작성하러 가기
            </Button>
          </div>
          <div className="text-gray-700">
            <p className="font-semibold">동행 모집명: {selectedGroup.title}</p>
            <p>호스트: {selectedGroup.host}</p>
            <p>참여 인원: {selectedGroup.participants}명</p>
          </div>
        </div>
      )}
    </div>
  )
}
