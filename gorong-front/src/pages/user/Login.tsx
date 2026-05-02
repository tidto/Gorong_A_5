import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/Button'
import { useAuth } from '../../contexts/AuthContext'
import { ShieldCheck, Accessibility } from 'lucide-react'
import { checkUserStatus } from '../../api/userApi'
import { auth } from '../../firebase/firebaseConfig'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { getLoginRedirectResult, loginWithGoogle, loginWithGithub } from '../../api/authService'

export default function Login() {
  const navigate = useNavigate()
  const authContext = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (authContext.loggedIn) {
      navigate('/events', { replace: true })
    }
  }, [authContext.loggedIn, navigate])

  // 리다이렉트 결과 처리 (소셜 로그인 후 돌아왔을 때)
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getLoginRedirectResult()
        if (!result) return

        setIsLoading(true)
        const idToken = await result.user.getIdToken()
        const loginResult = await checkUserStatus(idToken)

        if (loginResult.isRegistered && loginResult.user) {
          authContext.setUser(loginResult.user ?? null)
          alert(`${loginResult.user.nickname}님, 환영합니다!`)
          navigate('/events', { replace: true })
        } else {
          navigate('/signup', {
            state: { email: result.user.email, firebaseUid: result.user.uid }
          })
        }
      } catch (error) {
        console.error('리다이렉트 로그인 처리 실패:', error)
      } finally {
        setIsLoading(false)
      }
    }

    handleRedirectResult()
  }, [])

  // 소셜 로그인 (리다이렉트 시작)
  const handleSocialLogin = (provider: 'google' | 'github') => {
    if (provider === 'google') loginWithGoogle()
    else loginWithGithub()
  }

  // 이메일/비밀번호 로그인 및 회원가입
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      alert('이메일과 비밀번호를 모두 입력해주세요.')
      return
    }

    setIsLoading(true)
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const idToken = await userCredential.user.getIdToken()
      const result = await checkUserStatus(idToken)

      if (result.isRegistered && result.user) {
        authContext.setUser(result.user ?? null)
        alert(`${result.user.nickname}님, 환영합니다!`)
        navigate('/events', { replace: true })
      } else {
        navigate('/signup', {
          state: { email: userCredential.user.email, firebaseUid: userCredential.user.uid }
        })
      }
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        const wantsToSignUp = window.confirm('가입되지 않은 이메일입니다. 이 정보로 새로 계정을 만드시겠습니까?')
        if (wantsToSignUp) {
          try {
            const newCredential = await createUserWithEmailAndPassword(auth, email, password)
            alert('기본 계정이 생성되었습니다. 추가 정보를 입력해주세요.')
            navigate('/signup', {
              state: { email: newCredential.user.email, firebaseUid: newCredential.user.uid }
            })
          } catch (signupError: any) {
            console.error('이메일 회원가입 실패:', signupError)
            if (signupError.code === 'auth/weak-password') alert('비밀번호는 6자리 이상이어야 합니다.')
            else alert('회원가입 중 오류가 발생했습니다.')
          }
        }
      } else if (error.code === 'auth/wrong-password') {
        alert('비밀번호가 틀렸습니다. 다시 확인해주세요.')
      } else {
        console.error('이메일 로그인 에러:', error)
        alert('로그인 처리 중 문제가 발생했습니다.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl shadow-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">계정 생성</h1>
        <p className="text-gray-600 mb-8">
          저희와 함께 하시게 되어 기쁩니다. 아래 양식을 작성하여 계정을 생성해 주세요.
        </p>

        <div className="space-y-4">
          <Button
            type="button"
            variant="secondary"
            className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 flex items-center justify-center gap-2"
            onClick={() => handleSocialLogin('google')}
            disabled={isLoading}
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-white">
              {/* 구글 SVG */}
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
              {/* 깃허브 SVG */}
            </span>
            GitHub로 계속
          </Button>

          <div className="flex items-center my-6">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="mx-4 text-sm text-gray-400">또는</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

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