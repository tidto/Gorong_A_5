import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, Clock, ImagePlus, Loader2, Navigation, Phone, Users, Wallet } from 'lucide-react'
import axiosInstance from '../api/axiosInstance'
import MapView from '../components/MapView'
import IconLabel from '../components/IconLabel'
import AccessibilityBadge from '../components/AccessibilityBadge'
import PawRating from '../components/PawRating'
import { useAuth } from '../contexts/AuthContext'
import { uploadFileToS3 } from '../api/fileApi'
import { getEventReviews, saveQuickReview, type ImagePayload, type ReviewSummary } from '../api/reviewService'
import { optimizeImageFile } from '../utils/imageUpload'

interface EventData {
  title: string
  addr1: string
  mapx: string
  mapy: string
  contentid: string
  firstimage?: string
  overview?: string
  usefee?: string
  cat3?: string
  tel?: string
  parking?: string
  elevator?: string
  restroom?: string
}

const DEFAULT_LOCATION = { lat: 35.8956, lng: 128.6224 }
const DEFAULT_IMAGE = '/images/default-event.png'

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const isValidLocation = (location?: { lat?: number; lng?: number } | null) =>
  !!location && typeof location.lat === 'number' && typeof location.lng === 'number' && location.lat !== 0 && location.lng !== 0

export default function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const auth = useAuth()
  const [event, setEvent] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [soloApplied, setSoloApplied] = useState(false)
  const [soloLoading, setSoloLoading] = useState(false)
  const [showDateModal, setShowDateModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [reviews, setReviews] = useState<ReviewSummary[]>([])
  const [reviewPage, setReviewPage] = useState(0)
  const [reviewTotalPages, setReviewTotalPages] = useState(1)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewText, setReviewText] = useState('')
  const [rating, setRating] = useState(0)
  const [reviewMetaEditable, setReviewMetaEditable] = useState(true)
  const [images, setImages] = useState<ImagePayload[]>([])
  const [savingReview, setSavingReview] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const authorName = auth.user?.nickname?.trim() || auth.user?.email?.trim() || '익명'
  const currentUserId = (() => {
    const stored = localStorage.getItem('gorong-db-user')
    if (!stored) return NaN
    try {
      return Number(JSON.parse(stored)?.id)
    } catch {
      return NaN
    }
  })()

  useEffect(() => {
    const fetchEventDetail = async () => {
      if (!id) return

      try {
        setLoading(true)

        const headers: Record<string, string> = {}
        const firebaseUser = auth.firebaseUser as { getIdToken?: () => Promise<string> } | null
        if (firebaseUser && typeof firebaseUser.getIdToken === 'function') {
          const token = await firebaseUser.getIdToken()
          headers.Authorization = `Bearer ${token}`
        }

        const response = await axios.get(`/api/public/map/${id}`, { headers })
        setEvent(response.data)

        try {
          const checkRes = await axiosInstance.get('/event-participation/solo/check', {
            params: { eventContentId: id },
          })
          setSoloApplied(checkRes.data.applied)
        } catch {
          setSoloApplied(false)
        }
      } catch (error) {
        console.error('행사 상세 로드 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEventDetail()
  }, [id, auth.user])

  useEffect(() => {
    const fallback = () => setUserLocation(DEFAULT_LOCATION)
    if (!navigator.geolocation) {
      fallback()
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const current = { lat: position.coords.latitude, lng: position.coords.longitude }
        setUserLocation(isValidLocation(current) ? current : DEFAULT_LOCATION)
      },
      fallback,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }, [])

  const loadReviews = async (page: number) => {
    if (!id) return
    setReviewLoading(true)
    try {
      const response = await getEventReviews(Number(id), page, 10)
      setReviews(response.content)
      setReviewPage(response.page)
      setReviewTotalPages(Math.max(response.totalPages, 1))

      const mine = response.content.find((review) => review.userId === currentUserId)
      if (mine) {
        setReviewText(mine.reviewText ?? '')
        setRating(mine.rating ?? 0)
        setReviewMetaEditable(mine.reviewMetaEditable)
        setImages(mine.images.map((image) => ({
          imageUrl: image.imageUrl,
          originalImgName: image.originalImgName ?? 'uploaded-image.webp',
          saveImgName: image.saveImgName ?? image.imageUrl.split('/').pop() ?? 'image.webp',
        })))
      }
    } catch (error) {
      console.error('행사 리뷰 조회 실패:', error)
      setReviews([])
    } finally {
      setReviewLoading(false)
    }
  }

  useEffect(() => {
    void loadReviews(0)
  }, [id])

  const handleSoloCancel = async () => {
    if (!window.confirm('혼자 참여 요청을 취소하시겠습니까?')) return
    try {
      await axiosInstance.delete('/event-participation/solo', {
        params: { eventContentId: id },
      })
      setSoloApplied(false)
    } catch {
      alert('참여 취소 중 오류가 발생했습니다.')
    }
  }

  const handleSoloApplyConfirm = async () => {
    if (!selectedDate) {
      alert('방문 날짜를 선택해 주세요.')
      return
    }

    setShowDateModal(false)
    setSoloLoading(true)
    try {
      await axiosInstance.post('/event-participation/solo', {
        eventContentId: id,
        eventTitle: event?.title ?? '',
        visitDate: selectedDate,
      })
      setSoloApplied(true)
      alert('혼자 참여 요청이 완료되었습니다.')
    } catch {
      alert('참여 요청 중 오류가 발생했습니다.')
    } finally {
      setSoloLoading(false)
    }
  }

  const handleImageUpload = async (files: FileList | null) => {
    if (!files?.length) return
    if (images.length + files.length > 5) {
      alert('이미지는 최대 5장까지 첨부할 수 있습니다.')
      return
    }

    setUploadingImage(true)
    try {
      const uploaded: ImagePayload[] = []
      for (const file of Array.from(files)) {
        const optimized = await optimizeImageFile(file)
        const response = await uploadFileToS3(optimized, 'POST_PHOTO', true)
        uploaded.push({
          imageUrl: response.fileUrl,
          originalImgName: file.name,
          saveImgName: String(response.key).split('/').pop() ?? file.name,
        })
      }
      setImages((current) => [...current, ...uploaded])
    } catch (error) {
      console.error('리뷰 이미지 업로드 실패:', error)
      alert('이미지 업로드에 실패했습니다.')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSaveQuickReview = async () => {
    if (!id) return
    if (!reviewText.trim() || rating === 0) {
      alert('한 줄 리뷰와 발자국 평점을 입력해 주세요.')
      return
    }

    setSavingReview(true)
    try {
      const saved = await saveQuickReview(Number(id), {
        reviewText: reviewText.trim(),
        rating,
        authorName,
        images,
      })
      setReviewMetaEditable(saved.reviewMetaEditable)
      await loadReviews(0)
      alert('간편 리뷰가 저장되었습니다.')
    } catch (error: any) {
      console.error('간편 리뷰 저장 실패:', error)
      alert(error?.response?.data?.error || '간편 리뷰 저장 중 오류가 발생했습니다.')
    } finally {
      setSavingReview(false)
    }
  }

  const handleOpenKakaoMapRoute = () => {
    if (!event) return
    const eventLat = Number(event.mapy)
    const eventLng = Number(event.mapx)
    if (!isValidLocation({ lat: eventLat, lng: eventLng })) {
      alert('행사 위치 정보가 없습니다.')
      return
    }

    const destinationName = encodeURIComponent(event.title || '행사 위치')
    if (isValidLocation(userLocation)) {
      window.open(`https://map.kakao.com/link/from/현재위치,${userLocation!.lat},${userLocation!.lng}/to/${destinationName},${eventLat},${eventLng}`, '_blank')
    } else {
      window.open(`https://map.kakao.com/link/to/${destinationName},${eventLat},${eventLng}`, '_blank')
    }
  }

  if (loading) return <div className="p-20 text-center font-bold text-orange-600">행사 정보를 불러오는 중입니다.</div>
  if (!event) return <div className="p-20 text-center text-gray-500">행사를 찾을 수 없습니다.</div>

  const mapData = [{
    title: event.title,
    addr1: event.addr1,
    mapx: event.mapx,
    mapy: event.mapy,
    contentid: event.contentid,
    firstimage: event.firstimage,
  }]

  const isAccessible = (field?: string) => !!field && field.trim().toUpperCase() !== 'N' && field.trim() !== ''
  const distanceText = userLocation
    ? `${calculateDistance(userLocation.lat, userLocation.lng, Number(event.mapy), Number(event.mapx)).toFixed(1)} km`
    : '위치 계산 중...'

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {showDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900">방문 날짜를 선택해 주세요</h2>
            <input
              type="date"
              value={selectedDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3"
            />
            <div className="mt-5 flex gap-3">
              <button className="flex-1 rounded-2xl border border-slate-200 py-3" onClick={() => setShowDateModal(false)}>취소</button>
              <button className="flex-1 rounded-2xl bg-orange-500 py-3 font-semibold text-white" onClick={() => void handleSoloApplyConfirm()}>참여 요청</button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 font-medium text-orange-600">
        <ArrowLeft className="h-5 w-5" /> 뒤로가기
      </button>

      <div className="overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-xl">
        <div className="relative h-80">
          <img
            src={event.firstimage || DEFAULT_IMAGE}
            className="h-full w-full object-cover"
            alt={event.title}
            onError={(eventTarget) => { (eventTarget.target as HTMLImageElement).src = DEFAULT_IMAGE }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent p-8">
            <div className="absolute bottom-8">
              <h1 className="text-4xl font-black text-white">{event.title}</h1>
              <p className="mt-2 text-white/90">{event.addr1}</p>
            </div>
          </div>
        </div>

        <div className="space-y-10 p-8">
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <DetailInfoCard icon={<Clock className="h-4 w-4" />} label="기간" value="상세 일정은 주최 측 공지 참고" />
            <DetailInfoCard icon={<Wallet className="h-4 w-4" />} label="요금" value={event.usefee || '무료'} />
            <DetailInfoCard icon={<Users className="h-4 w-4" />} label="분류" value={event.cat3 || '문화 행사'} />
            <DetailInfoCard icon={<Phone className="h-4 w-4" />} label="문의" value={event.tel || '정보 없음'} />
          </section>

          {event.overview && (
            <section>
              <h2 className="mb-3 text-2xl font-bold text-slate-900">행사 소개</h2>
              <p className="leading-7 text-slate-600">{event.overview}</p>
            </section>
          )}

          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">행사 위치</h2>
                <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-600">
                  현재 위치에서 {distanceText}
                </span>
              </div>
              <div className="mb-4 h-64 overflow-hidden rounded-2xl border border-slate-200">
                <MapView
                  data={mapData}
                  onDetailClick={() => {}}
                  userLocation={userLocation}
                  mapCenter={{ lat: parseFloat(event.mapy), lng: parseFloat(event.mapx) }}
                />
              </div>
              <button
                onClick={handleOpenKakaoMapRoute}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white"
              >
                <Navigation className="h-4 w-4 text-orange-400" />
                카카오맵 길찾기
              </button>
            </div>

            <div>
              <h2 className="mb-4 text-2xl font-bold text-slate-900">접근성 정보</h2>
              <div className="mb-4 flex gap-2">
                {(isAccessible(event.parking) || isAccessible(event.elevator) || isAccessible(event.restroom)) && <IconLabel type="barrierFree" />}
              </div>
              <div className="space-y-2">
                {isAccessible(event.parking) && <AccessibilityBadge type="verified" label="주차" description={event.parking!} />}
                {isAccessible(event.elevator) && <AccessibilityBadge type="verified" label="엘리베이터" description={event.elevator!} />}
                {isAccessible(event.restroom) && <AccessibilityBadge type="verified" label="화장실" description={event.restroom!} />}
                {!isAccessible(event.parking) && !isAccessible(event.elevator) && !isAccessible(event.restroom) && (
                  <AccessibilityBadge type="verified" label="안내" description="세부 접근성 정보는 추후 업데이트 예정입니다." />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
        {soloApplied ? (
          <button
            onClick={() => void handleSoloCancel()}
            className="w-full rounded-2xl border-2 border-rose-300 bg-white py-4 text-lg font-bold text-rose-500 sm:w-1/2 lg:w-1/3"
          >
            혼자 참여 요청 취소
          </button>
        ) : (
          <button
            onClick={() => setShowDateModal(true)}
            disabled={soloLoading}
            className="w-full rounded-2xl border-2 border-orange-500 bg-white py-4 text-lg font-bold text-orange-500 sm:w-1/2 lg:w-1/3"
          >
            {soloLoading ? '요청 중...' : '혼자 참여 요청'}
          </button>
        )}

        <button
          onClick={() => navigate('/group', {
            state: {
              eventId: id,
              eventTitle: event.title,
              eventImage: event.firstimage || DEFAULT_IMAGE,
            },
          })}
          className="w-full rounded-2xl bg-orange-500 py-4 text-lg font-bold text-white shadow-md sm:w-1/2 lg:w-1/3"
        >
          동행 그룹 구하기
        </button>
      </div>

      <section className="mt-12 rounded-[32px] border border-orange-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">Quick Review</p>
            <h2 className="text-3xl font-black text-slate-900">참여 버튼 아래에서 바로 남기는 간편 리뷰</h2>
            <p className="mt-2 text-sm text-slate-500">한 줄 리뷰와 발자국 평점은 작성 후 7일이 지나면 잠기고, 사진은 캣타워 갤러리에도 자동 저장됩니다.</p>
          </div>
          <button
            className="rounded-full border border-orange-200 px-4 py-2 text-sm font-semibold text-orange-600"
            onClick={() => navigate('/reviews')}
          >
            정식 포스팅으로 이어쓰기
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-5 rounded-[28px] bg-orange-50/70 p-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">한 줄 리뷰</label>
              <textarea
                className="min-h-[110px] w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 outline-none"
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                disabled={!reviewMetaEditable}
                placeholder="행사를 다녀온 한 줄 감상을 남겨 주세요."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">발자국 평점</label>
              <PawRating value={rating} onChange={setRating} readOnly={!reviewMetaEditable} />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-semibold text-slate-700">사진 첨부</label>
                <span className="text-xs text-slate-400">최대 5장</span>
              </div>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-orange-300 bg-white px-4 py-4 text-sm font-medium text-orange-600">
                {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                {uploadingImage ? '업로드 중...' : '사진 추가'}
                <input type="file" multiple accept="image/*" className="hidden" onChange={(event) => void handleImageUpload(event.target.files)} />
              </label>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((image, index) => (
                  <div key={`${image.imageUrl}-${index}`} className="relative overflow-hidden rounded-2xl border border-slate-200">
                    <img src={image.imageUrl} alt={`리뷰 이미지 ${index + 1}`} className="h-24 w-full object-cover" />
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[11px] text-white"
                      onClick={() => setImages((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => void handleSaveQuickReview()}
              disabled={savingReview || uploadingImage}
              className="w-full rounded-2xl bg-slate-900 py-3 font-semibold text-white"
            >
              {savingReview ? '저장 중...' : '간편 리뷰 저장'}
            </button>
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">리뷰 목록</h3>
              <span className="text-sm text-slate-400">{reviews.length}개 표시 중</span>
            </div>

            <div className="space-y-4">
              {reviewLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">리뷰를 불러오는 중입니다.</div>
              ) : reviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">아직 등록된 리뷰가 없습니다.</div>
              ) : (
                reviews.map((review) => (
                  <article key={review.id} className="rounded-[26px] border border-slate-200 bg-white p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">{review.authorName}</p>
                        <p className="mt-1 text-xs text-slate-400">{new Date(review.createdAt).toLocaleDateString('ko-KR')}</p>
                      </div>
                      <PawRating value={review.rating} readOnly size="sm" />
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-700">{review.reviewText}</p>
                    {review.images.length > 0 && (
                      <div className="mt-4 flex gap-2 overflow-x-auto">
                        {review.images.map((image, index) => (
                          <img key={`${image.imageUrl}-${index}`} src={image.imageUrl} alt={`리뷰 이미지 ${index + 1}`} className="h-24 w-32 rounded-2xl object-cover" />
                        ))}
                      </div>
                    )}
                    {review.status === 'PUBLISHED' && (
                      <button
                        className="mt-4 rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600"
                        onClick={() => navigate(`/posting/${review.id}`)}
                      >
                        정식 포스팅 보러가기
                      </button>
                    )}
                  </article>
                ))
              )}
            </div>

            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                className="rounded-full border border-slate-200 px-4 py-2 text-sm disabled:opacity-40"
                onClick={() => void loadReviews(reviewPage - 1)}
                disabled={reviewPage <= 0}
              >
                이전
              </button>
              <span className="text-sm text-slate-500">{reviewPage + 1} / {reviewTotalPages}</span>
              <button
                className="rounded-full border border-slate-200 px-4 py-2 text-sm disabled:opacity-40"
                onClick={() => void loadReviews(reviewPage + 1)}
                disabled={reviewPage + 1 >= reviewTotalPages}
              >
                다음
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function DetailInfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <div className="mb-1 flex items-center gap-2 text-gray-500">{icon}<span>{label}</span></div>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  )
}
