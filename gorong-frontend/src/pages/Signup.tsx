import React, { useState, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Button from '../components/Button'
import Input from '../components/Input'
import { useAuth } from '../contexts/AuthContext'
import { ShieldCheck, Mail, Lock, Calendar, MapPin, User, Heart, CheckCircle } from 'lucide-react'

type SignupStep = 'terms' | 'basic' | 'age' | 'address' | 'profile' | 'interests' | 'complete' | 'disability'

export default function Signup() {
  const navigate = useNavigate()
  const location = useLocation()
  const auth = useAuth()
  const socialProvider = (location.state as { socialProvider?: string } | null)?.socialProvider
  const [currentStep, setCurrentStep] = useState<SignupStep>(socialProvider ? 'profile' : 'terms')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    birthYear: '',
    address: '',
    interests: [] as string[],
    isMinor: false,
    requiresBarrierFree: false,
    isForeigner: false,
    disabilityType: '',
  })
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const defaultSteps = [
    { id: 'terms', label: '약관 동의', icon: ShieldCheck },
    { id: 'basic', label: '기본 정보', icon: Mail },
    { id: 'age', label: '나이 인증', icon: Calendar },
    { id: 'address', label: '주소 설정', icon: MapPin },
    { id: 'profile', label: '프로필 설정', icon: User },
    { id: 'interests', label: '관심 카테고리', icon: Heart },
    { id: 'disability', label: '장애인 인증', icon: CheckCircle },
    { id: 'complete', label: '가입 완료', icon: CheckCircle },
  ]

  const socialSteps = [
    { id: 'profile', label: '프로필 설정', icon: User },
    { id: 'interests', label: '관심 카테고리', icon: Heart },
    { id: 'disability', label: '참여 조건', icon: CheckCircle },
    { id: 'complete', label: '가입 완료', icon: CheckCircle },
  ]

  const steps = socialProvider ? socialSteps : defaultSteps

  const interestOptions = [
    '요가', '스포츠', '미술', '독서', '음악', '요리', '여행', '교육',
    '봉사활동', '게임', '사진', '영화', '공예', '정원', '반려동물'
  ]

  const handleNext = () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id as SignupStep)
    }
  }

  const handlePrev = () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id as SignupStep)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (currentStep === 'complete') {
      if (socialProvider) {
        await auth.login(
          `${socialProvider}@example.com`,
          '',
          {
            isMinor: formData.isMinor,
            requiresBarrierFree: formData.requiresBarrierFree,
          },
          socialProvider
        )
        auth.updateUser({
          nickname: formData.nickname,
          interests: formData.interests,
          isMinor: formData.isMinor,
          requiresBarrierFree: formData.requiresBarrierFree,
        })
      } else {
        await auth.login(formData.email, formData.password, {
          isMinor: formData.isMinor,
          requiresBarrierFree: formData.requiresBarrierFree,
        })
      }
      navigate('/events')
    } else {
      handleNext()
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'terms':
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">서비스 이용약관</h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p>1. 본 서비스는 행사 참여 및 커뮤니티 활동을 위한 플랫폼입니다.</p>
                <p>2. 회원은 정확한 정보를 제공해야 합니다.</p>
                <p>3. 부적절한 행위 시 서비스 이용이 제한될 수 있습니다.</p>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-gray-700">약관에 동의합니다</span>
            </label>
          </div>
        )

      case 'basic':
        return (
          <div className="space-y-4">
            <Input
              label="이메일"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="user@example.com"
            />
            <Input
              label="비밀번호"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="8자 이상 입력"
            />
            <Input
              label="비밀번호 확인"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="비밀번호 재입력"
            />
          </div>
        )

      case 'age':
        return (
          <div className="space-y-4">
            <Input
              label="출생년도"
              type="number"
              value={formData.birthYear}
              onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })}
              placeholder="예: 1990"
            />
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                만 14세 미만은 보호자 동의가 필요합니다.
                만 19세 미만은 미성년자로 분류됩니다.
              </p>
            </div>
          </div>
        )

      case 'address':
        return (
          <div className="space-y-4">
            <Input
              label="주소"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="서울시 강남구 역삼동"
            />
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                주소 정보는 행사 추천 및 위치 기반 서비스에 사용됩니다.
              </p>
            </div>
          </div>
        )

      case 'profile':
        return (
          <div className="space-y-4">
            <Input
              label="닉네임"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              placeholder="Go냥이"
            />
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-800">
                닉네임은 다른 사용자에게 표시되며, 언제든지 변경할 수 있습니다.
              </p>
            </div>
          </div>
        )

      case 'interests':
        return (
          <div className="space-y-4">
            <p className="text-gray-700">관심 있는 카테고리를 선택해주세요 (최대 5개)</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {interestOptions.map((interest) => (
                <label key={interest} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.interests.includes(interest)}
                    onChange={(e) => {
                      const newInterests = e.target.checked
                        ? [...formData.interests, interest]
                        : formData.interests.filter(i => i !== interest)
                      setFormData({ ...formData, interests: newInterests.slice(0, 5) })
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">{interest}</span>
                </label>
              ))}
            </div>
            <p className="text-sm text-gray-500">
              선택된 관심사: {formData.interests.length}/5
            </p>
          </div>
        )

      case 'disability':
        return (
          <div className="space-y-4">
            <p className="text-gray-700 mb-4">장애인 인증 (선택사항)</p>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="disability"
                  value=""
                  checked={!formData.requiresBarrierFree}
                  onChange={() => setFormData({ ...formData, requiresBarrierFree: false, disabilityType: '' })}
                  className="w-4 h-4"
                />
                <span className="text-gray-700">해당 없음</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="disability"
                  value="mobility"
                  checked={formData.requiresBarrierFree && formData.disabilityType === 'mobility'}
                  onChange={() => setFormData({ ...formData, requiresBarrierFree: true, disabilityType: 'mobility' })}
                  className="w-4 h-4"
                />
                <span className="text-gray-700">지체장애</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="disability"
                  value="visual"
                  checked={formData.requiresBarrierFree && formData.disabilityType === 'visual'}
                  onChange={() => setFormData({ ...formData, requiresBarrierFree: true, disabilityType: 'visual' })}
                  className="w-4 h-4"
                />
                <span className="text-gray-700">시각장애</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="disability"
                  value="hearing"
                  checked={formData.requiresBarrierFree && formData.disabilityType === 'hearing'}
                  onChange={() => setFormData({ ...formData, requiresBarrierFree: true, disabilityType: 'hearing' })}
                  className="w-4 h-4"
                />
                <span className="text-gray-700">청각장애</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isForeigner}
                  onChange={(e) => setFormData({ ...formData, isForeigner: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-gray-700">외국인 참여자</span>
              </label>
            </div>
          </div>
        )

      case 'complete':
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">가입 완료!</h3>
              <p className="text-gray-600">
                {formData.nickname}님, Go냥이와 함께 즐거운 행사 참여를 시작해보세요!
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-left">
              <h4 className="font-semibold mb-2">가입 정보</h4>
              <p className="text-sm text-gray-600">이메일: {formData.email}</p>
              <p className="text-sm text-gray-600">닉네임: {formData.nickname}</p>
              <p className="text-sm text-gray-600">관심사: {formData.interests.join(', ')}</p>
              {formData.requiresBarrierFree && (
                <p className="text-sm text-gray-600">배리어프리 우선 추천: 적용</p>
              )}
              {formData.isForeigner && (
                <p className="text-sm text-gray-600">외국인 참여자: 포함</p>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 'terms': return agreedToTerms
      case 'basic': return formData.email && formData.password && formData.password === formData.confirmPassword
      case 'age': return formData.birthYear
      case 'address': return formData.address
      case 'profile': return formData.nickname
      case 'interests': return formData.interests.length > 0
      case 'disability': return true
      case 'complete': return true
      default: return false
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl shadow-lg p-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => {
              const isActive = step.id === currentStep
              const isCompleted = steps.findIndex(s => s.id === currentStep) > index
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-green-500 text-white' :
                    isActive ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs mt-2 ${isActive ? 'text-primary-600 font-semibold' : 'text-gray-500'}`}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-500 h-2 rounded-full transition-all"
              style={{ width: `${((steps.findIndex(s => s.id === currentStep) + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {socialProvider && (
            <div className="rounded-3xl bg-primary-50 border border-primary-100 p-4 text-sm text-primary-700">
              {socialProvider === 'kakao' ? '카카오 로그인' : '구글 로그인'}으로 연결되었습니다.
              추가 프로필 정보를 입력하면 가입이 완료됩니다.
            </div>
          )}
          {renderStepContent()}

          <div className="flex gap-4 pt-6 border-t border-gray-200">
            {currentStep !== 'terms' && currentStep !== 'complete' && (
              <Button type="button" variant="secondary" onClick={handlePrev} className="flex-1">
                이전
              </Button>
            )}
            <Button type="submit" disabled={!canProceed()} className="flex-1">
              {currentStep === 'complete' ? '시작하기' : '다음'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
