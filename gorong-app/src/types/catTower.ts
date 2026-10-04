/** 캣타워 조회 전용 타입 (편집·꾸미기 없음) */

export type CatTowerStats = {
  activityCount: number
  temperatureTotal: number
  level: number
  growthStage?: string
  galleryCount?: number
}

export type CatTowerActivity = {
  activityId: number
  activityType: string | null
  referenceId: number | null
  temperatureChange: number
  title?: string | null
  description?: string | null
  createAt: string
}

export type CatTowerGoCat = {
  goCatId: number
  miniHomeId: number
  userId: number
  catName: string
  characterType: string
  temperatureTotal?: number
  level?: number
}

export type CatTowerMiniHome = {
  miniHomeId: number
  userId: number
  isPublic?: boolean
  cat: CatTowerGoCat | null
}

export type CatTowerPage = {
  miniHome: CatTowerMiniHome
  ownerNickname?: string | null
  stats: CatTowerStats
  activities: CatTowerActivity[]
}

export type CatTowerVisitorStats = {
  todayCount: number
  totalCount: number
}

export type CatTowerGuestbookEntry = {
  guestbookId: number
  roomOwnerUserId: number
  authorUserId: number
  authorNickname: string
  authorProfileImageUrl?: string | null
  content: string
  createAt: string
}
