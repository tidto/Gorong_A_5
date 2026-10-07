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

// ─── 무장애(배리어프리) 정보 ──────────────────
// 백엔드 TourItemDto 의 무장애 필드와 동일 (값이 없거나 'N'/'없음'이면 정보 없음)
export interface AccessibilityInfo {
  parking?: string          // 주차
  elevator?: string         // 엘리베이터
  restroom?: string         // 장애인 화장실
  route?: string            // 접근 경로
  wheelchair?: string       // 휠체어 대여
  exit?: string             // 출입통로(경사로)
  publicTransport?: string  // 대중교통 접근
  braileBlock?: string      // 점자블록
  audioGuide?: string       // 오디오 가이드
  helpDog?: string          // 보조견 동반
  signGuide?: string        // 수화 안내
  videoGuide?: string       // 자막 영상
  stroller?: string         // 유모차 대여
}

// ─── 행사·문화장소 ────────────────────────────
// 백엔드 /api/v1/app/venues/nearby 응답 구조
export interface Venue {
  id: string
  name: string
  lat: number
  lng: number
  radius: number           // 지오펜스 반경 (미터)
  geofenceEnabled?: boolean // 지오펜싱 대상 여부
  address: string
  category: string          // TourAPI 카테고리
  barrierFreeInfo?: string  // 무장애 정보 (문자열, /venues/nearby 응답용 · 레거시)
  accessibility?: AccessibilityInfo // 무장애 정보 (항목별 · 상세 모달 배지용)
  imageUrl?: string
  eventStartDate?: string
  eventEndDate?: string
  overview?: string
  tel?: string // 상세페이지 '전화하기'용
}

// ─── 공개 행사 목록 (백엔드 /api/public/map) ─────
export interface PublicEvent extends AccessibilityInfo {
  contentid: string
  title: string
  addr1: string
  mapx: string
  mapy: string
  firstimage?: string
  firstimage2?: string
  overview?: string
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
  eventContentId?: string | null
  location: string
  meetingDate?: string
  meetingTime?: string
  maxMembers: number
  currentMembers: number
  joined: boolean       // 내가 이미 참가했는지
  gathered: boolean     // 모임 성사 인증 여부
  status: string
}

export interface EventParticipation {
  id: number
  eventContentId: string
  eventTitle: string
  groupPostId?: number | null
  groupPostTitle?: string | null
  participationType: 'SOLO' | 'GROUP'
  visitDate?: string | null
  appliedAt: string
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