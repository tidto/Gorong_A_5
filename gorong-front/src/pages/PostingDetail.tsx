import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PawRating from '../components/PawRating'
import { getPostingDetail, type ReviewDetail } from '../api/reviewService'

export default function PostingDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [post, setPost] = useState<ReviewDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      try {
        setLoading(true)
        setPost(await getPostingDetail(Number(id)))
      } catch (error) {
        console.error('포스팅 상세 조회 실패:', error)
        setPost(null)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [id])

  if (loading) {
    return <div className="p-20 text-center text-slate-500">포스팅을 불러오는 중입니다.</div>
  }

  if (!post) {
    return <div className="p-20 text-center text-slate-500">포스팅을 찾을 수 없습니다.</div>
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 font-medium text-orange-600">
        <ArrowLeft className="h-5 w-5" /> 뒤로가기
      </button>

      <article className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        {post.images[0] && (
          <img src={post.images[0].imageUrl} alt={post.title} className="h-80 w-full object-cover" />
        )}

        <div className="space-y-6 p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600">{post.eventTitle}</span>
            <span className="text-sm text-slate-400">{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
          </div>

          <div>
            <h1 className="text-4xl font-black text-slate-900">{post.title}</h1>
            <p className="mt-3 text-lg text-slate-600">{post.reviewText}</p>
          </div>

          <div className="flex items-center justify-between rounded-3xl bg-slate-50 px-5 py-4">
            <div>
              <p className="font-semibold text-slate-900">{post.authorName}</p>
              <p className="text-sm text-slate-400">간편 리뷰와 연결된 정식 포스팅</p>
            </div>
            <PawRating value={post.rating} readOnly />
          </div>

          {post.images.length > 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {post.images.slice(1).map((image, index) => (
                <img key={`${image.imageUrl}-${index}`} src={image.imageUrl} alt={`포스팅 이미지 ${index + 2}`} className="h-60 w-full rounded-3xl object-cover" />
              ))}
            </div>
          )}

          <div className="rounded-[28px] bg-white text-[16px] leading-8 text-slate-700 whitespace-pre-wrap">
            {post.contents || '본문이 아직 작성되지 않았습니다.'}
          </div>
        </div>
      </article>
    </div>
  )
}
