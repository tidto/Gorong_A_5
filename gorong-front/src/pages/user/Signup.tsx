import React, { useState, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Button from '../../components/Button'
import Input from '../../components/Input'
import { useAuth } from '../../contexts/AuthContext'
import { ShieldCheck, Mail, Lock, Calendar, MapPin, User, Heart, CheckCircle, X, ChevronRight } from 'lucide-react'

type SignupStep = 'terms' | 'basic' | 'age' | 'address' | 'profile' | 'interests' | 'complete' | 'disability'
type TermsType = 'service' | 'privacy' | 'location' | null;

// 약관 하드코딩 데이터 (실무에서는 백엔드나 CDN에서 불러오는 경우도 많습니다)
const TERMS_CONTENT = {
  service: {
    title: '(필수) 고롱(Gorong) 서비스 이용약관',
    content: `제 1 조 (목적)
본 약관은 고롱(Gorong)이 제공하는 대구/경북 지역 문화 행사 맞춤형 추천 서비스의 이용조건 및 절차, 이용자와 당사의 권리, 의무, 책임사항을 규정함을 목적으로 합니다.

제 2 조 (서비스의 제공)
당사는 이용자에게 행사 정보 제공, 커뮤니티 기능, 배리어프리 맞춤형 정보 등을 제공합니다.

제 3 조 (회원의 의무)
회원은 가입 시 정확한 정보를 제공해야 하며, 타인의 정보를 도용하거나 부적절한 행위를 할 경우 서비스 이용이 영구적으로 제한될 수 있습니다.`
  },
  privacy: {
    title: '(필수) 개인정보 수집 및 이용 동의',
    content: `1. 수집하는 개인정보 항목
- 필수항목: 이메일, 비밀번호, 닉네임, 생년월일
- 선택항목: 관심사, 거주지 주소, 배리어프리 필요 여부 및 장애 유형, 외국인 여부

2. 개인정보 수집 및 이용 목적
- 맞춤형 대구/경북 행사 추천 알고리즘 제공
- 불량 회원의 부정 이용 방지와 비인가 사용 방지

3. 개인정보의 보유 및 이용기간
원칙적으로 회원 탈퇴 시 지체 없이 파기합니다. (단, 관련 법령에 의거 보존할 필요가 있는 경우 해당 기간 동안 보존)`
  },
  location: {
    title: '(선택) 위치기반 서비스 이용 동의',
    content: `제 1 조 (목적)
본 약관은 회원의 현재 위치를 기반으로 대구 및 경북 지역의 가까운 행사, 축제, 팝업스토어 등의 정보를 제공하기 위해 위치정보를 수집하고 이용하는 데 필요한 사항을 규정합니다.

제 2 조 (위치정보 수집방법)
당사는 사용자의 스마트폰 GPS 기능, Wi-Fi, 기지국 기반 위치 기술을 사용하여 위치 정보를 수집합니다.

제 3 조 (동의 철회)
회원은 언제든지 앱 내 설정에서 위치기반 서비스 이용 동의를 철회할 수 있습니다.`
  }
};

export default function Signup() {
  const navigate = useNavigate()
  const location = useLocation()
  const auth = useAuth()
  const socialProvider = (location.state as { socialProvider?: string } | null)?.socialProvider
  const [currentStep, setCurrentStep] = useState<SignupStep>(socialProvider ? 'profile' : 'terms')
  
  // 약관 동의 상태 관리 (세분화)
  const [agreements, setAgreements] = useState({
    service: false,
    privacy: false,
    location: false,
  })
  
  // 현재 열려있는 모달 상태
  const [activeModal, setActiveModal] = useState<TermsType>(null)

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

  // 백엔드 코드 연동을 위해 임시로 코드 매핑 (이전 논의 컨텍스트 반영)
  const interestOptions = [
    { code: 'A01', name: '자연' },
    { code: 'A02', name: '인문(문화/예술)' },
    { code: 'C01', name: '요리/레시피' },
    { code: 'A03', name: '레포츠' },
    { code: 'B02', name: '숙박/캠핑' },
    { code: 'A04', name: '쇼핑' },
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
      // TODO: 실제 백엔드 연동 로직 (axiosInstance 활용 예정)
      if (socialProvider) {
        await auth.login(`${socialProvider}@example.com`, '', { isMinor: formData.isMinor, requiresBarrierFree: formData.requiresBarrierFree }, socialProvider)
        auth.updateUser({ nickname: formData.nickname, interests: formData.interests, isMinor: formData.isMinor, requiresBarrierFree: formData.requiresBarrierFree })
      } else {
        await auth.login(formData.email, formData.password, { isMinor: formData.isMinor, requiresBarrierFree: formData.requiresBarrierFree })
      }
      navigate('/events')
    } else {
      handleNext()
    }
  }

  // 전체 동의 핸들러
  const handleCheckAll = (checked: boolean) => {
    setAgreements({ service: checked, privacy: checked, location: checked })
  }

  // 개별 동의 상태 확인 (전체 동의 체크박스 연동용)
  const isAllChecked = agreements.service && agreements.privacy && agreements.location

  // 약관 모달 렌더링 컴포넌트
  const TermsModal = () => {
    if (!activeModal) return null;
    const { title, content } = TERMS_CONTENT[activeModal];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
          {/* 모달 헤더 */}
          <div className="flex justify-between items-center p-5 border-b border-gray-200">
            <h3 className="font-bold text-lg text-gray-900">{title}</h3>
            <button type="button" onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          {/* 모달 본문 (스크롤) */}
          <div className="p-5 overflow-y-auto whitespace-pre-wrap text-sm text-gray-600 leading-relaxed bg-gray-50">
            {content}
          </div>
          {/* 모달 푸터 */}
          <div className="p-4 border-t border-gray-200">
            <Button type="button" onClick={() => setActiveModal(null)} className="w-full">
              확인했습니다
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'terms':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">고롱 시작하기</h2>
              <p className="text-gray-500">서비스 이용을 위해 약관에 동의해주세요.</p>
            </div>

            <div className="space-y-4">
              {/* 전체 동의 박스 */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAllChecked}
                    onChange={(e) => handleCheckAll(e.target.checked)}
                    className="w-5 h-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                  />
                  <span className="font-bold text-gray-900">약관 전체 동의하기</span>
                </label>
              </div>

              {/* 개별 약관 리스트 */}
              <div className="space-y-3 px-2">
                {/* 이용약관 (필수) */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={agreements.service}
                      onChange={(e) => setAgreements({ ...agreements, service: e.target.checked })}
                      className="w-4 h-4 text-primary-600 rounded border-gray-300"
                    />
                    <span className="text-gray-700 text-sm">[필수] 고롱 서비스 이용약관</span>
                  </label>
                  <button type="button" onClick={() => setActiveModal('service')} className="text-gray-400 hover:text-gray-600 flex items-center text-sm">
                    보기 <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* 개인정보 (필수) */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={agreements.privacy}
                      onChange={(e) => setAgreements({ ...agreements, privacy: e.target.checked })}
                      className="w-4 h-4 text-primary-600 rounded border-gray-300"
                    />
                    <span className="text-gray-700 text-sm">[필수] 개인정보 수집 및 이용 동의</span>
                  </label>
                  <button type="button" onClick={() => setActiveModal('privacy')} className="text-gray-400 hover:text-gray-600 flex items-center text-sm">
                    보기 <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* 위치정보 (선택) */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={agreements.location}
                      onChange={(e) => setAgreements({ ...agreements, location: e.target.checked })}
                      className="w-4 h-4 text-primary-600 rounded border-gray-300"
                    />
                    <span className="text-gray-700 text-sm">[선택] 위치기반 서비스 이용 동의</span>
                  </label>
                  <button type="button" onClick={() => setActiveModal('location')} className="text-gray-400 hover:text-gray-600 flex items-center text-sm">
                    보기 <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            {/* 팝업 모달 렌더링 */}
            <TermsModal />
          </div>
        )

      case 'basic':
        // ... (기존 basic 로직 동일)
        return (
          <div className="space-y-4">
            <Input label="이메일" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="user@example.com" />
            <Input label="비밀번호" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="8자 이상 입력" />
            <Input label="비밀번호 확인" type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder="비밀번호 재입력" />
          </div>
        )

      // ... (age, address, profile, disability, complete 로직 기존과 동일하게 유지하여 생략 가능)
      case 'interests':
        return (
          <div className="space-y-4">
            <p className="text-gray-700">관심 있는 카테고리를 선택해주세요 (최대 5개)</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {interestOptions.map((opt) => (
                <label key={opt.code} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.interests.includes(opt.code)}
                    onChange={(e) => {
                      const newInterests = e.target.checked
                        ? [...formData.interests, opt.code]
                        : formData.interests.filter(i => i !== opt.code)
                      setFormData({ ...formData, interests: newInterests.slice(0, 5) })
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">{opt.name}</span>
                </label>
              ))}
            </div>
            <p className="text-sm text-gray-500">
              선택된 관심사: {formData.interests.length}/5
            </p>
          </div>
        )
      
      // 편의상 생략된 부분은 기존 코드를 그대로 유지하시면 됩니다.
      default:
        return null
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      // 필수 약관 두 가지가 모두 체크되어야만 다음으로 넘어갈 수 있음
      case 'terms': return agreements.service && agreements.privacy 
      case 'basic': return formData.email && formData.password && formData.password === formData.confirmPassword
      case 'age': return formData.birthYear !== ''
      case 'address': return formData.address !== ''
      case 'profile': return formData.nickname !== ''
      case 'interests': return formData.interests.length > 0
      case 'disability': return true
      case 'complete': return true
      default: return false
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl shadow-lg p-8 relative">
        {/* Progress Bar ... (기존과 동일) */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => {
              const isActive = step.id === currentStep
              const isCompleted = steps.findIndex(s => s.id === currentStep) > index
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-green-500 text-white' :
                    isActive ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs mt-2 ${isActive ? 'text-indigo-600 font-semibold' : 'text-gray-500'}`}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all"
              style={{ width: `${((steps.findIndex(s => s.id === currentStep) + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {socialProvider && (
            <div className="rounded-3xl bg-indigo-50 border border-indigo-100 p-4 text-sm text-indigo-700">
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