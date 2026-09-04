import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImagePlus, Loader2, PenSquare } from 'lucide-react'
import Button from '../components/Button'
import PawRating from '../components/PawRating'
import { useAuth } from '../contexts/AuthContext'
import { uploadFileToS3 } from '../api/fileApi'
import {
  getMyVerifiedVenueIds,
  getParticipatedEvents,
  getPostingTemplate,
  getPublishedPosts,
  publishPosting,
  deleteReview,
  type ImagePayload,
  type ParticipatedEvent,
  type ReviewDetail,
  type ReviewSummary,
  updatePosting,
} from '../api/reviewService'
import { optimizeImageFile } from '../utils/imageUpload'



type ComposerState = {
  reviewId: number | null
  eventId: number | null
  title: string
  reviewText: string
  rating: number
  contents: string
  images: ImagePayload[]
  status: 'REVIEW_ONLY' | 'PUBLISHED' | null
  reviewMetaEditable: boolean
}

const initialComposer: ComposerState = {
  reviewId: null,
  eventId: null,
  title: '',
  reviewText: '',
  rating: 0,
  contents: '',
  images: [],
  status: null,
  reviewMetaEditable: true,
}

export default function ReviewPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState<ReviewSummary[]>([])
  const [events, setEvents] = useState<ParticipatedEvent[]>([])
  const [verifiedVenueIds, setVerifiedVenueIds] = useState<string[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showComposer, setShowComposer] = useState(false)
  const [composer, setComposer] = useState<ComposerState>(initialComposer)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const authorName = auth.user?.nickname?.trim() || auth.user?.email?.trim() || '익명'

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

  const loadParticipatedEvents = async () => {
    try {
      setEvents(await getParticipatedEvents())
    } catch (error) {
      console.error('참여 행사 조회 실패:', error)
      setEvents([])
    }
  }

  useEffect(() => {
    loadPosts(0)
    loadParticipatedEvents()
    getMyVerifiedVenueIds().then(setVerifiedVenueIds).catch(() => {})
  }, [])

  const openComposer = () => {
    setComposer(initialComposer)
    setShowComposer(true)
  }

  const applyTemplate = (template: ReviewDetail | null, eventId: number, eventTitle: string) => {
    if (!template) {
      setComposer({
        ...initialComposer,
        eventId,
        title: `${eventTitle} 후기`,
      })
      return
    }

    setComposer({
      reviewId: template.id,
      eventId,
      title: template.title?.trim() || `${eventTitle} 후기`,
      reviewText: template.reviewText ?? '',
      rating: template.rating ?? 0,
      contents: template.contents ?? '',
      images: template.images.map((image) => ({
        imageUrl: image.imageUrl,
        originalImgName: image.originalImgName ?? 'uploaded-image.webp',
        saveImgName: image.saveImgName ?? image.imageUrl.split('/').pop() ?? 'image.webp',
      })),
      status: template.status,
      reviewMetaEditable: template.reviewMetaEditable,
    })
  }

  const handleEventSelect = async (eventId: number) => {
    const selectedEvent = events.find((event) => event.eventId === eventId)
    setComposer((current) => ({
      ...current,
      eventId,
      title: selectedEvent ? `${selectedEvent.title} 후기` : current.title,
    }))
    try {
      const template = await getPostingTemplate(eventId)
      applyTemplate(template, eventId, selectedEvent?.title ?? `행사 #${eventId}`)
    } catch (error) {
      console.error('포스팅 템플릿 조회 실패:', error)
    }
  }

  const handleImageUpload = async (files: FileList | null) => {
    if (!files?.length) return

    const pickedFiles = Array.from(files)
    if (composer.images.length + pickedFiles.length > 5) {
      alert('이미지는 최대 5장까지 첨부할 수 있습니다.')
      return
    }

    setUploading(true)
    try {
      const uploaded: ImagePayload[] = []
      for (const file of pickedFiles) {
        const optimized = await optimizeImageFile(file)
        const response = await uploadFileToS3(optimized, 'POST_PHOTO', true)
        uploaded.push({
          imageUrl: response.fileUrl,
          originalImgName: file.name,
          saveImgName: String(response.key).split('/').pop() ?? file.name,
        })
      }

      setComposer((current) => ({
        ...current,
        images: [...current.images, ...uploaded],
      }))
    } catch (error) {
      console.error('이미지 업로드 실패:', error)
      alert('이미지 업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (!composer.eventId) {
      alert('행사를 선택해 주세요.')
      return
    }
    if (!verifiedVenueIds.includes(String(composer.eventId))) {
      alert('현장 방문 인증이 완료된 행사만 포스팅할 수 있습니다.')
      return
    }
    if (!composer.title.trim() || !composer.reviewText.trim() || composer.rating === 0) {
      alert('제목, 한 줄 리뷰, 발자국 평점을 입력해 주세요.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        reviewId: composer.reviewId,
        eventId: composer.eventId,
        title: composer.title.trim(),
        reviewText: composer.reviewText.trim(),
        rating: composer.rating,
        contents: composer.contents.trim(),
        authorName,
        images: composer.images,
      }

      if (composer.reviewId) {
        await updatePosting(composer.reviewId, payload)
      } else {
        await publishPosting(payload)
      }

      setShowComposer(false)
      setComposer(initialComposer)
      await loadPosts(0)
    } catch (error: any) {
      console.error('포스팅 저장 실패:', error)
      alert(error?.response?.data?.error || '포스팅 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

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
          <Button className="inline-flex items-center gap-2 self-start px-6 py-3" onClick={openComposer}>
            <PenSquare className="h-4 w-4" />
            글쓰기
          </Button>
        </div>
      </section>

      {showComposer && (
        <section className="mt-8 rounded-[28px] border border-orange-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">포스팅 작성</h2>
              <p className="mt-1 text-sm text-slate-500">한줄평만 작성해도 등록할 수 있습니다.</p>
            </div>
            <Button variant="secondary" onClick={() => setShowComposer(false)}>닫기</Button>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">행사 선택</label>
                <select
                  className="w-full rounded-2xl border border-orange-100 bg-orange-50/40 px-4 py-3 outline-none"
                  value={composer.eventId ?? ''}
                  onChange={(event) => handleEventSelect(Number(event.target.value))}
                >
                  <option value="">참여한 행사를 선택해 주세요</option>
                  {events.map((event) => (
                    <option key={event.eventId} value={event.eventId}>
                      {verifiedVenueIds.includes(String(event.eventId)) ? '🏅 ' : ''}{event.title}
                    </option>
                  ))}
                </select>
                {composer.eventId && !verifiedVenueIds.includes(String(composer.eventId)) && (
                  <p style={{ color: 'orange', fontSize: 12, marginTop: 6 }}>
                    ⚠️ 현장 방문 인증이 완료된 행사만 포스팅할 수 있습니다. 앱에서 지오펜싱 인증을 먼저 해주세요.
                  </p>
                )}
              </div>

              {/* <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">게시글 제목</label>
                <input
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                  value={composer.title}
                  onChange={(event) => setComposer((current) => ({ ...current, title: event.target.value }))}
                  placeholder="예: 늦봄 야외 전시 방문 후기"
                />
              </div> */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">한 줄 리뷰</label>
                <textarea
                  className="min-h-[100px] w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                  value={composer.reviewText}
                  onChange={(event) => setComposer((current) => ({ ...current, reviewText: event.target.value }))}
                  disabled={!composer.reviewMetaEditable}
                  placeholder="행사에 대한 인상을 한 줄로 남겨 주세요."
                />
                {!composer.reviewMetaEditable && (
                  <p className="mt-2 text-xs font-medium text-rose-500">한 줄 리뷰와 평점은 작성 후 7일이 지나 수정이 잠겼습니다.</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">발자국 평점</label>
                <PawRating
                  value={composer.rating}
                  onChange={(rating) => setComposer((current) => ({ ...current, rating }))}
                  readOnly={!composer.reviewMetaEditable}
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-semibold text-slate-700">사진 첨부</label>
                  <span className="text-xs text-slate-400">최대 5장, 업로드 전 WebP 압축</span>
                </div>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-orange-300 bg-orange-50 px-4 py-5 text-sm font-medium text-orange-600">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {uploading ? '업로드 중...' : '사진 추가'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => void handleImageUpload(event.target.files)}
                  />
                </label>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {composer.images.map((image, index) => (
                    <div key={`${image.imageUrl}-${index}`} className="relative overflow-hidden rounded-2xl border border-slate-200">
                      <img src={image.imageUrl} alt={`업로드 이미지 ${index + 1}`} className="h-28 w-full object-cover" />
                      <button
                        type="button"
                        className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-xs text-white"
                        onClick={() => setComposer((current) => ({
                          ...current,
                          images: current.images.filter((_, currentIndex) => currentIndex !== index),
                        }))}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">본문</label>
              <textarea
                className="min-h-[420px] w-full rounded-[26px] border border-slate-200 bg-[linear-gradient(#ffffff,#ffffff),repeating-linear-gradient(transparent,transparent_31px,#f4f4f5_31px,#f4f4f5_32px)] px-5 py-4 text-[15px] leading-8 outline-none"
                value={composer.contents}
                onChange={(event) => setComposer((current) => ({ ...current, contents: event.target.value }))}
                placeholder="템플릿 이미지와 한 줄 리뷰를 바탕으로, 블로그 글처럼 자세한 후기를 남겨 보세요."
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowComposer(false)}>취소</Button>
            <Button onClick={() => void handleSubmit()} disabled={saving || uploading}>
              {saving ? '저장 중...' : composer.status === 'PUBLISHED' ? '포스팅 수정' : '포스팅 게시'}
            </Button>
          </div>
        </section>
      )}

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

