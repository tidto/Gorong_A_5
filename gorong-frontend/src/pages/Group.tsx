import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import { useAuth } from '../contexts/AuthContext'
import { Users, Plus, Search, Filter, CheckCircle, XCircle, Clock } from 'lucide-react'

const mockGroups = [
  {
    id: 1,
    title: '요가 클래스 동행 모집',
    host: '요가러버',
    event: '초보자 요가 클래스',
    participants: 2,
    maxParticipants: 4,
    status: '모집중',
    description: '함께 요가 클래스에 참여할 분들을 찾습니다.',
    meetingPoint: '커뮤니티 센터 입구',
    meetingDate: '2024-05-10',
    meetingTime: '10:00 AM',
    condition: 'none',
    flags: { disabled: false, disabledCompanion: false, foreigner: false, foreignerCompanion: false },
    requirements: ['요가에 관심 있는 분', '친절한 분'],
  },
  {
    id: 2,
    title: '미술 전시회 관람 동행',
    host: '미술애호가',
    event: '현대 미술 전시회',
    participants: 3,
    maxParticipants: 6,
    status: '모집중',
    description: '미술 작품에 대해 함께 이야기하며 관람하고 싶습니다.',
    meetingPoint: '갤러리 로비',
    meetingDate: '2024-05-12',
    meetingTime: '2:00 PM',
    condition: 'disabledCompanion',
    flags: { disabled: false, disabledCompanion: true, foreigner: false, foreignerCompanion: false },
    requirements: ['미술에 관심 있는 분', '대화 좋아하는 분'],
  },
  {
    id: 3,
    title: '독서 모임 참여자 모집',
    host: '책벌레',
    event: '커뮤니티 독서 모임',
    participants: 5,
    maxParticipants: 8,
    status: '마감',
    description: '고전 문학에 관심 있는 분들과 함께 토론하고 싶습니다.',
    meetingPoint: '도서관 세미나실',
    meetingDate: '2024-05-08',
    meetingTime: '7:00 PM',
    condition: 'foreigner',
    flags: { disabled: false, disabledCompanion: false, foreigner: true, foreignerCompanion: false },
    requirements: ['독서 좋아하는 분', '토론 좋아하는 분'],
  },
]

type GroupStatus = '모집중' | '마감' | '진행중'

export default function Group() {
  const navigate = useNavigate()
  const auth = useAuth()
  const [groups, setGroups] = useState(mockGroups)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<GroupStatus | '전체'>('전체')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newGroup, setNewGroup] = useState({
    title: '',
    event: '',
    description: '',
    maxParticipants: 4,
    meetingPoint: '',
    meetingDate: '',
    meetingTime: '',
    condition: '',
    requirements: [''],
    flags: {
      disabled: false,
      disabledCompanion: false,
      foreigner: false,
      foreignerCompanion: false,
    },
  })

  const eventOptions = Array.from(new Set(groups.map((group) => group.event)))

  const filteredGroups = groups.filter(group => {
    const matchesSearch = group.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         group.event.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === '전체' || group.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleApply = (groupId: number) => {
    setGroups(current =>
      current.map(group =>
        group.id === groupId
          ? { ...group, participants: group.participants + 1 }
          : group
      )
    )
    alert('참여 신청이 완료되었습니다!')
  }

  const handleCreateGroup = () => {
    if (!newGroup.title || !newGroup.event) return

    const group = {
      id: groups.length + 1,
      title: newGroup.title,
      host: auth.user?.nickname || '익명',
      event: newGroup.event,
      participants: 1,
      maxParticipants: newGroup.maxParticipants,
      status: '모집중' as GroupStatus,
      description: newGroup.description,
      meetingPoint: newGroup.meetingPoint,
      meetingDate: newGroup.meetingDate,
      meetingTime: newGroup.meetingTime,
      condition: newGroup.condition,
      flags: newGroup.flags,
      requirements: newGroup.requirements.filter(req => req.trim()),
    }

    setGroups([group, ...groups])
    setNewGroup({
      title: '',
      event: '',
      description: '',
      maxParticipants: 4,
      meetingPoint: '',
      meetingDate: '',
      meetingTime: '',
      condition: '',
      requirements: [''],
      flags: {
        disabled: false,
        disabledCompanion: false,
        foreigner: false,
        foreignerCompanion: false,
      },
    })
    setShowCreateForm(false)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">👥 모집게시판</h1>
          <p className="text-gray-600 mt-2">함께 행사에 참여할 동행자를 찾아보세요</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="w-4 h-4 mr-2" />
          모집글 작성
        </Button>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="모집글 제목 또는 행사명으로 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            {['전체', '모집중', '마감', '진행중'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as GroupStatus | '전체')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 모집글 작성 폼 */}
      {showCreateForm && (
        <Card title="모집글 작성">
          <div className="space-y-4">
            <Input
              label="제목"
              value={newGroup.title}
              onChange={(e) => setNewGroup({ ...newGroup, title: e.target.value })}
              placeholder="모집글 제목을 입력하세요"
            />
            <label className="block text-sm font-medium text-gray-700 mb-3">참여할 행사</label>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {eventOptions.map((event) => (
                <button
                  key={event}
                  type="button"
                  onClick={() => setNewGroup({ ...newGroup, event })}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
                    newGroup.event === event
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300'
                  }`}
                >
                  {event}
                </button>
              ))}
            </div>
            <select
              value={newGroup.event}
              onChange={(e) => setNewGroup({ ...newGroup, event: e.target.value })}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-primary-500 focus:outline-none"
            >
              <option value="">행사를 선택하세요</option>
              {eventOptions.map((event) => (
                <option key={event} value={event}>{event}</option>
              ))}
            </select>
            <Input
              label="설명"
              multiline
              rows={3}
              value={newGroup.description}
              onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
              placeholder="모집에 대한 자세한 설명을 입력하세요"
            />
            <div className="grid md:grid-cols-3 gap-4">
              <Input
                label="최대 인원"
                type="number"
                value={newGroup.maxParticipants.toString()}
                onChange={(e) => setNewGroup({ ...newGroup, maxParticipants: Number(e.target.value) })}
              />
              <Input
                label="모임 날짜"
                type="date"
                value={newGroup.meetingDate}
                onChange={(e) => setNewGroup({ ...newGroup, meetingDate: e.target.value })}
              />
              <Input
                label="집합 시간"
                type="time"
                value={newGroup.meetingTime}
                onChange={(e) => setNewGroup({ ...newGroup, meetingTime: e.target.value })}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">참여 조건</label>
                <select
                  value={newGroup.condition}
                  onChange={(e) => setNewGroup({ ...newGroup, condition: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-primary-500 focus:outline-none"
                >
                  <option value="">조건을 선택하세요</option>
                  <option value="none">제한 없음</option>
                  <option value="disabled">장애인</option>
                  <option value="foreigner">외국인</option>
                  <option value="disabledCompanion">장애인 동행 가능</option>
                  <option value="foreignerCompanion">외국인 동행 가능</option>
                </select>
              </div>
              <div className="space-y-2 rounded-2xl border border-gray-200 p-4">
                <p className="text-sm font-medium text-gray-700">요구사항</p>
                {(['disabled', 'disabledCompanion', 'foreigner', 'foreignerCompanion'] as const).map((flag) => (
                  <label key={flag} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={newGroup.flags[flag]}
                      onChange={(e) =>
                        setNewGroup({
                          ...newGroup,
                          flags: { ...newGroup.flags, [flag]: e.target.checked },
                        })
                      }
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    {flag === 'disabled' && '장애인'}
                    {flag === 'disabledCompanion' && '장애인 동행 가능'}
                    {flag === 'foreigner' && '외국인'}
                    {flag === 'foreignerCompanion' && '외국인 동행 가능'}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">요구사항</label>
              {newGroup.requirements.map((req, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    value={req}
                    onChange={(e) => {
                      const newReqs = [...newGroup.requirements]
                      newReqs[index] = e.target.value
                      setNewGroup({ ...newGroup, requirements: newReqs })
                    }}
                    placeholder="요구사항을 입력하세요"
                  />
                  {newGroup.requirements.length > 1 && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const newReqs = newGroup.requirements.filter((_, i) => i !== index)
                        setNewGroup({ ...newGroup, requirements: newReqs })
                      }}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="secondary"
                onClick={() => setNewGroup({ ...newGroup, requirements: [...newGroup.requirements, ''] })}
              >
                <Plus className="w-4 h-4 mr-2" />
                요구사항 추가
              </Button>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleCreateGroup}>모집글 등록</Button>
              <Button variant="secondary" onClick={() => setShowCreateForm(false)}>취소</Button>
            </div>
          </div>
        </Card>
      )}

      {/* 모집글 리스트 */}
      <div className="grid gap-6">
        {filteredGroups.map((group) => (
          <Card key={group.id} title={group.title}>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{group.event}</p>
                  <p className="text-sm text-gray-600">호스트: {group.host}</p>
                </div>
                <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                  group.status === '모집중'
                    ? 'bg-green-100 text-green-800'
                    : group.status === '진행중'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-700'
                }`}>
                  {group.status}
                </div>
              </div>

              <p className="text-gray-700">{group.description}</p>

              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-gray-900">참여 현황</p>
                  <p className="text-gray-600">
                    <Users className="w-4 h-4 inline mr-1" />
                    {group.participants} / {group.maxParticipants}명
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">집합 정보</p>
                  <p className="text-gray-600">
                    <Clock className="w-4 h-4 inline mr-1" />
                    {group.meetingDate} {group.meetingTime} - {group.meetingPoint}
                  </p>
                </div>
              </div>
              {group.condition && (
                <div className="text-sm text-gray-600">
                  <p className="font-semibold text-gray-900">참여 조건</p>
                  <p>{
                    group.condition === 'none' ? '제한 없음' :
                    group.condition === 'disabled' ? '장애인' :
                    group.condition === 'disabledCompanion' ? '장애인 동행 가능' :
                    group.condition === 'foreigner' ? '외국인' :
                    group.condition === 'foreignerCompanion' ? '외국인 동행 가능' :
                    group.condition
                  }</p>
                </div>
              )}
              {group.flags && (
                <div className="text-sm text-gray-600">
                  <p className="font-semibold text-gray-900">추가 조건</p>
                  <p>{[
                    group.flags.disabled ? '장애인' : null,
                    group.flags.disabledCompanion ? '장애인 동행 가능' : null,
                    group.flags.foreigner ? '외국인' : null,
                    group.flags.foreignerCompanion ? '외국인 동행 가능' : null,
                  ].filter(Boolean).join(' • ') || '없음'}</p>
                </div>
              )}

              {group.requirements.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-900 mb-2">요구사항</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {group.requirements.map((req, index) => (
                      <li key={index}>• {req}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() => handleApply(group.id)}
                  disabled={group.status !== '모집중' || group.participants >= group.maxParticipants}
                >
                  {group.status === '모집중' && group.participants < group.maxParticipants
                    ? '참여 신청'
                    : '모집 마감'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredGroups.length === 0 && (
        <div className="text-center py-16">
          <p className="text-xl text-gray-500">조건에 맞는 모집글이 없습니다.</p>
        </div>
      )}
    </div>
  )
}
