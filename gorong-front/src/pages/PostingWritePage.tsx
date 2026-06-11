import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ImagePlus, Loader2 } from 'lucide-react'
import Button from '../components/Button'
import PawRating from '../components/PawRating'
import { useAuth } from '../contexts/AuthContext'
import { uploadFileToS3 } from '../api/fileApi'
import {
  getMyVerifiedVenueIds,
  getParticipatedEvents,
  getPostingTemplate,
  getPostingDetail,
  publishPosting,
  updatePosting,
  type ImagePayload,
  type ParticipatedEvent,
  type ReviewDetail,
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

export default function PostingWritePage() {
  const { reviewId: editReviewId } = useParams<{ reviewId: string }>()
  const [searchParams] = useSearchParams()
  const preselectedEventId = searchParams.get('eventId')

  const isEditMode = Boolean(editReviewId)
  const auth = useAuth()
  const navigate = useNavigate()

  const [events, setEvents] = useState<ParticipatedEvent[]>([])
  const [verifiedVenueIds, setVerifiedVenueIds] = useState<string[]>([])
  const [composer, setComposer] = useState<ComposerState>(initialComposer)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const authorName = auth.user?.nickname?.trim() || auth.user?.email?.trim() || '익명'

  const loadParticipatedEvents = async () => {
    try {
      setEvents(await getParticipatedEvents())
    } catch (error) {
      console.error('참여 행사 조회 실패:', error)
      setEvents([])
    }
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

  const loadPostForEdit = async (reviewId: number) => {
    try {
      const detail = await getPostingDetail(reviewId)
      setComposer({
        reviewId: detail.id,
        eventId: detail.eventId,
        title: detail.title ?? '',
        reviewText: detail.reviewText ?? '',
        rating: detail.rating ?? 0,
        contents: detail.contents ?? '',
        images: detail.images.map((image) => ({
          imageUrl: image.imageUrl,
          originalImgName: image.originalImgName ?? 'uploaded-image.webp',
          saveImgName: image.saveImgName ?? image.imageUrl.split('/').pop() ?? 'image.webp',
        })),
        status: detail.status,
        reviewMetaEditable: detail.reviewMetaEditable,
      })
    } catch (error) {
      console.error('포스팅 상세 조회 실패:', error)
      alert('포스팅 정보를 불러올 수 없습니다.')
      navigate('/reviews')
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

      navigate('/reviews')
    } catch (error: any) {
      console.error('포스팅 저장 실패:', error)
      alert(error?.response?.data?.error || '포스팅 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    loadParticipatedEvents()
    getMyVerifiedVenueIds().then(setVerifiedVenueIds).catch(() => {})

    if (isEditMode && editReviewId) {
      loadPostForEdit(Number(editReviewId))
    } else if (preselectedEventId) {
      handleEventSelect(Number(preselectedEventId))
    }
  }, [])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700"
      >
        <ArrowLeft className="h-4 w-4" /> 뒤로가기
      </button>

      <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {isEditMode ? '포스팅 수정' : '포스팅 작성'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">한줄평만 작성해도 등록할 수 있습니다.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">행사 선택</label>
              <select
                className="w-full rounded-2xl border border-orange-100 bg-orange-50/40 px-4 py-3 outline-none"
                value={composer.eventId ?? ''}
                onChange={(event) => handleEventSelect(Number(event.target.value))}
                disabled={isEditMode}
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

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">게시글 제목</label>
              <input
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                value={composer.title}
                onChange={(event) => setComposer((current) => ({ ...current, title: event.target.value }))}
                placeholder="예: 늦봄 야외 전시 방문 후기"
              />
            </div>

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
              placeholder="블로그 글처럼 자세한 후기를 남겨 보세요."
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => navigate('/reviews')}>취소</Button>
          <Button onClick={() => void handleSubmit()} disabled={saving || uploading}>
            {saving ? '저장 중...' : isEditMode ? '포스팅 수정' : '포스팅 게시'}
          </Button>
        </div>
      </section>
    </div>
  )
}
