// ─────────────────────────────────────────────
// 공통 타입 정의 (gorong-app)
// 백엔드 응답 구조에 맞춰 정의합니다.
// ─────────────────────────────────────────────

// ─── 로그인된 유저 정보 ───────────────────────
// 백엔드 /api/v1/users/login 응답에서 채워지는 값
export interface User {
  uid: string       // Firebase UID (로컬 식별용)
  email: string
  nickname: string
  roleType: 'USER' | 'ADMIN' // 백엔드 RoleType
  accountStatus?: 'ACTIVE' | 'INACTIVE'
}

// ─── 행사·문화장소 ────────────────────────────
// 백엔드 /api/v1/app/venues/nearby 응답 구조
export interface Venue {
  id: string
  name: string
  lat: number
  lng: number
  radius: number           // 지오펜스 반경 (미터)
  address: string
  category: string          // TourAPI 카테고리
  barrierFreeInfo?: string  // 무장애 정보
  imageUrl?: string
  eventStartDate?: string
  eventEndDate?: string
  overview?: string
}

// ─── 공개 행사 목록 (백엔드 /api/public/map) ─────
export interface PublicEvent {
  contentid: string
  title: string
  addr1: string
  mapx: string
  mapy: string
  firstimage?: string
  firstimage2?: string
  overview?: string
  parking?: string
  elevator?: string
  restroom?: string
  route?: string
  areacode?: string
  cat1?: string
  eventStartDate?: string
  eventEndDate?: string
  tel?: string
}

// ─── 채팅 메시지 ──────────────────────────────
// Firestore 문서 구조
export interface ChatMessage {
  id: string
  text: string
  userId: string
  nickname: string
  createdAt: number    // Unix ms
  isAnonymous: boolean
}

// ─── GPS 동선 포인트 ──────────────────────────
// react-native-maps Polyline 좌표 형식과 통일
export interface TrailPoint {
  latitude: number
  longitude: number
  timestamp: number
}

// ─── 앱 그룹 (백엔드 /api/v1/app/groups) ─────
export interface AppGroup {
  id: number
  title: string
  event: string
  location: string
  meetingDate?: string
  meetingTime?: string
  maxMembers: number
  currentMembers: number
  joined: boolean       // 내가 이미 참가했는지
  gathered: boolean     // 모임 성사 인증 여부
  status: string
}

// ─── 회원가입 요청 DTO (앱 → 백엔드) ─────────
// 백엔드 SignUpRequestDto 와 매핑
export interface SignUpPayload {
  email: string
  nickname: string
  barrierFreeType?: 'NONE' | 'PHYSICAL' | 'VISUAL' | 'AUDITORY'
  isForeigner?: boolean
  baseAddress?: string
  latitude?: number
  longitude?: number
  gorongHz?: string
  interestIds?: number[]
}
