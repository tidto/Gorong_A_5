import { useEffect, useMemo, useState } from 'react'
import {
  banUser,
  getBans,
  getReports,
  markAppealReviewing,
  unbanUser,
  type BanStatus,
  type AppealStatus,
  type ReportStatus,
} from '../../api/adminApi'

const BAN_DAY_OPTIONS = [1, 7, 15, 30, 0]

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
  const [banReason, setBanReason] = useState('')
  const [banDays, setBanDays] = useState(7)
  const [isLoading, setIsLoading] = useState(false)

  const selectedReport = useMemo(
    () => reports.find((r) => r.reportId === selectedReportId) ?? null,
    [reports, selectedReportId]
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

  useEffect(() => {
    loadReports()
  }, [reportPage, reportStatus])

  useEffect(() => {
    loadBans()
  }, [banPage, banStatus, appealStatus])

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
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnban = async (banId: number) => {
    const note = window.prompt('해제 사유를 입력하세요.', '반론 검토 후 해제') ?? undefined
    await unbanUser(banId, note)
    await loadBans()
  }

  const handleAppealReviewing = async (banId: number) => {
    await markAppealReviewing(banId)
    await loadBans()
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">어드민 제재 관리</h1>

      <section className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <h2 className="text-xl font-semibold">신고 이력</h2>
          <select
            value={reportStatus}
            onChange={(e) => {
              setReportPage(0)
              setReportStatus(e.target.value as ReportStatus | '')
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">전체 상태</option>
            <option value="PENDING">PENDING</option>
            <option value="REVIEWING">REVIEWING</option>
            <option value="ACTIONED">ACTIONED</option>
            <option value="DISMISSED">DISMISSED</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-3 py-2">선택</th>
                <th className="px-3 py-2">신고ID</th>
                <th className="px-3 py-2">신고자</th>
                <th className="px-3 py-2">피신고자</th>
                <th className="px-3 py-2">사유</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">신고일</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.reportId} className="border-b">
                  <td className="px-3 py-2">
                    <input
                      type="radio"
                      name="selectedReport"
                      checked={selectedReportId === r.reportId}
                      onChange={() => setSelectedReportId(r.reportId)}
                    />
                  </td>
                  <td className="px-3 py-2">{r.reportId}</td>
                  <td className="px-3 py-2">{r.reporterEmail}</td>
                  <td className="px-3 py-2">{r.reportedUserEmail}</td>
                  <td className="px-3 py-2">{r.reason}</td>
                  <td className="px-3 py-2">{r.status}</td>
                  <td className="px-3 py-2">{new Date(r.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button className="rounded border px-3 py-1" disabled={reportPage <= 0} onClick={() => setReportPage((p) => p - 1)}>이전</button>
          <span className="text-sm">{reportPage + 1} / {reportTotalPages}</span>
          <button className="rounded border px-3 py-1" disabled={reportPage + 1 >= reportTotalPages} onClick={() => setReportPage((p) => p + 1)}>다음</button>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
        <h2 className="text-xl font-semibold">제재 처리</h2>
        <p className="text-sm text-gray-600">
          선택 신고: {selectedReport ? `${selectedReport.reportId} / ${selectedReport.reportedUserEmail}` : '없음'}
        </p>
        <input
          value={banReason}
          onChange={(e) => setBanReason(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          placeholder="제재 사유 입력"
        />
        <select
          value={banDays}
          onChange={(e) => setBanDays(Number(e.target.value))}
          className="rounded-lg border border-gray-300 px-3 py-2"
        >
          {BAN_DAY_OPTIONS.map((d) => (
            <option key={d} value={d}>{d === 0 ? '영구정지(0)' : `${d}일 정지`}</option>
          ))}
        </select>
        <button
          onClick={handleBan}
          disabled={!selectedReport || !banReason.trim() || isLoading}
          className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          제재 적용
        </button>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold">밴 이력</h2>
          <select
            value={banStatus}
            onChange={(e) => {
              setBanPage(0)
              setBanStatus(e.target.value as BanStatus | '')
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">전체 밴상태</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="RELEASED">RELEASED</option>
            <option value="EXPIRED">EXPIRED</option>
          </select>
          <select
            value={appealStatus}
            onChange={(e) => {
              setBanPage(0)
              setAppealStatus(e.target.value as AppealStatus | '')
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">전체 반론상태</option>
            <option value="NONE">NONE</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="REVIEWING">REVIEWING</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-3 py-2">banId</th>
                <th className="px-3 py-2">email</th>
                <th className="px-3 py-2">정지</th>
                <th className="px-3 py-2">사유</th>
                <th className="px-3 py-2">밴상태</th>
                <th className="px-3 py-2">반론상태</th>
                <th className="px-3 py-2">액션</th>
              </tr>
            </thead>
            <tbody>
              {bans.map((b) => (
                <tr key={b.banId} className="border-b">
                  <td className="px-3 py-2">{b.banId}</td>
                  <td className="px-3 py-2">{b.email}</td>
                  <td className="px-3 py-2">{b.banDays === 0 ? '영구' : `${b.banDays}일`}</td>
                  <td className="px-3 py-2">{b.banReason}</td>
                  <td className="px-3 py-2">{b.banStatus}</td>
                  <td className="px-3 py-2">{b.appealStatus}</td>
                  <td className="px-3 py-2 space-x-2">
                    {b.appealStatus === 'SUBMITTED' && (
                      <button className="rounded border px-2 py-1" onClick={() => handleAppealReviewing(b.banId)}>
                        검토중
                      </button>
                    )}
                    {b.banStatus === 'ACTIVE' && (
                      <button className="rounded bg-emerald-600 px-2 py-1 text-white" onClick={() => handleUnban(b.banId)}>
                        해제
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button className="rounded border px-3 py-1" disabled={banPage <= 0} onClick={() => setBanPage((p) => p - 1)}>이전</button>
          <span className="text-sm">{banPage + 1} / {banTotalPages}</span>
          <button className="rounded border px-3 py-1" disabled={banPage + 1 >= banTotalPages} onClick={() => setBanPage((p) => p + 1)}>다음</button>
        </div>
      </section>
    </div>
  )
}
