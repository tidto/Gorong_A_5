import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

// 관심사 옵션 리스트
const INTEREST_OPTIONS = ['전시/미술', '팝업스토어', '카페/베이커리', '마켓/굿즈', '공연/강연', '봉사/모임'];

export default function Signup() {
  const navigate = useNavigate();
  const { firebaseUser } = useAuth();
  
  const [nickname, setNickname] = useState('');
  const [address, setAddress] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 관심사 다중 선택 토글 함수
  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nickname.trim()) return setError('닉네임을 입력해 주세요.');
    if (!address.trim()) return setError('주소(지역)를 입력해 주세요.');
    if (interests.length === 0) return setError('관심사를 최소 1개 이상 선택해 주세요.');
    if (!agreed) return setError('서비스 이용 약관에 동의해 주세요.');
    if (!firebaseUser) return setError('인증 정보가 없습니다. 다시 로그인해 주세요.');

    setLoading(true);
    setError('');

    try {
      // 💡 [핵심 보안] 현재 유저의 파이어베이스 ID 토큰을 가져옵니다.
      const idToken = await firebaseUser.getIdToken();

      // uid와 email은 제외하고 순수 입력 데이터만 전송하며, 토큰은 헤더에 담습니다.
      const response = await axios.post('http://98.84.85.31:8080/api/v1/users/signup', {
        nickname: nickname,
        address: address,      
        interests: interests,  
      }, {
        headers: {
          Authorization: `Bearer ${idToken}` // 신분 증명용 토큰
        }
      });

      if (response.status === 200 || response.status === 201) {
        alert(`${nickname}님, 환영합니다! 맞춤형 정보를 준비해 드릴게요.`);
        navigate('/');
      }
    } catch (err: any) {
      console.error('회원가입 에러:', err);
      setError(err.response?.data?.message || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <span className="text-4xl">🐾</span>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">프로필 완성하기</h1>
          <p className="mt-2 text-sm text-gray-500">Gorong에서 사용할 이름과 관심사를 알려주세요!</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-6">

          {/* 약관 동의 */}
          <div className="flex items-start gap-3 pt-2">
            <input
              id="terms"
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="terms" className="text-sm leading-relaxed text-gray-600">
              [필수] 고냥이 서비스 이용 약관 및 위치정보 수집·이용에 동의합니다.
            </label>
          </div>

          {/* 1. 닉네임 입력 */}
          <div>
            <label htmlFor="nickname" className="block text-sm font-semibold text-gray-700">
              닉네임 <span className="text-red-500">*</span>
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="멋진 닉네임을 입력하세요"
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition focus:border-primary-500 focus:bg-white"
              required
            />
          </div>

          {/* 2. 주소(지역) 설정 */}
          <div>
            <label htmlFor="address" className="block text-sm font-semibold text-gray-700">
              주 활동 지역 <span className="text-red-500">*</span>
            </label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="예: 서울특별시 강남구, 대구광역시 북구"
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition focus:border-primary-500 focus:bg-white"
              required
            />
            <p className="mt-1 text-xs text-gray-400">주변의 행사 정보를 정확하게 추천받기 위해 필요해요.</p>
          </div>

          {/* 3. 관심사 선택 (다중 선택 뱃지 UI) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">
              관심사 선택 (다중 선택 가능) <span className="text-red-500">*</span>
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                    interests.includes(interest)
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-primary-300 hover:bg-gray-50'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          

          {error && <p className="text-sm font-medium text-red-500">{error}</p>}

          {/* 가입 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-2xl py-4 text-lg font-bold text-white transition-all ${
              loading ? 'bg-gray-400' : 'bg-primary-500 shadow-lg shadow-primary-100 hover:bg-primary-600'
            }`}
          >
            {loading ? '가입 처리 중...' : 'Go냥이 시작하기'}
          </button>
        </form>
      </div>
    </div>
  );
}