import React, { useState, useEffect } from 'react'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Card from '../../components/Card'
import { useAuth } from '../../contexts/AuthContext'
import { User, Settings, Heart, Shield, Globe, MapPin, Thermometer, Radio, Accessibility } from 'lucide-react'

// 백엔드 엔티티 기반 타입 정의
type BarrierFreeType = 'NONE' | 'PHYSICAL' | 'VISUAL' | 'AUDITORY';

const INTERESTS = [
  { id: 2, code: 'A01', name: '자연', emoji: '🌿', desc: '산, 계곡, 해수욕장, 국립공원' },
  { id: 3, code: 'A02', name: '인문', emoji: '🏛️', desc: '박물관, 미술관, 유적지, 예술 공연' },
  { id: 4, code: 'A03', name: '레포츠', emoji: '🧗', desc: '등산, 낚시, 서핑, 캠핑' },
  { id: 5, code: 'A04', name: '쇼핑', emoji: '🛍️', desc: '전통시장, 면세점, 백화점' },
  { id: 6, code: 'A05', name: '음식', emoji: '🍜', desc: '맛집, 카페거리, 전통주' },
  { id: 7, code: 'C01', name: '추천코스', emoji: '🗺️', desc: '가족, 나홀로, 데이트 코스' },
];

export default function MyPage() {
  const auth = useAuth()
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'settings'>('profile')
  
  // 1. 프로필 데이터 상태 (UserProfile)
  const [profileData, setProfileData] = useState({
    nickname: auth.user?.nickname || '고롱이',
    email: auth.user?.email || 'user@example.com',
    baseAddress: '대구광역시 중구 동성로',
    purrTemperature: 38.5,
    gorongHz: '평온한 휴식',
  })

  // 2. 맞춤형 설정 데이터 상태 (User & UserInterests)
  // (실무에서는 이 부분을 useEffect + axios로 GET /api/v1/users/me 호출하여 덮어씁니다)
  const [prefData, setPrefData] = useState({
    barrierFreeType: 'NONE' as BarrierFreeType, // 테스트용으로 NONE 세팅 (DB값 연동 예정)
    isForeigner: false,
    selectedInterests: ['A01', 'A05'],
  })

  // 3. [에러 해결!] UI 전용 상태 (토글 스위치)
  // 처음엔 닫혀있다가(false), prefData가 세팅되면 그에 맞춰 변경되도록 구성
  const [needsAccessibility, setNeedsAccessibility] = useState<boolean>(false)

  // prefData의 barrierFreeType이 변경될 때마다 토글 상태 동기화
  useEffect(() => {
    setNeedsAccessibility(prefData.barrierFreeType !== 'NONE');
  }, [prefData.barrierFreeType]);

  const handleSaveProfile = () => {
    // TODO: PUT /api/v1/users/me/profile 등 API 호출
    alert('기본 정보가 저장되었습니다! 🐾')
  }

  const handleSavePreferences = () => {
    // TODO: PUT /api/v1/users/me/profile 등 API 호출 (맞춤형 설정 업데이트)
    console.log("저장될 맞춤형 데이터:", prefData);
    alert('맞춤형 설정이 저장되었습니다! 🐾')
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">👤 마이페이지</h1>
          <p className="text-gray-600 mt-2">나만의 고롱 주파수와 계정 정보를 관리하세요</p>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'profile', label: '기본 정보', icon: User },
          { id: 'preferences', label: '맞춤형 설정', icon: Heart },
          { id: 'settings', label: '계정 설정', icon: Settings },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === id
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </button>
        ))}
      </div>

      {/* 1. 기본 정보 탭 */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl space-y-6">
          <Card title="내 고롱 상태">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex flex-col items-center justify-center">
                <Thermometer className="w-8 h-8 text-orange-500 mb-2" />
                <span className="text-sm text-gray-600">나의 퍼르 온도</span>
                <span className="text-2xl font-bold text-orange-600">{profileData.purrTemperature}°C</span>
              </div>
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex flex-col items-center justify-center">
                <Radio className="w-8 h-8 text-indigo-500 mb-2" />
                <span className="text-sm text-gray-600">현재 주파수</span>
                <span className="text-xl font-bold text-indigo-600 mt-1">{profileData.gorongHz}</span>
              </div>
            </div>
          </Card>

          <Card title="기본 정보 수정">
            <div className="space-y-4">
              <Input
                label="닉네임"
                value={profileData.nickname}
                onChange={(e) => setProfileData({ ...profileData, nickname: e.target.value })}
              />
              <Input
                label="이메일 (소셜 로그인 계정)"
                type="email"
                value={profileData.email}
                disabled
              />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">활동 거점 주소 (Base Address)</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      value={profileData.baseAddress}
                      onChange={(e) => setProfileData({ ...profileData, baseAddress: e.target.value })}
                      placeholder="주소를 검색하세요"
                    />
                  </div>
                  <Button variant="secondary">주소 찾기</Button>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex gap-3">
            <Button onClick={handleSaveProfile}>변경사항 저장</Button>
          </div>
        </div>
      )}

      {/* 2. 맞춤형 설정 탭 */}
      {activeTab === 'preferences' && (
        <div className="max-w-2xl space-y-6">
          <Card title="이용 편의 설정">
            <div className="space-y-6">
              
              {/* 점진적 공개 형태의 배리어프리 설정 */}
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="flex flex-col">
                    <span className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <Accessibility className="w-4 h-4 text-indigo-600" />
                      접근성 맞춤 추천 (Barrier-Free)
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      이동 보조, 시청각 지원이 필요한 행사를 우선적으로 추천해 드립니다.
                    </span>
                  </div>
                  {/* 토글 스위치 */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={needsAccessibility}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setNeedsAccessibility(checked);
                        if (!checked) setPrefData({ ...prefData, barrierFreeType: 'NONE' });
                      }}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {/* 토글 ON 시에만 보여지는 라디오 버튼들 */}
                {needsAccessibility && (
                  <div className="mt-4 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 animate-fade-in-down">
                    <p className="text-sm font-medium text-gray-700 mb-3">어떤 지원이 우선적으로 필요하신가요?</p>
                    <div className="flex flex-col gap-2">
                      {[
                        { val: 'PHYSICAL', label: '이동 보조', desc: '휠체어 및 유아차 접근이 용이한 곳 (경사로, 엘리베이터 등)' },
                        { val: 'VISUAL', label: '시각 지원', desc: '음성 안내, 점자 블록 등이 제공되는 곳' },
                        { val: 'AUDITORY', label: '청각 지원', desc: '수어 통역, 자막 등 시각적 안내가 제공되는 곳' },
                      ].map((type) => (
                        <label 
                          key={type.val} 
                          className={`flex items-start p-3 cursor-pointer rounded-lg border transition-all ${
                            prefData.barrierFreeType === type.val 
                              ? 'border-indigo-500 bg-white shadow-sm ring-1 ring-indigo-500' 
                              : 'border-gray-200 bg-white/50 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center h-5">
                            <input
                              type="radio"
                              name="barrierFree"
                              className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                              checked={prefData.barrierFreeType === type.val}
                              onChange={() => setPrefData({ ...prefData, barrierFreeType: type.val as BarrierFreeType })}
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <span className="block font-bold text-gray-900">{type.label}</span>
                            <span className="block text-gray-500 text-xs mt-0.5">{type.desc}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 외국인 여부 */}
              <div className="pt-4 border-t border-gray-100">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Globe className="w-4 h-4" /> 외국인 참여자 (English services needed)
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    checked={prefData.isForeigner}
                    onChange={(e) => setPrefData({ ...prefData, isForeigner: e.target.checked })}
                  />
                </label>
              </div>
            </div>
          </Card>

          <Card title="관심 카테고리 (최대 5개)">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {INTERESTS.map((interest) => {
                const isSelected = prefData.selectedInterests.includes(interest.code);
                return (
                  <button
                    key={interest.code}
                    onClick={() => {
                      const current = prefData.selectedInterests;
                      if (isSelected) {
                        setPrefData({ ...prefData, selectedInterests: current.filter(c => c !== interest.code) });
                      } else if (current.length < 5) {
                        setPrefData({ ...prefData, selectedInterests: [...current, interest.code] });
                      } else {
                        alert('관심사는 최대 5개까지만 선택할 수 있습니다.');
                      }
                    }}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                      isSelected ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-2xl">{interest.emoji}</span>
                    <div>
                      <h4 className={`font-bold text-sm ${isSelected ? 'text-indigo-700' : 'text-gray-900'}`}>{interest.name}</h4>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{interest.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
            <p className="text-sm text-gray-500 mt-4">
              선택된 관심사: {prefData.selectedInterests.length}/5
            </p>
          </Card>

          <div className="flex gap-3">
            <Button onClick={handleSavePreferences}>설정 저장</Button>
          </div>
        </div>
      )}

      {/* 3. 계정 설정 탭 */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl space-y-6">
          <Card title="계정 관리">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                <div>
                  <h4 className="font-semibold text-red-900">계정 탈퇴</h4>
                  <p className="text-sm text-red-700">고롱 서비스에서 탈퇴하면 맞춤형 추천 기록이 모두 사라집니다.</p>
                </div>
                <Button variant="secondary" className="border-red-300 text-red-700 hover:bg-red-100">
                  탈퇴하기
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}