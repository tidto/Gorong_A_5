import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/Button'
import { useAuth } from '../../contexts/AuthContext'
import { ShieldCheck, Accessibility } from 'lucide-react'
import { loginWithGoogle, loginWithGithub } from '../../api/authService'
import { checkUserStatus } from '../../api/userApi'
// ⭐️ 새롭게 추가된 Firebase 모듈 (경로는 실제 설정에 맞게 변경하세요)
import { auth } from '../../firebase/firebaseConfig' 
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'

export default function Login() {
  const navigate = useNavigate()
  const authContext = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  
  // ⭐️ 이메일, 비밀번호 상태 추가
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (authContext.loggedIn) {
      navigate('/events', { replace: true })
    }
  }, [authContext.loggedIn, navigate])

  // 기존 소셜 로그인 로직 (유지)
  const handleSocialLogin = async (provider: 'google' | 'github') => {
    setIsLoading(true)
    try {
      let firebaseUser;
      if (provider === 'google') {
        firebaseUser = await loginWithGoogle();
      } else if (provider === 'github') {
        firebaseUser = await loginWithGithub();
      }

      if (!firebaseUser) throw new Error("인증 실패");
      const idToken = await firebaseUser.getIdToken();
      const result = await checkUserStatus(idToken);

      if (result.isRegistered) {
        alert(`${result.user.nickname}님, 환영합니다!`);
        navigate('/events', { replace: true });
      } else {
        alert("고롱의 새로운 고양이시군요! 추가 정보를 입력해주세요.");
        navigate('/signup', { state: { email: firebaseUser.email, firebaseUid: firebaseUser.uid } });
      }
    } catch (error) {
      console.error(`${provider} 로그인 실패:`, error)
      alert("로그인 처리 중 문제가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  // ⭐️ 통합 이메일 로그인/회원가입 로직 추가
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      alert("이메일과 비밀번호를 모두 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. 먼저 로그인을 시도합니다.
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      
      // 2. 백엔드에 회원인지 확인
      const result = await checkUserStatus(idToken);
      
      if (result.isRegistered) {
        alert(`${result.user.nickname}님, 환영합니다!`);
        navigate('/events', { replace: true });
      } else {
         // Firebase 로그인은 성공했으나 백엔드 DB에 정보가 없는 경우 (회원가입 중도 이탈자)
        navigate('/signup', { state: { email: userCredential.user.email, firebaseUid: userCredential.user.uid } });
      }

    } catch (error: any) {
      // 3. 만약 로그인 실패 에러가 "존재하지 않는 계정"이나 "잘못된 인증정보"라면 회원가입 진행
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        const wantsToSignUp = window.confirm("가입되지 않은 이메일입니다. 이 정보로 새로 계정을 만드시겠습니까?");
        if (wantsToSignUp) {
          try {
            const newCredential = await createUserWithEmailAndPassword(auth, email, password);
            alert("기본 계정이 생성되었습니다. 추가 정보를 입력해주세요.");
            navigate('/signup', { state: { email: newCredential.user.email, firebaseUid: newCredential.user.uid } });
          } catch (signupError: any) {
            console.error("이메일 회원가입 실패:", signupError);
            if (signupError.code === 'auth/weak-password') alert("비밀번호는 6자리 이상이어야 합니다.");
            else alert("회원가입 중 오류가 발생했습니다.");
          }
        }
      } else if (error.code === 'auth/wrong-password') {
        alert("비밀번호가 틀렸습니다. 다시 확인해주세요.");
      } else {
        console.error("이메일 로그인 에러:", error);
        alert("로그인 처리 중 문제가 발생했습니다.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl shadow-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">계정 생성</h1>
        <p className="text-gray-600 mb-8">
          저희와 함께 하시게 되어 기쁩니다. 아래 양식을 작성하여 계정을 생성해 주세요.
        </p>

        <div className="space-y-4">
          {/* 소셜 로그인 버튼들 */}
          <Button
            type="button"
            variant="secondary"
            className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 flex items-center justify-center gap-2"
            onClick={() => handleSocialLogin('google')}
            disabled={isLoading}
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-white">
              {/* 구글 SVG 생략 (기존 코드 유지) */}
            </span>
            Google로 계속
          </Button>

          <Button
            type="button"
            className="w-full bg-[#24292F] text-white hover:bg-[#24292F]/90 focus:outline-none focus:ring-2 focus:ring-[#24292F] flex items-center justify-center gap-2"
            onClick={() => handleSocialLogin('github')}
            disabled={isLoading}
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm">
              {/* 깃허브 SVG 생략 (기존 코드 유지) */}
            </span>
            GitHub로 계속
          </Button>

          {/* 구분선 */}
          <div className="flex items-center my-6">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="mx-4 text-sm text-gray-400">또는</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          {/* ⭐️ 이메일/비밀번호 폼 */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일 주소를 입력하세요"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-4 bg-gray-900 text-white hover:bg-gray-800"
              disabled={isLoading}
            >
              {isLoading ? '처리 중...' : '계정 생성 / 로그인'}
            </Button>
          </form>
        </div>

        {/* 하단 안내 영역 (기존 코드 유지) */}
        {/* ... */}
      </div>
    </div>
  )
}