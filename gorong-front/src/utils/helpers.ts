/**
 * 공통 유틸리티 함수
 * 포맷팅, 유효성 검사 등의 도우미 함수
 */

/**
 * 거리를 포맷팅 (예: 1234m → 1.2km)
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  }
  return `${(meters / 1000).toFixed(1)}km`
}

/**
 * 난이도 레벨을 불릿으로 변환 (Easy → ⭐, Medium → ⭐⭐, Hard → ⭐⭐⭐)
 */
export function difficultyToBars(level: string): string {
  const levels: Record<string, string> = {
    Easy: '⭐',
    Medium: '⭐⭐',
    Hard: '⭐⭐⭐',
  }
  return levels[level] || level
}

/**
 * 날짜 포맷팅 (예: 2024-04-15 → 4월 15일)
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}월 ${day}일`
}

/**
 * 시간 포맷팅 (예: 10:00 → 10:00 AM)
 */
export function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
}

/**
 * 배리어프리 아이콘 데이터 조회
 */
export interface BarrierFreeIcon {
  type: 'barrierFree' | 'guideDog' | 'foreigners' | 'wheelchair' | 'visualImpaired' | 'hearingImpaired'
  label: string
  icon: string
  color: string
}

export const BARRIER_FREE_ICONS: Record<string, BarrierFreeIcon> = {
  barrierFree: {
    type: 'barrierFree',
    label: '배리어프리',
    icon: '♿',
    color: 'text-green-700',
  },
  guideDog: {
    type: 'guideDog',
    label: '안내견 환영',
    icon: '🐕',
    color: 'text-orange-700',
  },
  foreigners: {
    type: 'foreigners',
    label: '외국인 환영',
    icon: '🌍',
    color: 'text-blue-700',
  },
  wheelchair: {
    type: 'wheelchair',
    label: '휠체어 접근',
    icon: '♿',
    color: 'text-purple-700',
  },
  visualImpaired: {
    type: 'visualImpaired',
    label: '시각장애인 지원',
    icon: '👁️',
    color: 'text-yellow-700',
  },
  hearingImpaired: {
    type: 'hearingImpaired',
    label: '청각장애인 지원',
    icon: '👂',
    color: 'text-pink-700',
  },
}

/**
 * 이메일 유효성 검사
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 비밀번호 유효성 검사 (최소 8자, 영문+숫자 포함)
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password)
}

/**
 * 캐릭터 상태 메시지 생성
 */
export function getCharacterMessage(state: string, action?: string): string {
  const messages: Record<string, string> = {
    idle: '안녕하세요! 😺',
    happy: '기분이 좋아요! 😻',
    excited: '와우! 🤩',
    thinking: '생각 중이에요... 🤔',
    celebrating: '축하합니다! 🎉',
    loading: '준비 중이에요... ⏳',
    error: '뭔가 잘못됐어요... 😿',
  }
  return messages[state] || messages['idle']
}

/**
 * 로컬 스토리지 안전 저장
 */
export function safeSetLocalStorage(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Failed to save ${key} to localStorage:`, error)
  }
}

/**
 * 로컬 스토리지 안전 조회
 */
export function safeGetLocalStorage<T>(key: string, defaultValue?: T): T | null {
  try {
    const item = localStorage.getItem(key)
    return item ? (JSON.parse(item) as T) : (defaultValue ?? null)
  } catch (error) {
    console.error(`Failed to retrieve ${key} from localStorage:`, error)
    return defaultValue ?? null
  }
}

/**
 * 디바운싱 함수
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * 쓰로틀링 함수
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastFunc: ReturnType<typeof setTimeout>
  let lastRan: number
  return (...args: Parameters<T>) => {
    if (!lastRan) {
      func(...args)
      lastRan = Date.now()
    } else {
      clearTimeout(lastFunc)
      lastFunc = setTimeout(() => {
        if (Date.now() - lastRan >= limit) {
          func(...args)
          lastRan = Date.now()
        }
      }, limit - (Date.now() - lastRan))
    }
  }
}
