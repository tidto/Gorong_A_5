import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { auth } from '../firebase/firebaseConfig' // 팀장님의 파이어베이스 설정 파일 경로로 맞춰주세요!
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth'

// 1. 우리 DB에서 관리할 유저 정보 (나이, 비밀번호 등 삭제됨)
interface UserProfile {
  nickname: string
  email: string
  barrierFreeType?: string | null // 체크박스 대신 '어떤 장애인지' 구체적인 타입으로 관리
  isForeigner?: boolean
  interests?: string[]
  customization?: {
    outfit: string
    badge: string
  }
  gallery?: string[]
}

interface AuthContextType {
  firebaseUser: FirebaseUser | null // 파이어베이스에서 받은 진짜 인증 정보 (UID, Email 등)
  user: UserProfile | null          // 우리 DB에서 가져온 유저 정보 (닉네임 등)
  loggedIn: boolean                 // 로그인 여부
  isLoading: boolean                // 로그인 상태를 확인 중인지 여부 (로딩 처리용)
  setUser: (user: UserProfile | null) => void // 로그인/회원가입 완료 시 DB 유저 정보 세팅
  logout: () => Promise<void>
  updateUser: (updates: Partial<UserProfile>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 2. 파이어베이스가 로그인 상태를 실시간으로 감지합니다.
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setFirebaseUser(currentUser)
      
      if (!currentUser) {
        // 파이어베이스에 로그인이 안 되어있으면 우리 DB 정보도 초기화
        setUser(null)
        localStorage.removeItem('gorong-db-user')
      } else {
        // (선택) 로컬에 저장해둔 우리 DB 유저 정보가 있다면 복구
        const stored = localStorage.getItem('gorong-db-user')
        if (stored) {
          try {
            setUser(JSON.parse(stored))
          } catch {
            localStorage.removeItem('gorong-db-user')
          }
        }
      }
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // 3. 로그아웃 함수 (파이어베이스와 로컬스토리지 모두 삭제)
  const logout = async () => {
    try {
      await signOut(auth)
      setUser(null)
      localStorage.removeItem('gorong-db-user')
    } catch (error) {
      console.error('로그아웃 실패:', error)
    }
  }

  // 4. 정보 업데이트 (barrierFreeType 등 변경 시)
  const updateUser = (updates: Partial<UserProfile>) => {
    if (user) {
      const updated = { ...user, ...updates }
      setUser(updated)
      localStorage.setItem('gorong-db-user', JSON.stringify(updated))
    }
  }

  // 회원가입이나 로그인 시 백엔드에서 받은 정보를 저장하는 함수
  const saveUser = (newUser: UserProfile | null) => {
    setUser(newUser)
    if (newUser) {
      localStorage.setItem('gorong-db-user', JSON.stringify(newUser))
    } else {
      localStorage.removeItem('gorong-db-user')
    }
  }

  const value = useMemo(
    () => ({ 
      firebaseUser, 
      user, 
      loggedIn: Boolean(firebaseUser && user), // 파이어베이스 인증 & 우리 DB 정보 둘 다 있어야 완벽한 로그인
      isLoading, 
      setUser: saveUser, 
      logout, 
      updateUser 
    }),
    [firebaseUser, user, isLoading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}