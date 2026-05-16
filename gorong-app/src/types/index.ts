// 공통 타입 정의

// 행사/장소
export interface Venue {
  id: string
  name: string
  lat: number
  lng: number
  radius: number            // 지오펜스 반경 (미터)
  address: string
  category: string           // TourAPI 카테고리 
  barrierFreeInfo?: string
  imageUrl?: string
}

// 유저
// token 제거 (Firebase가 관리)
export interface User {
  uid: string
  email: string
  nickname: string
}

// 채팅 메시지
export interface ChatMessage {
  id: string
  text: string
  userId: string
  nickname: string
  createdAt: number
  isAnonymous: boolean
}

// GPS 동선
export interface TrailPoint {
  latitude: number   // latitude/longitude로 통일
  longitude: number
  timestamp: number
}

// 모임
export interface Group {
  id: string
  venueId: string
  leaderId: string
  memberIds: string[]
  maxMembers: number        // 최대 4명
  chatRoomId: string
  isGathered: boolean       // 모였다 인증 여부
}