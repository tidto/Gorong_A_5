import React, { useState } from 'react'
import Button from '../components/Button'
import Input from '../components/Input'
import Card from '../components/Card'
import { useAuth } from '../contexts/AuthContext'
import { User, Settings, Bell, Shield, LogOut, Mail, Phone } from 'lucide-react'

export default function MyPage() {
  const auth = useAuth()
  const [activeTab, setActiveTab] = useState<'profile' | 'settings' | 'notifications'>('profile')
  const [profileData, setProfileData] = useState({
    nickname: auth.user?.nickname || '',
    email: auth.user?.email || '',
    phone: '',
    bio: '',
  })
  const [notifications, setNotifications] = useState({
    eventRecommendations: true,
    reviewReplies: true,
    groupInvites: true,
    systemUpdates: false,
    marketing: false,
  })

  const handleSaveProfile = () => {
    // 실제로는 API 호출
    alert('프로필이 저장되었습니다!')
  }

  const handleSaveNotifications = () => {
    // 실제로는 API 호출
    alert('알림 설정이 저장되었습니다!')
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">👤 마이페이지</h1>
          <p className="text-gray-600 mt-2">계정 정보 및 설정을 관리하세요</p>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'profile', label: '프로필 수정', icon: User },
          { id: 'settings', label: '계정 설정', icon: Settings },
          { id: 'notifications', label: '알림 설정', icon: Bell },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </button>
        ))}
      </div>

      {/* 프로필 수정 탭 */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl space-y-6">
          <Card title="기본 정보">
            <div className="space-y-4">
              <Input
                label="닉네임"
                value={profileData.nickname}
                onChange={(e) => setProfileData({ ...profileData, nickname: e.target.value })}
              />
              <Input
                label="이메일"
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              />
              <Input
                label="전화번호"
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                placeholder="010-0000-0000"
              />
              <Input
                label="자기소개"
                multiline
                rows={4}
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                placeholder="자신을 소개해주세요"
              />
            </div>
          </Card>

          <Card title="계정 상태">
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-gray-900">계정 인증 상태</span>
                </div>
                <span className="text-sm text-green-600 font-medium">인증 완료</span>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-gray-900">미성년자 여부</span>
                </div>
                <span className={`text-sm font-medium ${
                  auth.user?.isMinor ? 'text-orange-600' : 'text-green-600'
                }`}>
                  {auth.user?.isMinor ? '미성년자 (부모 인증 필요)' : '성인'}
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-gray-900">배리어프리 우선</span>
                </div>
                <span className={`text-sm font-medium ${
                  auth.user?.requiresBarrierFree ? 'text-purple-600' : 'text-gray-600'
                }`}>
                  {auth.user?.requiresBarrierFree ? '적용됨' : '미적용'}
                </span>
              </div>
            </div>
          </Card>

          <div className="flex gap-3">
            <Button onClick={handleSaveProfile}>변경사항 저장</Button>
            <Button variant="secondary">취소</Button>
          </div>
        </div>
      )}

      {/* 계정 설정 탭 */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl space-y-6">
          <Card title="비밀번호 변경">
            <div className="space-y-4">
              <Input
                label="현재 비밀번호"
                type="password"
                placeholder="현재 비밀번호를 입력하세요"
              />
              <Input
                label="새 비밀번호"
                type="password"
                placeholder="새 비밀번호를 입력하세요"
              />
              <Input
                label="새 비밀번호 확인"
                type="password"
                placeholder="새 비밀번호를 다시 입력하세요"
              />
              <Button>비밀번호 변경</Button>
            </div>
          </Card>

          <Card title="계정 관리">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                <div>
                  <h4 className="font-semibold text-red-900">계정 탈퇴</h4>
                  <p className="text-sm text-red-700">탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.</p>
                </div>
                <Button variant="secondary" className="border-red-300 text-red-700 hover:bg-red-100">
                  탈퇴하기
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 알림 설정 탭 */}
      {activeTab === 'notifications' && (
        <div className="max-w-2xl space-y-6">
          <Card title="알림 설정">
            <div className="space-y-4">
              {[
                { key: 'eventRecommendations', label: '행사 추천 알림', description: '관심사 기반 행사 추천을 받아보세요' },
                { key: 'reviewReplies', label: '리뷰 답글 알림', description: '내 리뷰에 답글이 달리면 알려드려요' },
                { key: 'groupInvites', label: '모집 초대 알림', description: '동행 모집 초대장을 받아보세요' },
                { key: 'systemUpdates', label: '시스템 업데이트', description: '앱 업데이트 및 중요 공지를 받아보세요' },
                { key: 'marketing', label: '마케팅 정보', description: '프로모션 및 이벤트 정보를 받아보세요' },
              ].map(({ key, label, description }) => (
                <div key={key} className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{label}</h4>
                    <p className="text-sm text-gray-600">{description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={notifications[key as keyof typeof notifications]}
                      onChange={(e) => setNotifications({
                        ...notifications,
                        [key]: e.target.checked
                      })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </Card>

          <Button onClick={handleSaveNotifications}>설정 저장</Button>
        </div>
      )}
    </div>
  )
}
