import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PenSquare, Trash2, ChevronLeft, ChevronRight, BookOpen, Search, X } from 'lucide-react'
import {
  getPublishedPosts,
  deleteReview,
  type ReviewSummary,
} from '../api/reviewService'

function PawDots({ value }: { value: number }) {
  return (
      <span className="flex items-center gap-[3px]">
      {[1,2,3,4,5].map(i => (
          <span
              key={i}
              className={`inline-block w-1.5 h-1.5 rounded-full transition-colors ${
                  i <= value ? 'bg-orange-500' : 'bg-orange-100'
              }`}
          />
      ))}
    </span>
  )
}

export default function ReviewPage() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState<ReviewSummary[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [searchField, setSearchField] = useState<'title' | 'eventTitle'>('title')
  const [hoveredId, setHoveredId] = useState<number | null>(null)

  const loadPosts = async (nextPage: number) => {
    setLoading(true)
    try {
      const response = await getPublishedPosts(nextPage, 10)
      setPosts(response.content)
      setPage(response.page)
      setTotalPages(Math.max(response.totalPages, 1))
    } catch (error) {
      console.error('포스팅 목록 조회 실패:', error)
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPosts(0) }, [])

  const handleDelete = async (e: React.MouseEvent, reviewId: number) => {
    e.stopPropagation()
    if (!window.confirm('정말 삭제하시겠습니까?')) return
    try {
      await deleteReview(reviewId)
      await loadPosts(page)
    } catch {
      alert('삭제 실패')
    }
  }

  const filtered = query.trim()
      ? posts.filter(p => {
        const q = query.trim().toLowerCase()
        return searchField === 'title'
            ? p.title.toLowerCase().includes(q)
            : p.eventTitle.toLowerCase().includes(q)
      })
      : posts

  const topPost = filtered[0]
  const listPosts = filtered.slice(1)

  return (
      <div className="min-h-screen bg-[#fafaf8]">

        {/* ── 상단 마스트헤드 ── */}
        <div className="border-b border-slate-900/10">
          <div className="mx-auto max-w-5xl px-6">
            {/* 상단 라인: 섹션명 + 버튼 */}
            <div className="flex items-center justify-between py-3 border-b border-slate-900/8">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-orange-500">Field Review</span>
              <button
                  onClick={() => navigate('/reviews/write')}
                  className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-600 hover:text-orange-500 transition-colors"
              >
                <PenSquare className="h-3.5 w-3.5" />
                후기 작성
              </button>
            </div>

            {/* 타이틀 블록 */}
            <div className="py-6">
              <h1 className="text-[2.75rem] font-black leading-none tracking-tighter text-slate-900">
                행사 후기
              </h1>
              <p className="mt-2 text-sm text-slate-400 font-light">
                직접 참여한 행사의 경험을 기록하고 공유합니다
              </p>
            </div>

            {/* 검색 */}
            <div className="pb-5 flex items-center gap-3">
              <div className="flex items-center gap-0 border-b border-slate-300 pb-0.5">
                {([['title', '제목'], ['eventTitle', '행사명']] as const).map(([field, label]) => (
                    <button
                        key={field}
                        onClick={() => { setSearchField(field); setQuery('') }}
                        className={`text-xs font-semibold px-3 py-1 transition-colors ${
                            searchField === field
                                ? 'text-orange-500 border-b-2 border-orange-500 -mb-0.5'
                                : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                      {label}
                    </button>
                ))}
              </div>

              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchField === 'title' ? '제목 검색...' : '행사명 검색...'}
                    className="w-full bg-transparent pl-6 pr-6 py-1 text-sm text-slate-700 placeholder-slate-300 outline-none border-b border-slate-200 focus:border-orange-400 transition-colors"
                />
                {query && (
                    <button
                        onClick={() => setQuery('')}
                        className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                )}
              </div>

              {query && (
                  <span className="text-xs text-slate-400">{filtered.length}건</span>
              )}
            </div>
          </div>
        </div>

        {/* ── 콘텐츠 ── */}
        <div className="mx-auto max-w-5xl px-6">

          {loading ? (
              <div className="flex items-center justify-center py-32 gap-3 text-slate-400">
                <div className="h-5 w-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">불러오는 중</span>
              </div>

          ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 gap-5">
                <div className="w-px h-16 bg-slate-200" />
                <BookOpen className="h-8 w-8 text-slate-200" />
                {query ? (
                    <div className="text-center">
                      <p className="text-sm text-slate-500 mb-3">
                        <span className="font-semibold text-slate-700">"{query}"</span>에 대한 결과가 없습니다
                      </p>
                      <button
                          onClick={() => setQuery('')}
                          className="text-xs font-semibold text-orange-500 hover:text-orange-600 uppercase tracking-widest"
                      >
                        검색 초기화
                      </button>
                    </div>
                ) : (
                    <div className="text-center">
                      <p className="text-sm text-slate-500 mb-3">아직 공개된 후기가 없습니다</p>
                      <button
                          onClick={() => navigate('/reviews/write')}
                          className="text-xs font-semibold text-orange-500 hover:text-orange-600 uppercase tracking-widest"
                      >
                        첫 번째 후기 작성하기 →
                      </button>
                    </div>
                )}
              </div>

          ) : (
              <>
                {/* ── 헤드라인 포스트 ── */}
                {topPost && (
                    <div
                        className="group cursor-pointer"
                        onClick={() => navigate(`/posting/${topPost.id}`)}
                        onMouseEnter={() => setHoveredId(topPost.id)}
                        onMouseLeave={() => setHoveredId(null)}
                    >
                      <div className="py-10 flex gap-10 items-start border-b border-slate-900/10">

                        {/* 왼쪽: 인덱스 + 메타 */}
                        <div className="shrink-0 w-40 flex flex-col gap-3 pt-1">
                          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-500">
                            No.{String(page * 10 + 1).padStart(2, '0')}
                          </div>
                          <div className="w-6 h-px bg-orange-400" />
                          <span className="text-[11px] text-slate-400 leading-relaxed font-medium">
                      {topPost.eventTitle}
                    </span>
                          <div className="flex items-center gap-2 mt-1">
                            <PawDots value={topPost.rating} />
                            <span className="text-[10px] text-slate-400">{topPost.rating}/5</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-auto">
                            {new Date(topPost.createdAt).toLocaleDateString('ko-KR', {
                              year: 'numeric', month: 'short', day: 'numeric'
                            })}
                          </div>
                        </div>

                        {/* 오른쪽: 본문 */}
                        <div className="flex-1 min-w-0">
                          <h2 className={`text-3xl font-black tracking-tighter leading-tight text-slate-900 transition-colors duration-200 ${
                              hoveredId === topPost.id ? 'text-orange-600' : ''
                          }`}>
                            {topPost.title}
                          </h2>
                          <p className="mt-3 text-sm leading-relaxed text-slate-500 line-clamp-2">
                            {topPost.reviewText}
                          </p>
                          <div className="mt-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-[9px] font-bold text-orange-600 uppercase">
                                {(topPost.authorName || '?')[0]}
                              </div>
                              <span className="text-xs text-slate-500 font-medium">{topPost.authorName}</span>
                            </div>
                            <button
                                onClick={(e) => handleDelete(e, topPost.id)}
                                className="p-1.5 rounded text-slate-200 hover:text-red-400 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* 썸네일 (있을 때만) */}
                        {topPost.images[0] && (
                            <div className="shrink-0 w-44 h-32 overflow-hidden rounded-sm">
                              <img
                                  src={topPost.images[0].imageUrl}
                                  alt={topPost.title}
                                  className={`w-full h-full object-cover transition-transform duration-500 ${
                                      hoveredId === topPost.id ? 'scale-105' : 'scale-100'
                                  }`}
                              />
                            </div>
                        )}
                      </div>
                    </div>
                )}

                {/* ── 나머지 포스트 목록 ── */}
                {listPosts.length > 0 && (
                    <div>
                      {listPosts.map((post, idx) => (
                          <div
                              key={post.id}
                              className="group cursor-pointer"
                              onClick={() => navigate(`/posting/${post.id}`)}
                              onMouseEnter={() => setHoveredId(post.id)}
                              onMouseLeave={() => setHoveredId(null)}
                          >
                            <div className="py-5 flex gap-8 items-start border-b border-slate-900/8 hover:bg-orange-50/30 -mx-2 px-2 rounded transition-colors">

                              {/* 인덱스 */}
                              <div className="shrink-0 w-10 text-right">
                        <span className="text-[11px] font-bold text-slate-200 group-hover:text-orange-300 transition-colors tabular-nums">
                          {String(page * 10 + idx + 2).padStart(2, '0')}
                        </span>
                              </div>

                              {/* 수직 구분선 */}
                              <div className="shrink-0 w-px self-stretch bg-slate-100 group-hover:bg-orange-200 transition-colors" />

                              {/* 콘텐츠 */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                              {post.eventTitle}
                            </span>
                                    <h3 className={`mt-1 text-[15px] font-bold tracking-tight text-slate-900 truncate transition-colors ${
                                        hoveredId === post.id ? 'text-orange-600' : ''
                                    }`}>
                                      {post.title}
                                    </h3>
                                    <p className="mt-0.5 text-xs text-slate-400 truncate leading-relaxed">
                                      {post.reviewText}
                                    </p>
                                  </div>

                                  {/* 썸네일 */}
                                  {post.images[0] && (
                                      <div className="shrink-0 w-16 h-14 overflow-hidden rounded-sm">
                                        <img
                                            src={post.images[0].imageUrl}
                                            alt={post.title}
                                            className={`w-full h-full object-cover transition-transform duration-300 ${
                                                hoveredId === post.id ? 'scale-105' : ''
                                            }`}
                                        />
                                      </div>
                                  )}
                                </div>

                                {/* 하단 메타 */}
                                <div className="mt-2.5 flex items-center gap-4">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-4 h-4 rounded-full bg-orange-50 flex items-center justify-center text-[8px] font-bold text-orange-500">
                                      {(post.authorName || '?')[0]}
                                    </div>
                                    <span className="text-[10px] text-slate-400">{post.authorName}</span>
                                  </div>
                                  <PawDots value={post.rating} />
                                  <span className="text-[10px] text-slate-300">
                            {new Date(post.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                          </span>
                                  <button
                                      onClick={(e) => handleDelete(e, post.id)}
                                      className="ml-auto p-1 rounded text-slate-200 hover:text-red-400 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                      ))}
                    </div>
                )}

                {/* ── 페이지네이션 ── */}
                {!query && (
                    <div className="py-10 flex items-center justify-between">
                      <button
                          onClick={() => void loadPosts(page - 1)}
                          disabled={page <= 0}
                          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        이전
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button
                                key={i}
                                onClick={() => void loadPosts(i)}
                                className={`w-7 h-7 rounded text-xs font-semibold transition-colors ${
                                    i === page
                                        ? 'bg-slate-900 text-white'
                                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                              {i + 1}
                            </button>
                        ))}
                      </div>

                      <button
                          onClick={() => void loadPosts(page + 1)}
                          disabled={page + 1 >= totalPages}
                          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                      >
                        다음
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                )}
              </>
          )}
        </div>
      </div>
  )
}