import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  banUser,
  getBans,
  getReports,
  markAppealReviewing,
  unbanUser,
  type AppealStatus,
  type BanStatus,
  type ReportStatus,
} from '../../api/adminApi'

const BAN_DAY_OPTIONS = [1, 7, 15, 30, 0]

const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  PENDING: '대기 (PENDING)',
  REVIEWING: '검토중 (REVIEWING)',
  ACTIONED: '조치완료 (ACTIONED)',
  DISMISSED: '반려 (DISMISSED)',
}

const BAN_STATUS_LABEL: Record<BanStatus, string> = {
  ACTIVE: '제재중 (ACTIVE)',
  RELEASED: '해제됨 (RELEASED)',
  EXPIRED: '만료됨 (EXPIRED)',
}

const APPEAL_STATUS_LABEL: Record<AppealStatus, string> = {
  NONE: '없음 (NONE)',
  SUBMITTED: '제출됨 (SUBMITTED)',
  REVIEWING: '검토중 (REVIEWING)',
  RESOLVED: '처리완료 (RESOLVED)',
}

const REPORT_STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  REVIEWING: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  ACTIONED: 'bg-red-500/15 text-red-400 border border-red-500/30',
  DISMISSED: 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30',
}

const BAN_STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-red-500/15 text-red-400 border border-red-500/30',
  RELEASED: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  EXPIRED: 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30',
}

const APPEAL_STATUS_STYLE: Record<string, string> = {
  NONE: 'bg-zinc-500/15 text-zinc-500 border border-zinc-600/20',
  SUBMITTED: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  REVIEWING: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  RESOLVED: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
}

function formatIdentity(nickname?: string, email?: string) {
  const [rawName = 'unknown'] = (email || '').split('@')
  const primary = (nickname && nickname.trim()) || rawName
  const secondary = email || '-'
  return {
    primary: primary.length > 18 ? `${primary.slice(0, 18)}...` : primary,
    secondary: secondary.length > 34 ? `${secondary.slice(0, 34)}...` : secondary,
  }
}

function Badge({ label, styleMap }: { label: string; styleMap: Record<string, string> }) {
  const cls = styleMap[label] ?? 'bg-zinc-700/30 text-zinc-400 border border-zinc-600/20'
  const labelText =
    REPORT_STATUS_LABEL[label as ReportStatus]
    ?? BAN_STATUS_LABEL[label as BanStatus]
    ?? APPEAL_STATUS_LABEL[label as AppealStatus]
    ?? label
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-mono font-semibold tracking-wider ${cls}`}>
      {labelText}
    </span>
  )
}

function extractErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null) {
    const maybeResponse = (error as { response?: { data?: unknown } }).response
    const data = maybeResponse?.data
    if (typeof data === 'string') return data
    if (typeof data === 'object' && data !== null) {
      const message = (data as { message?: unknown }).message
      if (typeof message === 'string') return message
    }
  }
  return '요청 처리 중 오류가 발생했습니다.'
}

function FilterSelect({
  value, onChange, options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="appearance-none rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-mono text-zinc-300 focus:border-zinc-500 focus:outline-none cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-zinc-900">
          {o.label}
        </option>
      ))}
    </select>
  )
}

function Pagination({
  page, totalPages, onPrev, onNext,
}: {
  page: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <button
        disabled={page <= 0}
        onClick={onPrev}
        className="flex h-7 w-7 items-center justify-center rounded border border-zinc-700 text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
      >
        ‹
      </button>
      <span className="font-mono text-xs text-zinc-500">
        <span className="text-zinc-200">{page + 1}</span> / {totalPages}
      </span>
      <button
        disabled={page + 1 >= totalPages}
        onClick={onNext}
        className="flex h-7 w-7 items-center justify-center rounded border border-zinc-700 text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
      >
        ›
      </button>
    </div>
  )
}

export default function AdminPage() {
  const [reports, setReports] = useState<any[]>([])
  const [bans, setBans] = useState<any[]>([])
  const [reportPage, setReportPage] = useState(0)
  const [banPage, setBanPage] = useState(0)
  const [reportTotalPages, setReportTotalPages] = useState(1)
  const [banTotalPages, setBanTotalPages] = useState(1)
  const [reportStatus, setReportStatus] = useState<ReportStatus | ''>('')
  const [banStatus, setBanStatus] = useState<BanStatus | ''>('')
  const [appealStatus, setAppealStatus] = useState<AppealStatus | ''>('')
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null)
  const [expandedBanId, setExpandedBanId] = useState<number | null>(null)
  const [appealReviewNotes, setAppealReviewNotes] = useState<Record<number, string>>({})
  const [banReason, setBanReason] = useState('')
  const [banDays, setBanDays] = useState(7)
  const [isLoading, setIsLoading] = useState(false)

  const selectedReport = useMemo(
    () => reports.find((r) => r.reportId === selectedReportId) ?? null,
    [reports, selectedReportId],
  )

  const loadReports = async () => {
    const res = await getReports({
      page: reportPage,
      size: 10,
      status: reportStatus || undefined,
      sort: 'createdAt,desc',
    })
    setReports(res.content)
    setReportTotalPages(Math.max(1, res.totalPages))
  }

  const loadBans = async () => {
    const res = await getBans({
      page: banPage,
      size: 10,
      banStatus: banStatus || undefined,
      appealStatus: appealStatus || undefined,
      sort: 'bannedAt,desc',
    })
    setBans(res.content)
    setBanTotalPages(Math.max(1, res.totalPages))
  }

  useEffect(() => { loadReports() }, [reportPage, reportStatus])
  useEffect(() => { loadBans() }, [banPage, banStatus, appealStatus])

  const handleBan = async () => {
    if (!selectedReport || !banReason.trim()) return
    setIsLoading(true)
    try {
      await banUser(selectedReport.reportedUserId, {
        reportId: selectedReport.reportId,
        banReason: banReason.trim(),
        banDays,
      })
      setBanReason('')
      setSelectedReportId(null)
      await Promise.all([loadReports(), loadBans()])
    } catch (error) {
      window.alert(extractErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnban = async (banId: number) => {
    const inlineNote = appealReviewNotes[banId]?.trim()
    const promptedNote = window.prompt('해제 사유를 입력하세요.', '소명 검토 후 해제')
    const note = inlineNote || promptedNote || undefined
    await unbanUser(banId, note)
    setExpandedBanId((current) => (current === banId ? null : current))
    await loadBans()
  }

  const handleAppealReviewing = async (banId: number) => {
    await markAppealReviewing(banId)
    setExpandedBanId(banId)
    await loadBans()
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-8" style={{ fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif" }}>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-white">
                <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">제재 관리</h1>
              <p className="text-xs text-zinc-500">Admin Moderation Console</p>
            </div>
          </div>
          <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 font-mono text-[11px] text-zinc-400">ADMIN</span>
        </div>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <h2 className="text-sm font-semibold text-white">신고 이력</h2>
              <span className="font-mono text-xs text-zinc-600">REPORTS</span>
            </div>
            <FilterSelect
              value={reportStatus}
              onChange={(v) => { setReportPage(0); setReportStatus(v as ReportStatus | '') }}
              options={[
                { value: '', label: '전체 상태' },
                { value: 'PENDING', label: REPORT_STATUS_LABEL.PENDING },
                { value: 'REVIEWING', label: REPORT_STATUS_LABEL.REVIEWING },
                { value: 'ACTIONED', label: REPORT_STATUS_LABEL.ACTIONED },
                { value: 'DISMISSED', label: REPORT_STATUS_LABEL.DISMISSED },
              ]}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['', 'ID', '신고자', '피신고자', '사유', '상태', '신고일'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-mono text-[11px] font-medium uppercase tracking-widest text-zinc-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-xs text-zinc-600">데이터가 없습니다.</td>
                  </tr>
                ) : reports.map((r) => (
                  <tr
                    key={r.reportId}
                    onClick={() => setSelectedReportId(r.reportId === selectedReportId ? null : r.reportId)}
                    className={`cursor-pointer transition-colors ${
                      selectedReportId === r.reportId ? 'bg-red-950/40 ring-1 ring-inset ring-red-800/40' : 'hover:bg-zinc-800/40'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                        selectedReportId === r.reportId ? 'border-red-500 bg-red-500' : 'border-zinc-600'
                      }`}>
                        {selectedReportId === r.reportId && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-400">#{r.reportId}</td>
                    <td className="px-4 py-3 text-xs text-zinc-300">
                      {(() => {
                        const e = formatIdentity(r.reporterNickname, r.reporterEmail)
                        return (
                          <div className="leading-tight">
                            <div className="font-medium text-zinc-200">{e.primary}</div>
                            <div className="font-mono text-[10px] text-zinc-500">{e.secondary}</div>
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-zinc-100">
                      {(() => {
                        const e = formatIdentity(r.reportedUserNickname, r.reportedUserEmail)
                        return (
                          <div className="leading-tight">
                            <div className="font-semibold text-zinc-100">{e.primary}</div>
                            <div className="font-mono text-[10px] text-zinc-500">{e.secondary}</div>
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400 max-w-[200px] truncate">{r.reason}</td>
                    <td className="px-4 py-3"><Badge label={r.status} styleMap={REPORT_STATUS_STYLE} /></td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                      {new Date(r.createdAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-zinc-800 px-5 py-3">
            <Pagination
              page={reportPage}
              totalPages={reportTotalPages}
              onPrev={() => setReportPage((p) => p - 1)}
              onNext={() => setReportPage((p) => p + 1)}
            />
          </div>
        </section>

        <section className={`rounded-xl border overflow-hidden ${selectedReport ? 'border-red-800/50 bg-red-950/20' : 'border-zinc-800 bg-zinc-900'}`}>
          <div className="flex items-center gap-2 border-b border-zinc-800 px-5 py-4">
            <span className={`h-1.5 w-1.5 rounded-full ${selectedReport ? 'bg-red-500' : 'bg-zinc-600'}`} />
            <h2 className="text-sm font-semibold text-white">제재 처리</h2>
            <span className="font-mono text-xs text-zinc-600">BAN ACTION</span>
          </div>

          <div className="px-5 py-5 space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3">
              <div className={`h-2 w-2 rounded-full ${selectedReport ? 'bg-red-500' : 'bg-zinc-700'}`} />
              <div className="min-w-0">
                {selectedReport ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-zinc-500">신고 #{selectedReport.reportId}</span>
                    <span className="text-xs text-zinc-400">→</span>
                    <span className="text-sm font-medium text-white">{selectedReport.reportedUserNickname || selectedReport.reportedUserEmail}</span>
                  </div>
                ) : (
                  <span className="text-xs text-zinc-600">위 표에서 신고 항목을 선택하세요.</span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                disabled={!selectedReport}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-zinc-500 focus:outline-none disabled:opacity-40"
                placeholder="제재 사유 입력"
              />
              <select
                value={banDays}
                onChange={(e) => setBanDays(Number(e.target.value))}
                disabled={!selectedReport}
                className="appearance-none rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 font-mono text-sm text-zinc-200 focus:border-zinc-500 focus:outline-none disabled:opacity-40"
              >
                {BAN_DAY_OPTIONS.map((d) => (
                  <option key={d} value={d} className="bg-zinc-900">
                    {d === 0 ? '영구 정지' : `${d}일 정지`}
                  </option>
                ))}
              </select>
              <button
                onClick={handleBan}
                disabled={!selectedReport || !banReason.trim() || isLoading}
                className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-40"
              >
                {isLoading ? '처리 중...' : '제재 적용'}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              <h2 className="text-sm font-semibold text-white">밴 이력</h2>
              <span className="font-mono text-xs text-zinc-600">BAN HISTORY</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterSelect
                value={banStatus}
                onChange={(v) => { setBanPage(0); setBanStatus(v as BanStatus | '') }}
                options={[
                  { value: '', label: '전체 밴 상태' },
                  { value: 'ACTIVE', label: BAN_STATUS_LABEL.ACTIVE },
                  { value: 'RELEASED', label: BAN_STATUS_LABEL.RELEASED },
                  { value: 'EXPIRED', label: BAN_STATUS_LABEL.EXPIRED },
                ]}
              />
              <FilterSelect
                value={appealStatus}
                onChange={(v) => { setBanPage(0); setAppealStatus(v as AppealStatus | '') }}
                options={[
                  { value: '', label: '전체 소명 상태' },
                  { value: 'NONE', label: APPEAL_STATUS_LABEL.NONE },
                  { value: 'SUBMITTED', label: APPEAL_STATUS_LABEL.SUBMITTED },
                  { value: 'REVIEWING', label: APPEAL_STATUS_LABEL.REVIEWING },
                  { value: 'RESOLVED', label: APPEAL_STATUS_LABEL.RESOLVED },
                ]}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Ban ID', '이메일', '정지 기간', '사유', '밴 상태', '소명 상태', '액션'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-mono text-[11px] font-medium uppercase tracking-widest text-zinc-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {bans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-xs text-zinc-600">데이터가 없습니다.</td>
                  </tr>
                ) : bans.map((b) => {
                  const isExpanded = expandedBanId === b.banId
                  const canOpenAppeal = b.appealStatus === 'REVIEWING'

                  return (
                    <Fragment key={b.banId}>
                      <tr key={b.banId} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-zinc-400">#{b.banId}</td>
                        <td className="px-4 py-3 text-xs text-zinc-200">{b.email}</td>
                        <td className="px-4 py-3">
                          {b.banDays === 0
                            ? <span className="font-mono text-xs font-bold text-red-400">영구</span>
                            : <span className="font-mono text-xs text-zinc-300">{b.banDays}일</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-400 max-w-[180px] truncate">{b.banReason}</td>
                        <td className="px-4 py-3"><Badge label={b.banStatus} styleMap={BAN_STATUS_STYLE} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Badge label={b.appealStatus} styleMap={APPEAL_STATUS_STYLE} />
                            {canOpenAppeal && (
                              <button
                                onClick={() => setExpandedBanId((current) => (current === b.banId ? null : b.banId))}
                                className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300 hover:border-zinc-500 hover:text-white"
                              >
                                {isExpanded ? '닫기' : '소명 보기'}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {b.appealStatus === 'SUBMITTED' && (
                              <button
                                onClick={() => handleAppealReviewing(b.banId)}
                                className="rounded border border-blue-700 bg-blue-900/30 px-2.5 py-1 text-xs text-blue-400 hover:bg-blue-800/40"
                              >
                                검토중
                              </button>
                            )}
                            {b.banStatus === 'ACTIVE' && (
                              <button
                                onClick={() => handleUnban(b.banId)}
                                className="rounded border border-emerald-700 bg-emerald-900/30 px-2.5 py-1 text-xs text-emerald-400 hover:bg-emerald-800/40"
                              >
                                해제
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && canOpenAppeal && (
                        <tr className="bg-zinc-950/70">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="grid gap-4 rounded-lg border border-blue-900/40 bg-blue-950/10 p-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <div className="font-mono text-[11px] uppercase tracking-widest text-blue-300">Appeal Text</div>
                                <div className="min-h-[112px] rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-200">
                                  {b.appealText?.trim() || '제출된 소명문이 없습니다.'}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="font-mono text-[11px] uppercase tracking-widest text-emerald-300">Review Note</div>
                                <textarea
                                  value={appealReviewNotes[b.banId] ?? b.appealReviewNote ?? ''}
                                  onChange={(e) => setAppealReviewNotes((current) => ({
                                    ...current,
                                    [b.banId]: e.target.value,
                                  }))}
                                  rows={5}
                                  className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                                  placeholder="관리자 검토 메모를 입력하면 해제 시 함께 저장됩니다."
                                />
                                <p className="text-xs text-zinc-500">
                                  `해제` 버튼을 누르면 이 메모가 해제 사유로 함께 저장됩니다.
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-zinc-800 px-5 py-3">
            <Pagination
              page={banPage}
              totalPages={banTotalPages}
              onPrev={() => setBanPage((p) => p - 1)}
              onNext={() => setBanPage((p) => p + 1)}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
