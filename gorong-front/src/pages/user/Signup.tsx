import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../api/axiosInstance';

export default function Signup() {
  const navigate = useNavigate();
  const { firebaseUser } = useAuth();
  
  const [nickname, setNickname] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nickname.trim()) return setError('닉네임을 입력해 주세요.');
    if (!agreed) return setError('서비스 이용 약관에 동의해 주세요.');
    if (!firebaseUser) return setError('인증 정보가 없습니다. 다시 로그인해 주세요.');

    setLoading(true);
    setError('');

    try {
      // const idToken = await firebaseUser.getIdToken();

      // 인터셉트 Authorization 헤더 블록 자동 처리
      const response = await axiosInstance.post('/v1/users/signup', {
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email,
        nickname: nickname,
        gorongHz: "1Hz"
    });

      if (response.status === 200 || response.status === 201) {
        alert(`${nickname}님, 환영합니다!`);
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
      <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <span className="text-4xl">🐾</span>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">프로필 완성하기</h1>
          <p className="mt-2 text-sm text-gray-500">Gorong에서 사용할 이름을 알려주세요!</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-6">
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

          <div className="flex items-start gap-3 pt-2">
            <input
              id="terms"
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="terms" className="text-sm leading-relaxed text-gray-600">
              [필수] 고냥이 서비스 이용 약관에 동의합니다.
            </label>
          </div>

          {error && <p className="text-sm font-medium text-red-500">{error}</p>}

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