import axiosInstance from './axiosInstance'

export type ReportStatus = 'PENDING' | 'REVIEWING' | 'ACTIONED' | 'DISMISSED'
export type BanStatus = 'ACTIVE' | 'RELEASED' | 'EXPIRED'
export type AppealStatus = 'NONE' | 'SUBMITTED' | 'REVIEWING' | 'RESOLVED'

export interface ReportSummary {
  reportId: number
  reporterId: number
  reporterNickname?: string
  reporterEmail: string
  reportedUserId: number
  reportedUserNickname?: string
  reportedUserEmail: string
  reason: string
  status: ReportStatus
  adminReason?: string
  suspensionDays?: number
  createdAt: string
  processedAt?: string
}

export interface BanSummary {
  banId: number
  userId: number
  email: string
  banReason: string
  banDays: number
  banStatus: BanStatus
  appealStatus: AppealStatus
  appealText?: string
  appealReviewNote?: string
  reportCount?: number
  bannedAt: string
  banEndsAt?: string
  permanentDeleteAt?: string
}

interface PageResponse<T> {
  content: T[]
  totalPages: number
  totalElements: number
  number: number
  size: number
}

export async function getAdminMe() {
  const { data } = await axiosInstance.get('/v1/admin/me')
  return data as { userId: number; email: string; roleType: 'USER' | 'ADMIN' }
}

export async function getReports(params: {
  page?: number
  size?: number
  status?: ReportStatus
  reporterId?: number
  reportedUserId?: number
  sort?: string
}) {
  const { data } = await axiosInstance.get('/v1/admin/reports', { params })
  return data as PageResponse<ReportSummary>
}

export async function getBans(params: {
  page?: number
  size?: number
  banStatus?: BanStatus
  appealStatus?: AppealStatus
  sort?: string
}) {
  const { data } = await axiosInstance.get('/v1/admin/bans', { params })
  return data as PageResponse<BanSummary>
}

export async function banUser(userId: number, payload: { reportId?: number; banReason: string; banDays: number }) {
  const { data } = await axiosInstance.post(`/v1/admin/users/${userId}/ban`, payload)
  return data as BanSummary
}

export async function unbanUser(banId: number, reviewNote?: string) {
  await axiosInstance.delete(`/v1/admin/bans/${banId}`, { params: { reviewNote } })
}

export async function markAppealReviewing(banId: number) {
  const { data } = await axiosInstance.patch(`/v1/admin/bans/${banId}/appeals/reviewing`)
  return data as BanSummary
}
