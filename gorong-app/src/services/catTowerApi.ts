// 캣타워 조회 API — /api/minihomes, /api/cattower, /api/guestbook
import { publicApi } from './api'
import type {
  CatTowerGuestbookEntry,
  CatTowerPage,
  CatTowerVisitorStats,
} from '../types/catTower'

export async function fetchMyCatTowerPage(): Promise<CatTowerPage> {
  const res = await publicApi.get<CatTowerPage>('/api/minihomes/me/page')
  return res.data
}

export async function fetchVisitorStats(roomOwnerId: number): Promise<CatTowerVisitorStats> {
  const res = await publicApi.get<CatTowerVisitorStats>(
    `/api/cattower/${roomOwnerId}/visitors/stats`
  )
  return res.data
}

export async function fetchGuestbook(roomOwnerId: number): Promise<CatTowerGuestbookEntry[]> {
  const res = await publicApi.get<CatTowerGuestbookEntry[]>(`/api/guestbook/${roomOwnerId}`)
  return res.data ?? []
}

export function formatGrowthStage(stage?: string | null): string {
  const key = (stage ?? 'BASIC').trim().toUpperCase()
  if (key === 'TEEN') return '성장1'
  if (key === 'ADULT') return '성장2'
  if (key === 'MASTER') return '마스터'
  return '기본'
}
