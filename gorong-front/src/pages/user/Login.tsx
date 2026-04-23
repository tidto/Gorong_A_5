import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/Button'
import { useAuth } from '../../contexts/AuthContext'
import { ShieldCheck, Accessibility } from 'lucide-react'
import { loginWithGoogle, loginWithGithub } from '../../api/authService'
import { checkUserStatus } from '../../api/userApi' // ⭐️ 새로 만든 함수 가져오기

export default function Login() {
  const navigate = useNavigate()
  const auth = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (auth.loggedIn) {
      navigate('/events', { replace: true })
    }
  }, [auth.loggedIn, navigate])

  // ⭐️ kakao를 github로 변경
  const handleSocialLogin = async (provider: 'google' | 'github') => {
    setIsLoading(true)
    try {
      let firebaseUser;
      
      // 1. Firebase 팝업 띄워서 인증
      if (provider === 'google') {
        firebaseUser = await loginWithGoogle();
      } else if (provider === 'github') {
        firebaseUser = await loginWithGithub();
      }

      if (!firebaseUser) throw new Error("인증 실패");

      // 2. Firebase 토큰 뽑아내기
      const idToken = await firebaseUser.getIdToken();

      // 3. 백엔드에 우리 회원인지 물어보기!
      const result = await checkUserStatus(idToken);

      // 4. 대망의 분기 처리 (라우팅)
      if (result.isRegistered) {
        // 기존 회원이면 Context 등에 유저 정보 저장 후 홈으로!
        // auth.login(result.user); (Context 사용 방식에 맞춰 수정하세요)
        alert(`${result.user.nickname}님, 환영합니다!`);
        navigate('/events', { replace: true });
      } else {
        // 신규 회원이면 추가 정보 화면으로! (이메일 등 Firebase 정보 들고 감)
        alert("고롱의 새로운 고양이시군요! 추가 정보를 입력해주세요.");
        navigate('/signup', { 
          state: { 
            email: firebaseUser.email, 
            firebaseUid: firebaseUser.uid 
          } 
        });
      }

    } catch (error) {
      console.error(`${provider} 로그인 실패:`, error)
      alert("로그인 처리 중 문제가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl shadow-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">로그인</h1>
        <p className="text-gray-600 mb-8">
          Go냥이와 함께 행사를 찾고, 참여 기록을 쌓아보세요.
        </p>

        <div className="space-y-4">
          
          {/* 구글 로그인 버튼 */}
          <Button
            type="button"
            variant="secondary"
            className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 flex items-center justify-center gap-2"
            onClick={() => handleSocialLogin('google')}
            disabled={isLoading}
          >
            {isLoading ? (
              '처리 중...'
            ) : (
              <>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-white">
                  <svg viewBox="0 0 533.5 544.3" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#4285F4" d="M533.5 278.4c0-17.7-1.6-35-4.6-51.8H272.1v98.1h146.7c-6.3 34.2-25.2 63.2-53.8 82.6v68.5h86.9c50.9-46.8 80.6-116 80.6-197.4z"/>
                    <path fill="#34A853" d="M272.1 544.3c72.6 0 133.7-24 178.2-65.3l-86.9-68.5c-24.1 16.2-54.8 25.8-91.3 25.8-70 0-129.3-47.2-150.5-110.7H33.4v69.7c44.7 88.1 136.6 149 238.7 149z"/>
                    <path fill="#FBBC05" d="M121.6 323.6c-10.4-31-10.4-64.4 0-95.4V158.5H33.4c-39.7 79.4-39.7 173.9 0 253.3l88.2-68.2z"/>
                    <path fill="#EA4335" d="M272.1 107.7c38.9 0 74 13.4 101.6 39.5l76.2-76.2C402.6 24.4 345 0 272.1 0 170 0 78.1 60.9 33.4 149l88.2 69.7C142.8 155 202.1 107.7 272.1 107.7z"/>
                  </svg>
                </span>
                구글로 로그인
              </>
            )}
          </Button>

          {/* ⭐️ 깃허브 로그인 버튼으로 교체 */}
          <Button
            type="button"
            className="w-full bg-[#24292F] text-white hover:bg-[#24292F]/90 focus:outline-none focus:ring-2 focus:ring-[#24292F] flex items-center justify-center gap-2"
            onClick={() => handleSocialLogin('github')}
            disabled={isLoading}
          >
            {isLoading ? (
              '처리 중...'
            ) : (
              <>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </span>
                깃허브로 로그인
              </>
            )}
          </Button>

          <p className="text-sm text-gray-500">
            첫 로그인 시 추가 정보 입력 페이지로 이동합니다.
          </p>
        </div>

        <div className="mt-8 space-y-4 text-sm text-gray-600">
          <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
            <ShieldCheck className="w-5 h-5 text-primary-600" />
            <div>
              <p className="font-semibold text-gray-900">미성년자 정보</p>
              <p>미성년자로 로그인하면 부모 인증 안내가 표시됩니다.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
            <Accessibility className="w-5 h-5 text-primary-600" />
            <div>
              <p className="font-semibold text-gray-900">배리어프리 추천</p>
              <p>체크하면 장애인 사용자에게 배리어프리 행사를 우선 추천합니다.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}