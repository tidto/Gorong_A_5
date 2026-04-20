import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/Button'
import { useAuth } from '../../contexts/AuthContext'
import { ShieldCheck, Accessibility } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const auth = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (auth.loggedIn) {
      navigate('/events', { replace: true })
    }
  }, [auth.loggedIn, navigate])

  const handleSocialLogin = async (provider: 'kakao' | 'google') => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 400))
    setIsLoading(false)
    navigate('/signup', { state: { socialProvider: provider } })
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl shadow-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">로그인</h1>
        <p className="text-gray-600 mb-8">
          Go냥이와 함께 행사를 찾고, 참여 기록을 쌓아보세요.
        </p>

        <div className="space-y-4">
          
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
          <Button
            type="button"
            className="w-full bg-[#FEE500] text-black hover:bg-[#f7dd00] focus:outline-none focus:ring-2 focus:ring-black"
            onClick={() => handleSocialLogin('kakao')}
            disabled={isLoading}
          >
            {isLoading ? '처리 중...' : '카카오로 로그인'}
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
