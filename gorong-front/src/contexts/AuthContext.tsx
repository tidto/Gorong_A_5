import React, {
  createContext, useContext, useEffect, useRef,
  useMemo, useState, useCallback, type ReactNode
} from 'react'
import { auth } from '../firebase/firebaseConfig'
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth'
import { invalidateMiniHomeMeCache } from '../utils/minihome/core/miniHomeMeCache'
import { useNotification } from './NotificationContext'

// ──────────────────────────────────────────────
// 1. 우리 DB에서 관리할 유저 정보 타입
//    Firebase에서 받은 UID/Email은 FirebaseUser에서 관리하므로 여기엔 없음
//    barrierFreeType: 'NONE' | 'PHYSICAL' | 'VISUAL' | 'AUDITORY'
// ──────────────────────────────────────────────
interface UserProfile {
  nickname: string
  email: string
  roleType?: 'USER' | 'ADMIN'
  barrierFreeType?: string | null  // 체크박스 대신 어떤 장애인지 구체적인 타입으로 관리
  isForeigner?: boolean
  interests?: string[]
  customization?: {
    outfit: string
    badge: string
  }
  gallery?: string[]
}

// ──────────────────────────────────────────────
// 2. Context에서 제공할 값 타입 정의
//    컴포넌트에서 useAuth()로 꺼내 쓸 수 있는 값들
// ──────────────────────────────────────────────
interface AuthContextType {
  firebaseUser: FirebaseUser | null  // Firebase에서 받은 진짜 인증 정보 (UID, Email 등)
  user: UserProfile | null           // 우리 DB에서 가져온 유저 정보 (닉네임 등)
  loggedIn: boolean                  // Firebase 인증 & DB 정보 둘 다 있어야 완벽한 로그인
  isLoading: boolean                 // 로그인 상태 확인 중인지 여부 (로딩 처리용)
  setUser: (user: UserProfile | null) => void  // 로그인/회원가입 완료 시 DB 유저 정보 세팅
  logout: () => Promise<void>
  updateUser: (updates: Partial<UserProfile>) => void  // 마이페이지 등에서 일부 정보만 수정할 때
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ──────────────────────────────────────────────
// 세션 만료 관련 상수
// ⚠️ localStorage 기반 타이머 방식 사용 중
//    실제 서비스에서는 Firebase ID Token의 exp(만료시간)를 기반으로
//    구현하는 것이 더 정확하고 안전함
//    현재 방식: 로그인 시각을 localStorage에 저장 → 경과 시간 계산
// ──────────────────────────────────────────────
const SESSION_TIMEOUT_MS = 1000 * 60 * 60 * 24 * 7  // 7일 (밀리초)
const WARNING_BEFORE_MS  = 1000 * 60 * 5             // 만료 5분 전 경고

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)  // 초기 로딩 상태 (true = 아직 확인 중)

  const { toast, confirm } = useNotification()

  // ──────────────────────────────────────────────
  // 세션 타이머 ref
  // ref를 쓰는 이유: state처럼 리렌더링을 유발하지 않고
  // setTimeout ID를 안전하게 보관할 수 있음
  // ──────────────────────────────────────────────
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logoutTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── 타이머 전체 초기화 (로그아웃/재로그인 시 항상 먼저 호출)
  const clearTimers = () => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    if (logoutTimerRef.current)  clearTimeout(logoutTimerRef.current)
  }

  // ──────────────────────────────────────────────
  // 자동 로그아웃 처리
  // toast로 알린 후 1.5초 뒤 로그아웃 + /login으로 새로고침
  // window.location.href를 쓰는 이유:
  //   navigate('/login')은 상태를 유지한 채 이동하지만
  //   새로고침이 필요한 경우(토큰 완전 만료 등)에는
  //   window.location.href가 더 안전함
  // ──────────────────────────────────────────────
  const handleAutoLogout = useCallback(async () => {
    clearTimers()
    toast('세션이 만료되어 자동 로그아웃됩니다.', 'warning')

    setTimeout(async () => {
      try {
        await signOut(auth) // 파이어베이스 서버 통신 시도
      } catch (error) {
        console.error('자동 로그아웃 중 Firebase 서버 통신 실패:', error)
      } finally {
        // 💡 통신 성공 여부와 상관없이 내 브라우저 정보는 무조건 날린다!
        setUser(null)
        setFirebaseUser(null)
        localStorage.removeItem('gorong-db-user')
        localStorage.removeItem('gorong-firebase-uid')
        localStorage.removeItem('gorong-session-start')
        window.location.href = '/login' // 새로고침 포함 이동 (상태 완전 초기화)
      }
    }, 1500)
  }, [toast])

  // ──────────────────────────────────────────────
  // 세션 타이머 시작
  // 로그인 성공(saveUser 호출) 시 실행됨
  // 재귀적으로 호출하여 "계속 이용" 선택 시 타이머를 리셋함
  // ──────────────────────────────────────────────
  const startSessionTimer = useCallback(() => {
    clearTimers()

    // 만료 5분 전 경고 팝업
    warningTimerRef.current = setTimeout(async () => {
      const extend = await confirm({
        message: '세션이 곧 만료됩니다.',
        description: '5분 후 자동으로 로그아웃됩니다. 계속 이용하시겠습니까?',
        confirmLabel: '계속 이용',
        cancelLabel: '로그아웃',
      })
      if (extend) startSessionTimer()  // 타이머 전체 재시작
      else handleAutoLogout()
    }, SESSION_TIMEOUT_MS - WARNING_BEFORE_MS)

    // 7일 후 자동 로그아웃
    logoutTimerRef.current = setTimeout(() => {
      handleAutoLogout()
    }, SESSION_TIMEOUT_MS)
  }, [confirm, handleAutoLogout])

  // ──────────────────────────────────────────────
  // Firebase 인증 상태 실시간 감지
  // onAuthStateChanged: Firebase가 자동으로 호출해주는 콜백
  //   - 로그인/로그아웃/토큰 갱신 시 자동 실행
  //   - 앱 첫 로드 시에도 한 번 실행됨 (그래서 isLoading이 필요)
  //
  // localStorage 캐시 정책:
  //   - 같은 Firebase UID의 캐시가 있으면 복구 (빠른 로딩)
  //   - 다른 계정이거나 처음 로그인이면 캐시 무효화
  //   - setUser(null)을 명시적으로 호출해 loggedIn이 false가 되도록 보장
  // ──────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setFirebaseUser(currentUser)

      if (!currentUser) {
        // Firebase에 로그인이 안 되어있으면 우리 DB 정보도 초기화
        invalidateMiniHomeMeCache()
        setUser(null)
        localStorage.removeItem('gorong-db-user')
        localStorage.removeItem('gorong-firebase-uid')
        localStorage.removeItem('gorong-session-start')
        clearTimers()
      } else {
        // 로컬에 저장해둔 우리 DB 유저 정보가 있다면 복구
        const stored    = localStorage.getItem('gorong-db-user')
        const storedUid = localStorage.getItem('gorong-firebase-uid')

        if (stored && storedUid === currentUser.uid) { // 다계정 캐시 꼬임 방지
          // 같은 계정 → 캐시 복구 (백엔드 재호출 없이 빠르게 로그인 상태 복원)
          try { setUser(JSON.parse(stored)) }
          catch { localStorage.removeItem('gorong-db-user') }
        } else {
          // 다른 계정이거나 처음 로그인 → 캐시 무효화
          // loggedIn = Boolean(firebaseUser && user)이므로
          // user가 null이면 아직 완전한 로그인 상태가 아님
          invalidateMiniHomeMeCache()
          localStorage.removeItem('gorong-db-user')
          localStorage.removeItem('gorong-firebase-uid')
          localStorage.removeItem('gorong-session-start')
          setUser(null)
        }
      }

      // Firebase 인증 상태 확인 완료 → 로딩 종료
      setIsLoading(false)
    })

    return () => unsubscribe()  // 컴포넌트 언마운트 시 구독 해제
  }, [])

  // ──────────────────────────────────────────────
  // 탭 복귀 시 토큰 재검증
  // 노트북이 잠들었다 깨어났거나, 다른 탭에서 돌아왔을 때
  // Firebase 토큰이 만료됐을 수 있으므로 강제 갱신 시도
  // 갱신 실패 = 토큰 완전 만료 → 강제 로그아웃
  // ──────────────────────────────────────────────
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && firebaseUser) {
        try {
          await firebaseUser.getIdToken(true)  // true = 강제 갱신 (캐시 무시): refresh token
        } catch {
          await logout()
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [firebaseUser])

  // ──────────────────────────────────────────────
  // 새로고침 후 남은 세션 시간 복구
  // 페이지를 새로고침해도 localStorage의 세션 시작 시간을 기반으로
  // 남은 시간만큼 타이머를 재설정함
  // Math.max(0, ...) 사용 이유:
  //   남은 시간이 WARNING_BEFORE_MS보다 짧을 때 음수가 되는 것 방지
  // ──────────────────────────────────────────────
  useEffect(() => {
    const sessionStart = localStorage.getItem('gorong-session-start')
    // Firebase 인증 객체는 비동기로 정보를 가져오기 때문에 0.1초 정도 null 상태에 머무를 수 있음
    // auth.currentUser 대신 상태값인 firebaseUser를 바라보게 수정
    if (sessionStart && firebaseUser) {
      const elapsed   = Date.now() - Number(sessionStart)
      const remaining = SESSION_TIMEOUT_MS - elapsed

      if (remaining <= 0) {
        // 이미 만료된 세션이면 바로 로그아웃 처리
        handleAutoLogout()
      } else {
          // 남은 시간만큼 타이머 재설정
        warningTimerRef.current = setTimeout(async () => {
          const extend = await confirm({
            message: '세션이 곧 만료됩니다.',
            description: '5분 후 자동으로 로그아웃됩니다. 계속 이용하시겠습니까?',
            confirmLabel: '계속 이용',
            cancelLabel: '로그아웃',
          })
          if (extend) startSessionTimer()
          else handleAutoLogout()
        }, Math.max(0, remaining - WARNING_BEFORE_MS))

        logoutTimerRef.current = setTimeout(() => {
          handleAutoLogout()
        }, remaining)
      }
    }
      return () => clearTimers()  // 언마운트 시 타이머 정리
    // 💡 의존성 배열에 firebaseUser 추가!
  }, [firebaseUser, confirm, handleAutoLogout, startSessionTimer]) 

  // ──────────────────────────────────────────────
  // 수동 로그아웃
  // clearTimers()를 먼저 호출해 자동 로그아웃 타이머와 충돌 방지
  // ──────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      clearTimers()
      await signOut(auth)
    } catch (error) {
      console.error('로그아웃 실패:', error)
    } finally {
      // 💡 수동 로그아웃 버튼을 눌렀을 때도 인터넷이 끊겨있어도 무조건 로컬 정보 삭제!
      invalidateMiniHomeMeCache()
      setUser(null)
      localStorage.removeItem('gorong-db-user')
      localStorage.removeItem('gorong-firebase-uid')
      localStorage.removeItem('gorong-session-start')
    }
  },[]) // 의존성 없음 (항상 최신 함수 참조)

  // ──────────────────────────────────────────────
  // 유저 정보 일부 업데이트
  // 마이페이지에서 닉네임/관심사 등 수정 시 사용
  // localStorage도 함께 업데이트해 새로고침 후에도 최신 상태 유지
  // ──────────────────────────────────────────────
  const updateUser = (updates: Partial<UserProfile>) => {
    if (user) {
      const updated = { ...user, ...updates }
      setUser(updated)
      localStorage.setItem('gorong-db-user', JSON.stringify(updated))
    }
  }

  // ──────────────────────────────────────────────
  // 로그인/회원가입 시 유저 정보 저장 (setUser의 실제 구현)
  // null을 넣으면 로그아웃과 동일한 효과
  // ──────────────────────────────────────────────
  const saveUser = (newUser: UserProfile | null) => {
    setUser(newUser)
    if (newUser) {
      localStorage.setItem('gorong-db-user', JSON.stringify(newUser))
      localStorage.setItem('gorong-firebase-uid', auth.currentUser?.uid ?? '')
      localStorage.setItem('gorong-session-start', String(Date.now()))
      startSessionTimer()  // 로그인 시 세션 타이머 시작
    } else {
      localStorage.removeItem('gorong-db-user')
      localStorage.removeItem('gorong-firebase-uid')
      localStorage.removeItem('gorong-session-start')
      clearTimers()
    }
  }

  // ──────────────────────────────────────────────
  // useMemo 사용 이유:
  //   value 객체가 매 렌더링마다 새로 생성되면
  //   하위 컴포넌트들이 불필요하게 리렌더링됨
  //   의존성 배열의 값이 바뀔 때만 새 객체 생성
  // ──────────────────────────────────────────────
  const value = useMemo(
    () => ({
      firebaseUser,
      user,
      loggedIn: Boolean(firebaseUser && user),  // 둘 다 있어야 완전한 로그인
      isLoading,
      setUser: saveUser,
      logout,
      updateUser,
    }),
    [firebaseUser, user, isLoading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ──────────────────────────────────────────────
// useAuth 커스텀 훅
// AuthProvider 밖에서 호출하면 에러를 던져
// 컴포넌트가 올바른 위치에 있는지 자동으로 검증됨
// ──────────────────────────────────────────────
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
