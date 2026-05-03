import React, { useState } from 'react'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Card from '../../components/Card'
import { User, Settings, LogOut, History, Palette } from 'lucide-react'
import { useNotification } from '../../contexts/NotificationContext'


const mockHistory = [
  { id: 1, type: 'joined', event: '초보자 요가 클래스', date: '2024-04-10' },
  { id: 2, type: 'reviewed', event: '미술 전시회', date: '2024-04-08' },
  { id: 3, type: 'joined', event: '커뮤니티 독서 모임', date: '2024-04-05' },
  { id: 4, type: 'shared', event: 'GO냥이 미니홈', date: '2024-04-03' },
  { id: 5, type: 'joined', event: '볼링 이벤트', date: '2024-04-01' },
]

export default function Profile() {
  const [selectedTab, setSelectedTab] = useState<'profile' | 'history' | 'character' | 'settings'>('profile')
  const [profileData, setProfileData] = useState({
    nickname: 'GoNyan Lover',
    email: 'user@example.com',
    bio: '함께 행사를 즐기는 것을 좋아합니다!',
  })
  const [characterColor, setCharacterColor] = useState('orange')
  const [isSaving, setIsSaving] = useState(false)

  const { toast } = useNotification()

  const handleSaveProfile = async () => {
    setIsSaving(true)
    // 실제로는 서버에 저장
    setTimeout(() => {
      setIsSaving(false)
      toast('프로필이 저장되었습니다!', 'success')
    }, 1000)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">👤 프로필</h1>

      {/* 탭 네비게이션 */}
      <div className="flex gap-2 mb-8 border-b border-gray-200 overflow-x-auto">
        {[
          { id: 'profile', label: '개인정보', icon: User },
          { id: 'history', label: '활동 히스토리', icon: History },
          { id: 'character', label: '캐릭터 꾸미기', icon: Palette },
          { id: 'settings', label: '설정', icon: Settings },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSelectedTab(id as typeof selectedTab)}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
              selectedTab === id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div>
        {/* 개인정보 탭 */}
        {selectedTab === 'profile' && (
          <div className="max-w-2xl space-y-6">
            <Card title="계정 정보">
              <div className="space-y-4">
                <Input
                  label="닉네임"
                  value={profileData.nickname}
                  onChange={(e) =>
                    setProfileData({ ...profileData, nickname: e.target.value })
                  }
                />
                <Input
                  label="이메일"
                  type="email"
                  value={profileData.email}
                  onChange={(e) =>
                    setProfileData({ ...profileData, email: e.target.value })
                  }
                />
                <Input
                  label="자기소개"
                  multiline
                  rows={4}
                  value={profileData.bio}
                  onChange={(e) =>
                    setProfileData({ ...profileData, bio: e.target.value })
                  }
                />
              </div>
            </Card>

            <div className="space-y-3">
              <Button onClick={handleSaveProfile} disabled={isSaving}>
                {isSaving ? '저장 중...' : '변경사항 저장'}
              </Button>
              <Button variant="secondary">
                비밀번호 변경
              </Button>
            </div>
          </div>
        )}

        {/* 활동 히스토리 탭 */}
        {selectedTab === 'history' && (
          <div className="max-w-4xl space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 활동 히스토리</h2>
            {mockHistory.map((item) => (
              <Card
                key={item.id}
                title={
                  item.type === 'joined'
                    ? '✅ 행사 참여'
                    : item.type === 'reviewed'
                      ? '📝 리뷰 작성'
                      : '🔄 공유'
                }
                description={item.event}
              >
                <p className="text-sm text-gray-600">{item.date}</p>
              </Card>
            ))}
          </div>
        )}

        {/* 캐릭터 꾸미기 탭 */}
        {selectedTab === 'character' && (
          <div className="max-w-2xl space-y-6">
            <Card title="GO냥이 꾸미기">
              <div className="space-y-8">
                {/* 색상 선택 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-4">
                    색상 선택
                  </label>
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { name: 'orange', hex: '#ff8c42', label: 'Orange' },
                      { name: 'purple', hex: '#a855f7', label: 'Purple' },
                      { name: 'blue', hex: '#3e7cb1', label: 'Blue' },
                      { name: 'green', hex: '#10b981', label: 'Green' },
                      { name: 'pink', hex: '#ec4899', label: 'Pink' },
                      { name: 'red', hex: '#ef4444', label: 'Red' },
                      { name: 'yellow', hex: '#f59e0b', label: 'Yellow' },
                      { name: 'indigo', hex: '#6366f1', label: 'Indigo' },
                    ].map((color) => (
                      <button
                        key={color.name}
                        onClick={() => setCharacterColor(color.name)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                          characterColor === color.name
                            ? 'border-gray-900 shadow-lg'
                            : 'border-gray-200'
                        }`}
                      >
                        <div
                          className="w-12 h-12 rounded-full shadow-md"
                          style={{ backgroundColor: color.hex }}
                        ></div>
                        <span className="text-xs font-medium text-gray-700">
                          {color.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 배경 선택 (NEW) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-4">
                    배경 선택
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { name: 'default', label: '기본', emoji: '🌅' },
                      { name: 'night', label: '야간', emoji: '🌙' },
                      { name: 'rain', label: '비 오는 날', emoji: '🌧️' },
                      { name: 'spring', label: '봄', emoji: '🌸' },
                      { name: 'summer', label: '여름', emoji: '☀️' },
                      { name: 'autumn', label: '가을', emoji: '🍂' },
                    ].map((bg) => (
                      <button
                        key={bg.name}
                        className="p-4 border-2 rounded-lg hover:border-primary-500 transition-all text-center"
                      >
                        <div className="text-3xl mb-2">{bg.emoji}</div>
                        <p className="text-xs font-medium text-gray-700">{bg.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 프리뷰 */}
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    미리보기
                  </p>
                  <div
                    className="w-32 h-32 rounded-full flex items-center justify-center text-6xl shadow-lg mx-auto"
                    style={{
                      backgroundColor: {
                        orange: '#ffefdc',
                        purple: '#faf5ff',
                        blue: '#f0f9ff',
                        green: '#f0fdf4',
                        pink: '#fdf2f8',
                        red: '#fef2f2',
                        yellow: '#fef9e7',
                        indigo: '#eef2ff',
                      }[characterColor] || '#ffefdc',
                    }}
                  >
                    😺
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex gap-2">
              <Button>변경사항 저장</Button>
              <Button variant="secondary">기본값으로 초기화</Button>
            </div>
          </div>
        )}

        {/* 설정 탭 */}
        {selectedTab === 'settings' && (
          <div className="max-w-2xl space-y-6">
            <Card title="알림 설정">
              <div className="space-y-3">
                {[
                  { label: '행사 추천 알림', description: '관심사 기반 행사 알림받기' },
                  { label: '댓글 알림', description: '내 리뷰에 댓글이 달릴 때' },
                  { label: '메시지 알림', description: '친구로부터 메시지' },
                ].map((item, idx) => (
                  <label key={idx} className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="mt-1" />
                    <div>
                      <div className="font-medium text-gray-900">{item.label}</div>
                      <div className="text-sm text-gray-600">{item.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </Card>

            <Card title="개인정보">
              <div className="space-y-3 text-sm text-gray-600">
                <p>
                  <strong className="text-gray-900">계정 생성:</strong> 2024년 3월 15일
                </p>
                <p>
                  <strong className="text-gray-900">마지막 로그인:</strong> 오늘 10:30 AM
                </p>
              </div>
            </Card>

            <Card title="위험한 작업">
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다.
                </p>
                <Button variant="secondary" className="text-red-600 hover:bg-red-50 w-full">
                  <LogOut className="w-4 h-4 mr-2" />
                  로그아웃
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
