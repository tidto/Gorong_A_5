import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader2, FileText, Image, Clock, X, Upload } from 'lucide-react'
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
import PostingEditor from '../components/PostingEditor'

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

  const ratingLabels = ['', '별로예요', '그저 그래요', '괜찮아요', '좋아요', '최고예요']
  const charCount = composer.contents.replace(/<[^>]*>/g, '').length
  const imageCount = composer.images.length
  const readingTime = Math.max(1, Math.ceil(charCount / 500))

  return (
    <div className="min-h-screen bg-[#fafaf8] text-[#1a1714]">
      {/* Page header section */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-4 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="mb-3 flex items-center gap-2 text-sm font-medium text-[#FF8A3D] hover:text-[#e87730] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> 뒤로가기
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1a1714]">
              {isEditMode ? '포스팅 수정' : '포스팅 작성'}
            </h1>
            <p className="mt-1 text-sm text-[#8c887f]">특별한 여행을 기록해보세요</p>
          </div>
          {(composer.title || composer.reviewText || charCount > 0) && (
            <div className="hidden sm:flex items-center gap-1.5 text-sm text-emerald-500">
              <span>작성 중</span>
            </div>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 pb-8 lg:grid lg:grid-cols-[1fr_260px] lg:gap-8">
        {/* Left column */}
        <main className="space-y-6">
          {/* Section 1: Event Select */}
          <section className="bg-white rounded-2xl border border-[#e0dbd3] shadow-sm">
            <div className="px-6 py-5">
              <label className="block text-xs font-semibold uppercase tracking-widest text-[#8c887f] mb-3">
                참여한 행사 선택
              </label>
              <select
                className="w-full px-4 py-3 rounded-xl border border-[#e0dbd3] bg-[#f7f6f4] text-sm text-[#1a1714] focus:outline-none focus:ring-2 focus:ring-[#FF8A3D]/30 focus:border-[#FF8A3D] transition-all"
                value={composer.eventId ?? ''}
                onChange={(event) => handleEventSelect(Number(event.target.value))}
                disabled={isEditMode}
              >
                <option value="">참여한 행사를 선택해주세요</option>
                {events.map((event) => (
                  <option key={event.eventId} value={event.eventId}>
                    {verifiedVenueIds.includes(String(event.eventId)) ? '🏅 ' : ''}{event.title}
                  </option>
                ))}
              </select>
              {composer.eventId && !verifiedVenueIds.includes(String(composer.eventId)) && (
                <p className="mt-2 text-xs font-medium text-[#FF8A3D]">
                  ⚠️ 현장 방문 인증이 완료된 행사만 포스팅할 수 있습니다. 앱에서 지오펜싱 인증을 먼저 해주세요.
                </p>
              )}
            </div>
          </section>

          {/* Section 2: Title */}
          <section className="bg-white rounded-2xl border border-[#e0dbd3] shadow-sm">
            <div className="px-6 py-5">
              <label className="block text-xs font-semibold uppercase tracking-widest text-[#8c887f] mb-3">
                게시글 제목
              </label>
              <input
                type="text"
                value={composer.title}
                onChange={(event) => setComposer((current) => ({ ...current, title: event.target.value }))}
                placeholder="오늘의 특별한 여행 이야기를 적어보세요"
                className="w-full text-xl sm:text-2xl font-bold text-[#1a1714] placeholder-[#c4bfb8] bg-transparent border-none outline-none leading-snug"
              />
              <div className="mt-3 h-0.5 bg-gradient-to-r from-[#FF8A3D]/60 to-transparent rounded-full" />
            </div>
          </section>

          {/* Section 3: Review + Rating */}
          <section className="bg-white rounded-2xl border border-[#e0dbd3] shadow-sm">
            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-[#8c887f] mb-3">
                  한 줄 리뷰
                </label>
                <textarea
                  className="min-h-[80px] w-full px-4 py-3 rounded-xl border border-[#e0dbd3] bg-[#f7f6f4] text-sm text-[#1a1714] placeholder-[#c4bfb8] focus:outline-none focus:ring-2 focus:ring-[#FF8A3D]/30 focus:border-[#FF8A3D] transition-all resize-none"
                  value={composer.reviewText}
                  onChange={(event) => setComposer((current) => ({ ...current, reviewText: event.target.value }))}
                  disabled={!composer.reviewMetaEditable}
                  placeholder="행사에 대한 인상을 한 줄로 남겨주세요"
                />
                {!composer.reviewMetaEditable && (
                  <p className="mt-2 text-xs font-medium text-rose-500">한 줄 리뷰와 평점은 작성 후 7일이 지나 수정이 잠겼습니다.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-[#8c887f] mb-3">
                  발바닥 평점
                </label>
                <PawRating
                  value={composer.rating}
                  onChange={(rating) => setComposer((current) => ({ ...current, rating }))}
                  readOnly={!composer.reviewMetaEditable}
                />
              </div>
            </div>
          </section>

          {/* Section 4: Body */}
          <section className="bg-white rounded-2xl border border-[#e0dbd3] shadow-sm">
            <div className="px-6 pt-5 pb-2">
              <label className="block text-xs font-semibold uppercase tracking-widest text-[#8c887f] mb-4">
                본문 작성
              </label>
            </div>
            <div className="px-6 pb-5">
              <PostingEditor
                content={composer.contents}
                onUpdate={(html) => setComposer((prev) => ({ ...prev, contents: html }))}
              />
            </div>
          </section>

          {/* Section 5: Image Upload */}
          <section className="bg-white rounded-2xl border border-[#e0dbd3] shadow-sm">
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-xs font-semibold uppercase tracking-widest text-[#8c887f]">
                  사진 첨부
                </label>
                <span className="text-xs text-[#c4bfb8]">최대 5장</span>
              </div>
              {composer.images.length < 5 && (
                <label className="border-2 border-dashed border-[#e0dbd3] bg-[#faf9f7] rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-[#FF8A3D] hover:bg-[#fff4ec] transition-all">
                  <div className="w-12 h-12 rounded-full bg-[#fff4ec] flex items-center justify-center">
                    {uploading ? (
                      <Loader2 className="w-5 h-5 text-[#FF8A3D] animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5 text-[#FF8A3D]" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-[#1a1714]">
                      {uploading ? '업로드 중...' : '이미지를 드래그하거나 클릭해 업로드'}
                    </p>
                    <p className="text-xs text-[#8c887f] mt-1">JPG, PNG, WebP 지원 · 최대 5장</p>
                  </div>
                  <span className="text-xs px-3 py-1 bg-white border border-[#e0dbd3] rounded-full text-[#5a5650]">
                    {composer.images.length}/5장
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => void handleImageUpload(event.target.files)}
                  />
                </label>
              )}
              {composer.images.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {composer.images.map((image, index) => (
                    <div key={`${image.imageUrl}-${index}`} className="relative group rounded-xl overflow-hidden bg-[#f2f0ed] aspect-video">
                      <img
                        src={image.imageUrl}
                        alt={`업로드 이미지 ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => setComposer((current) => ({
                            ...current,
                            images: current.images.filter((_, currentIndex) => currentIndex !== index),
                          }))}
                          className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow"
                        >
                          <X className="w-4 h-4 text-[#1a1714]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>

        {/* Right panel - desktop only */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            {/* Stats card */}
            <div className="bg-white rounded-2xl border border-[#e0dbd3] shadow-sm p-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#8c887f] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> 글자 수
                  </span>
                  <span className="font-semibold text-[#1a1714]">{charCount.toLocaleString()}자</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#8c887f] flex items-center gap-1.5">
                    <Image className="w-3.5 h-3.5" /> 이미지
                  </span>
                  <span className="font-semibold text-[#1a1714]">{imageCount}장</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#8c887f] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> 예상 읽기
                  </span>
                  <span className="font-semibold text-[#1a1714]">약 {readingTime}분</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[#f2f0ed]">
                <div className="w-full bg-[#f2f0ed] rounded-full h-1.5">
                  <div
                    className="bg-[#FF8A3D] h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (charCount / 1000) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-[#c4bfb8] mt-1.5 text-right">권장 분량 1,000자</p>
              </div>
            </div>

            {/* Writing guide */}
            <div className="bg-[#fff4ec] rounded-2xl border border-[#ffd9b8] p-5">
              <p className="text-xs font-semibold text-[#c85d00] uppercase tracking-wider mb-3">✍️ 작성 가이드</p>
              <ul className="space-y-2 text-xs text-[#a84c00] leading-relaxed">
                <li>• 사진을 첨부할 때 행사 전후 사진으로 첨부하시기를 권장합니다.</li>
                <li>• 행사에 대한 후기를 솔직하게 적어주세요</li>
                <li>• 도움이 될 팁 공유 환영!</li>
              </ul>
            </div>

            {/* Rating preview */}
            {composer.rating > 0 && (
              <div className="bg-white rounded-2xl border border-[#e0dbd3] shadow-sm p-5">
                <p className="text-xs font-semibold text-[#8c887f] uppercase tracking-wider mb-3">선택한 평점</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={i}
                      className={`w-7 h-7 rounded-full ${i <= composer.rating ? 'bg-[#FF8A3D]' : 'bg-[#e0dbd3]'}`}
                    />
                  ))}
                </div>
                <p className="text-sm font-medium text-[#FF8A3D] mt-2">
                  {ratingLabels[composer.rating]}
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Bottom action bar - fixed */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#e0dbd3]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/reviews')}
            className="px-4 py-2 rounded-xl border border-[#e0dbd3] text-sm text-[#5a5650] hover:bg-[#f2f0ed] transition-all"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving || uploading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF8A3D] text-white text-sm font-semibold hover:bg-[#e87730] active:scale-95 transition-all shadow-md shadow-[#FF8A3D]/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '저장 중...' : isEditMode ? '포스팅 수정' : '포스팅 게시'}
          </button>
        </div>
      </div>

      {/* Bottom padding for fixed bar + mobile nav */}
      <div className="h-24" />
    </div>
  )
}
