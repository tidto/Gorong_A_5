import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNotification } from '../../contexts/NotificationContext'
import axiosInstance from '../../api/axiosInstance'
import AddressSearchModal from '../../components/AddressSearchModal'
import {
  User, Settings, Heart, Globe, MapPin,
  Thermometer, Radio, Accessibility, ChevronRight,
  LogOut, Trash2, Check, Loader2
} from 'lucide-react'

type BarrierFreeType = 'NONE' | 'PHYSICAL' | 'VISUAL' | 'AUDITORY'

const INTERESTS = [
  { id: 2, code: 'NA', name: '자연관광', emoji: '🌿', desc: '산, 계곡, 해수욕장, 국립공원, 섬, 숲길' }, // A01 -> NA
  { id: 3, code: 'VE', name: '문화/역사', emoji: '🏛️', desc: '박물관, 미술관, 유적지, 사찰, 예술 공연' }, // A02 -> VE
  { id: 4, code: 'LS', name: '레포츠', emoji: '🧗', desc: '등산, 낚시, 서핑, 골프, 스키, 번지점프' },     // A03 -> LS
  { id: 5, code: 'SH', name: '쇼핑', emoji: '🛍️', desc: '전통시장, 면세점, 백화점, 공예품' },         // A04 -> SH
  { id: 6, code: 'FD', name: '음식', emoji: '🍜', desc: '맛집, 카페거리, 전통주 체험, 사찰음식' },       // A05 -> FD
  { id: 7, code: 'C01', name: '추천코스', emoji: '🗺️', desc: '가족 코스, 나홀로 여행, 데이트 코스' },    // 변경 없음
]

const BARRIER_FREE_OPTIONS = [
  { val: 'PHYSICAL', label: '이동 보조', desc: '휠체어 및 유아차 접근이 용이한 곳' },
  { val: 'VISUAL', label: '시각 지원', desc: '음성 안내, 점자 블록 등이 제공되는 곳' },
  { val: 'AUDITORY', label: '청각 지원', desc: '수어 통역, 자막 등 시각적 안내가 제공되는 곳' },
]

export default function MyPage() {
  const auth = useAuth()
  const { toast, confirm } = useNotification()
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'settings'>('profile')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)

  // 프로필 데이터
  const [profile, setProfile] = useState({
    nickname: '',
    email: '',
    baseAddress: '',
    purrTemperature: 38.5,
    gorongHz: '',
    barrierFreeType: 'NONE' as BarrierFreeType,
    isForeigner: false,
    interestCodes: [] as string[],
  })

  // 주소 좌표
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  // 데이터 불러오기
  useEffect(() => {
    const fetchMyPage = async () => {
      try {
        const res = await axiosInstance.get('/v1/users/me')
        setProfile(res.data)
      } catch {
        toast('내 정보를 불러오는 데 실패했습니다.', 'error')
      } finally {
        setIsLoading(false)
      }
    }
    fetchMyPage()
  }, [])

  // 저장
  const handleSave = async () => {
    setIsSaving(true)
    try {
      await axiosInstance.put('/v1/users/me/profile', {
        nickname: profile.nickname,
        baseAddress: profile.baseAddress,
        barrierFreeType: profile.barrierFreeType,
        isForeigner: profile.isForeigner,
        interestCodes: profile.interestCodes,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      })
      auth.setUser({ nickname: profile.nickname, email: profile.email, roleType: auth.user?.roleType })
      toast('저장됐습니다! 🐾', 'success')
    } catch {
      toast('저장 중 오류가 발생했습니다.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  // 로그아웃
  const handleLogout = async () => {
    const ok = await confirm({ message: '로그아웃 하시겠습니까?' })
    if (ok) auth.logout()
  }

  // 탈퇴
  const handleWithdraw = async () => {
    const ok = await confirm({
      message: '정말 탈퇴하시겠습니까?',
      description: '탈퇴 시 모든 정보가 삭제되며 복구가 불가능합니다.',
      confirmLabel: '탈퇴',
      danger: true,
    })
    if (ok) {
      // TODO: DELETE /api/v1/users/me
      toast('탈퇴 처리가 완료됐습니다.', 'info')
      auth.logout()
    }
  }

  const toggleInterest = (code: string) => {
    const current = profile.interestCodes
    if (current.includes(code)) {
      setProfile({ ...profile, interestCodes: current.filter(c => c !== code) })
    } else if (current.length < 5) {
      setProfile({ ...profile, interestCodes: [...current, code] })
    } else {
      toast('관심사는 최대 5개까지 선택할 수 있습니다.', 'warning')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    )
  }

  const tabs = [
    { id: 'profile', label: '기본 정보', icon: User },
    { id: 'preferences', label: '맞춤 설정', icon: Heart },
    { id: 'settings', label: '계정 관리', icon: Settings },
  ] as const

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">

      {/* 상단 프로필 카드 */}
      <div className="rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 p-6 mb-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">
            🐾
          </div>
          <div>
            <h1 className="text-2xl font-bold">{profile.nickname || '고롱이'}</h1>
            <p className="text-primary-100 text-sm mt-0.5">{profile.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="rounded-2xl bg-white/10 px-4 py-3 flex items-center gap-3">
            <Thermometer size={18} className="text-orange-300" />
            <div>
              <p className="text-xs text-primary-200">퍼르 온도</p>
              <p className="font-bold">{profile.purrTemperature}°C</p>
            </div>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 flex items-center gap-3">
            <Radio size={18} className="text-indigo-300" />
            <div>
              <p className="text-xs text-primary-200">고롱 주파수</p>
              <p className="font-bold text-sm">{profile.gorongHz || '미설정'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-6">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === id
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ─── 기본 정보 탭 ─── */}
      {activeTab === 'profile' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-900">기본 정보 수정</h2>

            {/* 닉네임 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">닉네임</label>
              <input
                type="text"
                value={profile.nickname}
                onChange={e => setProfile({ ...profile, nickname: e.target.value })}
                maxLength={12}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-primary-400 focus:bg-white"
              />
            </div>

            {/* 이메일 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">이메일</label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full rounded-2xl border border-gray-100 bg-gray-100 px-4 py-3 text-sm text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400">소셜 로그인 계정은 이메일 변경이 불가합니다.</p>
            </div>

            {/* 거주 주소 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">거주 주소</label>
              <button
                type="button"
                onClick={() => setShowAddressModal(true)}
                className={`w-full flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all ${
                  profile.baseAddress
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-dashed border-gray-300 bg-gray-50 hover:border-primary-300'
                }`}
              >
                <MapPin size={16} className={profile.baseAddress ? 'text-primary-500' : 'text-gray-400'} />
                <span className={`flex-1 text-sm ${profile.baseAddress ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                  {profile.baseAddress || '주소를 검색하세요'}
                </span>
                <span className="text-xs font-semibold text-primary-600 bg-primary-100 px-2.5 py-1 rounded-full">
                  {profile.baseAddress ? '변경' : '검색'}
                </span>
              </button>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all ${
              isSaving ? 'bg-gray-300' : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin mx-auto" /> : '저장하기'}
          </button>
        </div>
      )}

      {/* ─── 맞춤 설정 탭 ─── */}
      {activeTab === 'preferences' && (
        <div className="space-y-4">

          {/* 배리어프리 */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Accessibility size={18} className="text-primary-500" />
              접근성 맞춤 추천
            </h2>
            <p className="text-xs text-gray-500">이동 보조, 시청각 지원이 필요한 행사를 우선 추천해 드립니다.</p>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">접근성 지원 필요</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={profile.barrierFreeType !== 'NONE'}
                  onChange={e => {
                    if (!e.target.checked) setProfile({ ...profile, barrierFreeType: 'NONE' })
                    else setProfile({ ...profile, barrierFreeType: 'PHYSICAL' })
                  }}
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
              </label>
            </div>

            {profile.barrierFreeType !== 'NONE' && (
              <div className="space-y-2 pt-2">
                {BARRIER_FREE_OPTIONS.map(option => (
                  <label
                    key={option.val}
                    className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                      profile.barrierFreeType === option.val
                        ? 'border-primary-400 bg-primary-50'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="barrierFree"
                      className="mt-0.5 accent-primary-500"
                      checked={profile.barrierFreeType === option.val}
                      onChange={() => setProfile({ ...profile, barrierFreeType: option.val as BarrierFreeType })}
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{option.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{option.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* 외국인 여부 */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe size={18} className="text-primary-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">외국인 거주자</p>
                  <p className="text-xs text-gray-500">외국어 지원 행사를 우선 추천해 드립니다.</p>
                </div>
              </div>
              <input
                type="checkbox"
                className="w-5 h-5 accent-primary-500 rounded"
                checked={profile.isForeigner}
                onChange={e => setProfile({ ...profile, isForeigner: e.target.checked })}
              />
            </div>
          </div>

          {/* 관심사 */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">관심 카테고리</h2>
              <span className="text-xs text-gray-400">{profile.interestCodes.length}/5</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {INTERESTS.map(interest => {
                const selected = profile.interestCodes.includes(interest.code)
                return (
                  <button
                    key={interest.code}
                    onClick={() => toggleInterest(interest.code)}
                    className={`flex items-center gap-2 p-3 rounded-2xl border-2 text-left transition-all ${
                      selected
                        ? 'border-primary-400 bg-primary-50'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <span className="text-xl">{interest.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{interest.name}</p>
                    </div>
                    {selected && <Check size={14} className="text-primary-500 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all ${
              isSaving ? 'bg-gray-300' : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin mx-auto" /> : '설정 저장'}
          </button>
        </div>
      )}

      {/* ─── 계정 관리 탭 ─── */}
      {activeTab === 'settings' && (
        <div className="space-y-3">
          <div className="rounded-3xl border border-gray-100 bg-white overflow-hidden shadow-sm">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <LogOut size={18} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">로그아웃</span>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          </div>

          <div className="rounded-3xl border border-red-100 bg-white overflow-hidden shadow-sm">
            <button
              onClick={handleWithdraw}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-red-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Trash2 size={18} className="text-red-400" />
                <div className="text-left">
                  <p className="text-sm font-medium text-red-600">서비스 탈퇴</p>
                  <p className="text-xs text-red-400 mt-0.5">탈퇴 시 모든 정보가 삭제됩니다.</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-red-300" />
            </button>
          </div>
        </div>
      )}

      {/* 주소 검색 모달 */}
      {showAddressModal && (
        <AddressSearchModal
          onSelect={result => {
            setProfile({ ...profile, baseAddress: result.roadAddr })
            setCoords({
              lat: parseFloat(result.entY),
              lng: parseFloat(result.entX),
            })
            setShowAddressModal(false)
          }}
          onClose={() => setShowAddressModal(false)}
        />
      )}
    </div>
  )
}
