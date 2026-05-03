import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../api/axiosInstance';
import { ChevronRight, ChevronLeft, ChevronDown, ChevronUp, MapPin, Search, Check } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext'


// 관심사 목록 (interests 테이블 데이터 - DB 기준)
const INTERESTS = [
  { id: 2, code: 'A01', name: '자연', emoji: '🌿', desc: '산, 계곡, 해수욕장, 국립공원, 섬, 숲길' },
  { id: 3, code: 'A02', name: '인문', emoji: '🏛️', desc: '박물관, 미술관, 유적지, 사찰, 예술 공연' },
  { id: 4, code: 'A03', name: '레포츠', emoji: '🧗', desc: '등산, 낚시, 서핑, 골프, 스키, 번지점프' },
  { id: 5, code: 'A04', name: '쇼핑', emoji: '🛍️', desc: '전통시장, 면세점, 백화점, 공예품' },
  { id: 6, code: 'A05', name: '음식', emoji: '🍜', desc: '맛집, 카페거리, 전통주 체험, 사찰음식' },
  { id: 7, code: 'C01', name: '추천코스', emoji: '🗺️', desc: '가족 코스, 나홀로 여행, 데이트 코스' },
];

// 약관 목록
const TERMS = [
  {
    id: 'service',
    label: '[필수] 서비스 이용약관',
    required: true,
    content: `제1조 (목적)
본 약관은 고냥이 서비스(이하 "서비스")를 이용함에 있어 서비스 제공자와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (서비스의 제공)
① 서비스는 위치기반 고양이 행사 정보 제공, 그룹 모집 등의 기능을 제공합니다.
② 서비스는 연중무휴 24시간 제공을 원칙으로 하되, 시스템 점검 등의 사유로 일시 중단될 수 있습니다.

제3조 (이용자의 의무)
① 이용자는 타인의 개인정보를 도용하거나 허위 정보를 등록하여서는 아니 됩니다.
② 이용자는 서비스 내에서 타인에게 불쾌감을 주거나 명예를 훼손하는 행위를 하여서는 아니 됩니다.

제4조 (서비스 이용 제한)
서비스 제공자는 이용자가 본 약관을 위반할 경우 서비스 이용을 제한하거나 계정을 해지할 수 있습니다.`
  },
  {
    id: 'privacy',
    label: '[필수] 개인정보 처리방침',
    required: true,
    content: `1. 수집하는 개인정보 항목
- 필수: 이메일, 닉네임, 위치정보(주소)
- 선택: 프로필 이미지, 관심사

2. 개인정보 수집 및 이용 목적
- 서비스 제공 및 계정 관리
- 위치기반 행사 정보 맞춤 추천
- 서비스 개선 및 통계 분석

3. 개인정보 보유 및 이용 기간
- 회원 탈퇴 시까지 보유
- 단, 관계 법령에 따라 일정 기간 보존이 필요한 경우 해당 기간 동안 보관

4. 개인정보 제3자 제공
서비스 제공자는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
단, 법령에 의한 경우는 예외로 합니다.`
  },
  {
    id: 'location',
    label: '[필수] 위치기반서비스 이용약관',
    required: true,
    content: `제1조 (목적)
본 약관은 고냥이가 제공하는 위치기반서비스의 이용과 관련하여 필요한 사항을 규정합니다.

제2조 (위치정보 수집)
① 서비스는 이용자가 입력한 주소(행정구역 단위)를 기반으로 주변 행사 정보를 추천합니다.
② 위치정보는 서비스 제공 목적 이외에 사용되지 않습니다.

제3조 (위치정보 이용·제공)
① 수집된 위치정보는 근처 고양이 관련 행사, 모임 추천에 활용됩니다.
② 위치정보는 이용자의 동의 없이 제3자에게 제공되지 않습니다.

제4조 (위치정보 보호)
서비스는 위치정보를 안전하게 관리하기 위한 기술적·관리적 조치를 취합니다.

제5조 (서비스 해제 및 이용 제한)
이용자는 언제든지 위치기반서비스 이용에 대한 동의를 철회할 수 있습니다.`
  },
  {
    id: 'marketing',
    label: '[선택] 마케팅 정보 수신 동의',
    required: false,
    content: `1. 수신 동의 항목
- 이메일을 통한 행사 정보, 프로모션 안내
- 새로운 기능 및 서비스 업데이트 소식

2. 수신 동의 철회
- 언제든지 서비스 설정 또는 이메일 수신거부를 통해 철회 가능합니다.

3. 미동의 시 불이익
- 마케팅 정보 수신에 동의하지 않아도 서비스 이용에는 제한이 없습니다.`
  },
];

// Juso 주소 검색 결과 타입
interface JusoResult {
  roadAddr: string;
  jibunAddr: string;
  zipNo: string;
  entX: string; // 경도(longitude)
  entY: string; // 위도(latitude)
}

export default function Signup() {
  const navigate = useNavigate();
  const { firebaseUser, setUser } = useAuth();

  const [step, setStep] = useState(0); // 0: 약관, 1: 닉네임, 2: 주소, 3: 관심사
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // alert 대신 toast로 변경 (massage, signal type)
  const { toast } = useNotification()

  // 약관
  const [termAgreed, setTermAgreed] = useState<Record<string, boolean>>({
    service: false, privacy: false, location: false, marketing: false
  });
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);

  // 닉네임
  const [nickname, setNickname] = useState('');

  // 주소
  const [addressKeyword, setAddressKeyword] = useState('');
  const [addressResults, setAddressResults] = useState<JusoResult[]>([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [addressSearching, setAddressSearching] = useState(false);

  // 관심사
  const [selectedInterests, setSelectedInterests] = useState<number[]>([]);

  // 약관 전체 동의
  const allRequired = TERMS.filter(t => t.required).every(t => termAgreed[t.id]);
  const allChecked = TERMS.every(t => termAgreed[t.id]);

  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    TERMS.forEach(t => { next[t.id] = checked; });
    setTermAgreed(next);
  };

  // 주소 검색
  const searchAddress = async () => {
    if (!addressKeyword.trim()) return;
    setAddressSearching(true);
    setAddressResults([]);
    try {
      const key = import.meta.env.VITE_JUSO_API_KEY;
      const res = await fetch(
        `https://business.juso.go.kr/addrlink/addrLinkApi.do?currentPage=1&countPerPage=10&keyword=${encodeURIComponent(addressKeyword)}&confmKey=${key}&resultType=json`
      );
      const data = await res.json();
      setAddressResults(data?.results?.juso || []);
    } catch {
      setError('주소 검색 중 오류가 발생했습니다.');
    } finally {
      setAddressSearching(false);
    }
  };

  // 관심사 토글
  const toggleInterest = (id: number) => {
    setSelectedInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // 단계 이동
  const nextStep = () => {
    setError('');
    if (step === 0 && !allRequired) {
      setError('필수 약관에 모두 동의해 주세요.');
      return;
    }
    if (step === 1 && !nickname.trim()) {
      setError('닉네임을 입력해 주세요.');
      return;
    }
    if (step === 2 && !selectedAddress) {
      setError('주소를 선택해 주세요.');
      return;
    }
    setStep(s => s + 1);
  };

  // 최종 제출
  const handleSubmit = async () => {
    if (!firebaseUser) return setError('인증 정보가 없습니다. 다시 로그인해 주세요.');
    if (selectedInterests.length === 0) {
      setError('관심사를 1개 이상 선택해 주세요.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await axiosInstance.post('/v1/users/signup', {
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email,
        nickname,
        baseAddress: selectedAddress,
        latitude: selectedCoords?.lat,
        longitude: selectedCoords?.lng,
        isForeigner: false,
        barrierFreeType: 'NONE',
        interestIds: selectedInterests,
        gorongHz: null,
      });

      // 전역 상태 업데이트 (헤더에 로그인 반영)
      setUser({ nickname, email: firebaseUser.email ?? '' });
      toast(`${nickname}님, 고냥이에 오신 것을 환영합니다! 🐾`, 'success');
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['약관 동의', '닉네임', '주소', '관심사'];

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">

        {/* 상단 헤더 */}
        <div className="mb-6 text-center">
          <span className="text-4xl">🐾</span>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">프로필 완성하기</h1>
        </div>

        {/* 진행 단계 */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {stepLabels.map((label, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center gap-1">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all ${
                  i < step ? 'bg-green-500 text-white' :
                  i === step ? 'bg-primary-600 text-white' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {i < step ? <Check size={14} /> : i + 1}
                </div>
                <span className={`text-xs ${i === step ? 'font-semibold text-primary-600' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
              {i < stepLabels.length - 1 && (
                <div className={`mb-4 h-0.5 w-8 transition-all ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ─── STEP 0: 약관 동의 ─── */}
        {step === 0 && (
          <div className="space-y-3">
            {/* 전체 동의 */}
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-primary-50 p-4">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={e => toggleAll(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 accent-primary-600"
              />
              <span className="font-bold text-primary-800">전체 동의 (필수 + 선택)</span>
            </label>

            <div className="h-px bg-gray-100" />

            {TERMS.map(term => (
              <div key={term.id} className="rounded-2xl border border-gray-100 bg-gray-50">
                <div className="flex items-center gap-3 p-4">
                  <input
                    type="checkbox"
                    checked={!!termAgreed[term.id]}
                    onChange={e => setTermAgreed(prev => ({ ...prev, [term.id]: e.target.checked }))}
                    className="h-5 w-5 rounded border-gray-300 accent-primary-600"
                  />
                  <span className={`flex-1 text-sm font-medium ${term.required ? 'text-gray-800' : 'text-gray-500'}`}>
                    {term.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => setExpandedTerm(expandedTerm === term.id ? null : term.id)}
                    className="flex items-center gap-1 text-xs text-primary-600 hover:underline"
                  >
                    자세히
                    {expandedTerm === term.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
                {expandedTerm === term.id && (
                  <div className="mx-4 mb-4 max-h-40 overflow-y-auto rounded-xl bg-white p-4 text-xs leading-relaxed text-gray-600 whitespace-pre-line border border-gray-100">
                    {term.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ─── STEP 1: 닉네임 ─── */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">고냥이에서 사용할 닉네임을 입력해 주세요.</p>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="멋진 닉네임 (2~12자)"
              maxLength={12}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition focus:border-primary-500 focus:bg-white"
            />
            <p className="text-right text-xs text-gray-400">{nickname.length}/12</p>
          </div>
        )}

        {/* ─── STEP 2: 주소 ─── */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">주변 행사 추천을 위해 거주 주소를 입력해 주세요.</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={addressKeyword}
                onChange={e => setAddressKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchAddress()}
                placeholder="도로명 또는 지번 주소 입력"
                className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-primary-500 focus:bg-white"
              />
              <button
                type="button"
                onClick={searchAddress}
                disabled={addressSearching}
                className="flex items-center gap-1 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:bg-gray-300"
              >
                <Search size={16} />
                검색
              </button>
            </div>

            {/* 검색 결과 */}
            {addressResults.length > 0 && (
              <div className="max-h-52 overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
                {addressResults.map((addr, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setSelectedAddress(addr.roadAddr);
                      setSelectedCoords({ lat: parseFloat(addr.entY), lng: parseFloat(addr.entX) });
                      setAddressResults([]);
                      setAddressKeyword(addr.roadAddr);
                    }}
                    className="flex w-full flex-col gap-0.5 border-b border-gray-50 px-4 py-3 text-left hover:bg-primary-50 last:border-b-0"
                  >
                    <span className="flex items-center gap-1 text-sm font-medium text-gray-800">
                      <MapPin size={13} className="text-primary-500" />
                      {addr.roadAddr}
                    </span>
                    <span className="text-xs text-gray-400">{addr.jibunAddr}</span>
                  </button>
                ))}
              </div>
            )}

            {/* 선택된 주소 */}
            {selectedAddress && (
              <div className="flex items-center gap-2 rounded-2xl bg-green-50 px-4 py-3">
                <Check size={16} className="text-green-600" />
                <span className="text-sm font-medium text-green-800">{selectedAddress}</span>
              </div>
            )}

            <p className="text-xs text-gray-400">
              * 행정안전부 도로명주소 API를 통해 검색됩니다.
            </p>
          </div>
        )}

        {/* ─── STEP 3: 관심사 ─── */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">관심 있는 활동을 선택해 주세요. (1개 이상)</p>
            <div className="grid grid-cols-2 gap-3">
              {INTERESTS.map(interest => {
                const selected = selectedInterests.includes(interest.id);
                return (
                  <button
                    key={interest.id}
                    type="button"
                    onClick={() => toggleInterest(interest.id)}
                    className={`flex flex-col items-start gap-1 rounded-2xl border-2 p-4 text-left transition-all ${
                      selected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-100 bg-gray-50 hover:border-primary-200'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-2xl">{interest.emoji}</span>
                      {selected && <Check size={16} className="text-primary-600" />}
                    </div>
                    <span className="font-semibold text-gray-800">{interest.name}</span>
                    <span className="text-xs text-gray-400 leading-tight">{interest.desc}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-right text-xs text-gray-400">
              {selectedInterests.length}개 선택됨
            </p>
          </div>
        )}

        {/* 에러 */}
        {error && <p className="mt-4 text-sm font-medium text-red-500">{error}</p>}

        {/* 버튼 */}
        <div className="mt-6 flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => { setStep(s => s - 1); setError(''); }}
              className="flex items-center gap-1 rounded-2xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <ChevronLeft size={16} /> 이전
            </button>
          )}
          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-primary-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-primary-700"
            >
              다음 <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className={`flex-1 rounded-2xl py-3 text-sm font-bold text-white transition-all ${
                loading ? 'bg-gray-400' : 'bg-primary-600 shadow-sm hover:bg-primary-700'
              }`}
            >
              {loading ? '가입 처리 중...' : '🐾 고냥이 시작하기'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}