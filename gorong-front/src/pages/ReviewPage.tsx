import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PenSquare } from 'lucide-react'
import Button from '../components/Button'
import PawRating from '../components/PawRating'
import {
  getPublishedPosts,
  deleteReview,
  type ReviewSummary,
} from '../api/reviewService'

export default function ReviewPage() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState<ReviewSummary[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const loadPosts = async (nextPage: number) => {
    setLoading(true)
    try {
      const response = await getPublishedPosts(nextPage, 8)
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

  useEffect(() => {
    loadPosts(0)
  }, [])

  const handleDelete = async (
  e: React.MouseEvent,
  reviewId: number
) => {
  e.stopPropagation()

  if (!window.confirm('정말 삭제하시겠습니까?')) {
    return
  }

  try {
    await deleteReview(reviewId)
    await loadPosts(page)
  } catch (error) {
    console.error(error)
    alert('삭제 실패')
  }
}

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-orange-50 via-white to-amber-100 p-8 shadow-[0_20px_60px_rgba(251,146,60,0.18)]">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-orange-500">Posting</p>
            <h1 className="text-4xl font-black text-slate-900">참여한 행사의 경험을 공유해 보세요.</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              리뷰로 행사에 대한 경험을 남겨주세요. 사진과 자세한 후기는 다른 사람들에게 생생한 경험을 전달할 수 있습니다.
            </p>
          </div>
          <Button className="inline-flex items-center gap-2 self-start px-6 py-3" onClick={() => navigate('/posting/write')}>
            <PenSquare className="h-4 w-4" />
            글쓰기
          </Button>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">리뷰 목록</h2>
            <p className="mt-1 text-sm text-slate-500">다른 사용자들이 남긴 리뷰를 확인해 보세요.</p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500">리뷰를 불러오는 중입니다.</div>
        ) : posts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">아직 공개된 포스팅이 없습니다.</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {posts.map((post) => (
              <article
                key={post.id}
                className="cursor-pointer overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition-transform hover:-translate-y-1"
                onClick={() => navigate(`/posting/${post.id}`)}
              >
                {post.images[0] && (
                  <img src={post.images[0].imageUrl} alt={post.title} className="h-56 w-full object-cover" />
                )}
                <div className="space-y-4 p-6">
                  <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
                    <span className="rounded-full bg-orange-50 px-3 py-1 font-medium text-orange-600">{post.eventTitle}</span>
                    <span>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">{post.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{post.contents || post.reviewText}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{post.authorName}</p>
                      <p className="text-xs text-slate-400">간편 리뷰: {post.reviewText}</p>
                    </div>
                    <PawRating value={post.rating} readOnly size="sm" />
                    <button
                      onClick={(e) => handleDelete(e, post.id)}
                      className="rounded bg-red-500 px-2 py-1 text-xs text-white"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="secondary" onClick={() => void loadPosts(page - 1)} disabled={page <= 0}>이전</Button>
          <span className="text-sm text-slate-500">{page + 1} / {totalPages}</span>
          <Button variant="secondary" onClick={() => void loadPosts(page + 1)} disabled={page + 1 >= totalPages}>다음</Button>
        </div>
      </section>
    </div>
  )
}

