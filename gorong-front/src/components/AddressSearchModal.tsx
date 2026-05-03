import { useState } from 'react'
import { X, MapPin, Search, ChevronRight } from 'lucide-react'
import axiosInstance from '../api/axiosInstance'

export interface AddressResult {
  roadAddr: string
  jibunAddr: string
  zipNo: string
  entX: string
  entY: string
}

interface Props {
  onSelect: (result: AddressResult) => void
  onClose: () => void
}

export default function AddressSearchModal({ onSelect, onClose }: Props) {
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<AddressResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const search = async () => {
    if (!keyword.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await axiosInstance.get('/v1/juso/search', {
        params: { keyword }
      })
      setResults(res.data?.results?.juso || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center">
      {/* 배경 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* 모달 */}
      <div className="relative z-10 w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-primary-600" />
            <span className="font-bold text-gray-900">주소 검색</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-gray-100 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* 검색창 */}
        <div className="px-5 py-4 border-b border-gray-50">
          <div className="flex gap-2">
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="도로명, 건물명, 지번 입력"
              className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:bg-white transition"
              autoFocus
            />
            <button
              onClick={search}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-2xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:bg-gray-300 transition"
            >
              <Search size={15} />
              검색
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">예) 판교역로 235, 분당 주공, 삼평동 681</p>
        </div>

        {/* 결과 */}
        <div className="max-h-72 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-10 text-sm text-gray-400">
              검색 중...
            </div>
          )}

          {!loading && searched && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <span className="text-2xl">🔍</span>
              <p className="text-sm text-gray-400">검색 결과가 없습니다.</p>
            </div>
          )}

          {!loading && results.map((addr, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(addr)}
              className="flex w-full items-center gap-3 border-b border-gray-50 px-5 py-3.5 text-left hover:bg-primary-50 transition last:border-b-0"
            >
              <MapPin size={15} className="shrink-0 text-primary-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{addr.roadAddr}</p>
                <p className="text-xs text-gray-400 truncate">{addr.jibunAddr}</p>
              </div>
              <ChevronRight size={15} className="shrink-0 text-gray-300" />
            </button>
          ))}
        </div>

        {/* 하단 출처 */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            행정안전부 도로명주소 API 제공
          </p>
        </div>
      </div>
    </div>
  )
}