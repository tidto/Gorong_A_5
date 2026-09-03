import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import LazyImage from '../components/common/LazyImage';
import MapView from '../components/MapView';
import IconLabel from '../components/IconLabel';
import AccessibilityBadge from '../components/AccessibilityBadge';
import PawRating from '../components/PawRating';
import { useAuth } from '../contexts/AuthContext';
import { uploadFileToS3 } from '../api/fileApi';
import { getEventReviews, saveQuickReview, type ImagePayload, type ReviewSummary } from '../api/reviewService';
import { optimizeImageFile } from '../utils/imageUpload';
import { ArrowLeft, Clock, ImagePlus, Users, Wallet, Phone, Navigation, Loader2, Info, ChevronLeft, ChevronRight } from 'lucide-react';

interface EventData {
  overview?: string;
  title: string;
  addr1: string;
  mapx: string;
  mapy: string;
  contentid: string;
  firstimage?: string;
  firstimage2?: string;
  description?: string;
  usefee?: string;
  cat3?: string;
  tel?: string;
  parking?: string;
  elevator?: string;
  restroom?: string;
  route?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  wheelchair?: string;
  exit?: string;
  publicTransport?: string;
  braileBlock?: string;
  audioGuide?: string;
  helpDog?: string;
  signGuide?: string;
  videoGuide?: string;
  stroller?: string;
  galleryImages?: string;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const DEFAULT_LOCATION = { lat: 35.8956, lng: 128.6224 };

const isValidLocation = (location?: { lat?: number; lng?: number } | null) => {
  if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') return false;
  return location.lat !== 0 && location.lng !== 0;
};

const toKakaoLinkName = (name?: string) => {
  const safeName = (name || '행사 위치').replace(/[/?#&=,]/g, ' ').replace(/\s+/g, ' ').trim();
  return safeName || '행사 위치';
};

const formatDate = (raw?: string) => {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
};

const buildPeriodText = (start?: string, end?: string) => {
  const s = formatDate(start);
  const e = formatDate(end);
  if (s && e) return `${s} ~ ${e}`;
  if (s)      return `${s} ~`;
  if (e)      return `~ ${e}`;
  return null;
};

const isAccessible = (field: string | undefined) => {
  if (!field) return false;
  const v = field.trim().toUpperCase();
  return v !== 'N' && v !== '없음' && v !== '' && v !== 'NO';
};

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auth = useAuth();

  const [event,        setEvent]        = useState<EventData | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [slideIndex,   setSlideIndex]   = useState(0);
  const [soloApplied,  setSoloApplied]  = useState(false);
  const [soloLoading,  setSoloLoading]  = useState(false);
  const [showDateModal,  setShowDateModal]  = useState(false);
  const [selectedDate,   setSelectedDate]   = useState('');

  // ── Quick Review 상태 ──────────────────────────────────────────────
  const [reviews,            setReviews]            = useState<ReviewSummary[]>([]);
  const [reviewPage,         setReviewPage]         = useState(0);
  const [reviewTotalPages,   setReviewTotalPages]   = useState(1);
  const [reviewLoading,      setReviewLoading]      = useState(false);
  const [reviewText,         setReviewText]         = useState('');
  const [rating,             setRating]             = useState(0);
  const [reviewMetaEditable, setReviewMetaEditable] = useState(true);
  const [reviewImages,       setReviewImages]       = useState<ImagePayload[]>([]);
  const [savingReview,       setSavingReview]       = useState(false);
  const [uploadingImage,     setUploadingImage]     = useState(false);
  const [pendingImages,      setPendingImages]      = useState<File[]>([]);

  const authorName = auth.user?.nickname?.trim() || auth.user?.email?.trim() || '익명';
  const currentUserId = (() => {
    const stored = localStorage.getItem('gorong-db-user');
    if (!stored) return NaN;
    try { return Number(JSON.parse(stored)?.id); } catch { return NaN; }
  })();

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  const DEFAULT_IMAGE = '/images/default-event.png';

  // ── 행사 상세 로드 ────────────────────────────────────────────────
  useEffect(() => {
    const fetchEventDetail = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const response = await axiosInstance.get(`/public/map/${id}`);
        setEvent(response.data);
        try {
          const checkRes = await axiosInstance.get(`/event-participation/solo/check`, {
            params: { eventContentId: id },
          });
          setSoloApplied(checkRes.data.applied);
        } catch {
          // 미로그인 상태 등은 false 유지
        }
      } catch (error) {
        console.error('상세 데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEventDetail();
  }, [id, auth.user]);

  useEffect(() => {
    const applyFallback = () => setUserLocation(DEFAULT_LOCATION);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserLocation(isValidLocation(loc) ? loc : DEFAULT_LOCATION);
          },
          applyFallback,
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      applyFallback();
    }
  }, []);

  // ── 리뷰 로드 ────────────────────────────────────────────────────
  const loadReviews = async (page: number) => {
    if (!id) return;
    setReviewLoading(true);
    try {
      const response = await getEventReviews(Number(id), page, 10);
      setReviews(response.content);
      setReviewPage(response.page);
      setReviewTotalPages(Math.max(response.totalPages, 1));

      const mine = response.content.find((review) => review.userId === currentUserId);
      if (mine) {
        setReviewText(mine.reviewText ?? '');
        setRating(mine.rating ?? 0);
        setReviewMetaEditable(mine.reviewMetaEditable);
        setReviewImages(mine.images.map((image) => ({
          imageUrl: image.imageUrl,
          originalImgName: image.originalImgName ?? 'uploaded-image.webp',
          saveImgName: image.saveImgName ?? image.imageUrl.split('/').pop() ?? 'image.webp',
        })));
      }
    } catch (error) {
      console.error('행사 리뷰 조회 실패:', error);
      setReviews([]);
    } finally {
      setReviewLoading(false);
    }
  };

  useEffect(() => {
    void loadReviews(0);
  }, [id]);

  // ── 혼자 참여 ────────────────────────────────────────────────────
  const handleSoloCancel = async () => {
    if (!window.confirm('혼자 참여 신청을 취소하시겠습니까?')) return;
    try {
      await axiosInstance.delete('/event-participation/solo', {
        params: { eventContentId: id },
      });
      setSoloApplied(false);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) showToast('로그인이 필요합니다.', 'error');
      else showToast('참여 취소 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleSoloApplyClick = () => {
    if (soloApplied) return;
    setSelectedDate('');
    setShowDateModal(true);
  };

  const handleSoloApplyConfirm = async () => {
    if (!selectedDate) { showToast('방문 예정 날짜를 선택해주세요.', 'error'); return; }
    setShowDateModal(false);
    setSoloLoading(true);
    try {
      await axiosInstance.post('/event-participation/solo', {
        eventContentId: id,
        eventTitle: event?.title ?? '',
        visitDate: selectedDate,
      });
      setSoloApplied(true);
      showToast('혼자 참여 신청이 완료되었습니다! 🎉', 'success');
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) showToast('로그인이 필요합니다.', 'error');
      else if (status === 409) showToast('이미 이 행사에 혼자 참여 신청하셨습니다.', 'error');
      else showToast('참여 신청 중 오류가 발생했습니다.', 'error');
    } finally {
      setSoloLoading(false);
    }
  };

  const handleGoToGroup = () => {
    navigate('/group', {
      state: { eventId: id, eventTitle: event?.title, eventImage: event?.firstimage || DEFAULT_IMAGE },
    });
  };

  const handleOpenKakaoMapRoute = () => {
    if (!event) return;
    const eventLat = Number(event.mapy);
    const eventLng = Number(event.mapx);
    if (!isValidLocation({ lat: eventLat, lng: eventLng })) {
      showToast('행사 위치 정보가 없어 카카오맵을 열 수 없습니다.', 'error');
      return;
    }
    const destinationName = toKakaoLinkName(event.title);
    if (isValidLocation(userLocation)) {
      window.open(
          `https://map.kakao.com/link/from/내위치,${userLocation!.lat},${userLocation!.lng}/to/${destinationName},${eventLat},${eventLng}`,
          '_blank'
      );
    } else {
      window.open(`https://map.kakao.com/link/to/${destinationName},${eventLat},${eventLng}`, '_blank');
    }
  };

  // ── 리뷰 이미지 업로드 ───────────────────────────────────────────
  const handleImageUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    if (reviewImages.length + files.length > 5) {
      showToast('이미지는 최대 5장까지 첨부할 수 있습니다.', 'error');
      return;
    }
    setPendingImages((current) => [...Array.from(current), ...Array.from(files)]);
  };

  // ── 간편 리뷰 저장 ───────────────────────────────────────────────
  const handleSaveQuickReview = async () => {
    if (!id) return;
    if (!reviewText.trim() || rating === 0) {
      showToast('한 줄 리뷰와 발자국 평점을 입력해 주세요.', 'error');
      return;
    }
    // Upload pending images to S3 before saving
    let uploadedImages: ImagePayload[] = [];
    if (pendingImages.length > 0) {
      setUploadingImage(true);
      try {
        for (const file of Array.from(pendingImages)) {
          const optimized = await optimizeImageFile(file);
          const response = await uploadFileToS3(optimized, 'POST_PHOTO', true);
          uploadedImages.push({
            imageUrl: response.fileUrl,
            originalImgName: file.name,
            saveImgName: String(response.key).split('/').pop() ?? file.name,
          });
        }
      } catch (error) {
        console.error('이미지 업로드 실패:', error);
        showToast('이미지 업로드에 실패했습니다.', 'error');
        setUploadingImage(false);
        return;
      } finally {
        setUploadingImage(false);
      }
    }
    setSavingReview(true);
    try {
      const newReviewImages = [...reviewImages, ...uploadedImages];
      const saved = await saveQuickReview(Number(id), {
        reviewText: reviewText.trim(),
        rating,
        authorName,
        images: newReviewImages,
      });
      setReviewMetaEditable(saved.reviewMetaEditable);
      await loadReviews(0);
      showToast('간편 리뷰가 저장되었습니다.', 'success');
      // Reset states after successful save
      setReviewImages([]);
      setRating(0);
      setReviewText('');
      setPendingImages([]);
    } catch (error: any) {
      console.error('간편 리뷰 저장 실패:', error);
      showToast(error?.response?.data?.error || '간편 리뷰 저장 중 오류가 발생했습니다.', 'error');
      // pendingImages remain - user can re-select or re-save
    } finally {
      setSavingReview(false);
    }
  };

  // ── 로딩 / 에러 상태 ─────────────────────────────────────────────
  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
          <p className="text-gray-500 font-medium">행사 정보를 불러오는 중...</p>
        </div>
    );
  }

  if (!event) {
    return (
        <div className="p-20 text-center">
          <p className="text-gray-400 text-xl mb-2">😥</p>
          <p className="text-gray-500 mb-4">행사를 찾을 수 없습니다.</p>
          <button onClick={() => navigate('/')} className="text-orange-500 underline">홈으로 돌아가기</button>
        </div>
    );
  }

  const parkingOk       = isAccessible(event.parking);
  const elevatorOk      = isAccessible(event.elevator);
  const restroomOk      = isAccessible(event.restroom);
  const routeOk         = isAccessible(event.route);
  const wheelchairOk    = isAccessible(event.wheelchair);
  const exitOk          = isAccessible(event.exit);
  const publicTransOk   = isAccessible(event.publicTransport);
  const braileOk        = isAccessible(event.braileBlock);
  const audioOk         = isAccessible(event.audioGuide);
  const helpDogOk       = isAccessible(event.helpDog);
  const signOk          = isAccessible(event.signGuide);
  const videoOk         = isAccessible(event.videoGuide);
  const strollerOk      = isAccessible(event.stroller);

  const hasAnyAccessibilityData =
      parkingOk || elevatorOk || restroomOk || routeOk ||
      wheelchairOk || exitOk || publicTransOk || braileOk ||
      audioOk || helpDogOk || signOk || videoOk || strollerOk;

  const supportsGuideDog =
      helpDogOk ||
      event.title.includes('배리어프리') ||
      event.overview?.includes('안내견') ||
      event.overview?.includes('시각장애인');

  const galleryList = event.galleryImages
      ? event.galleryImages.split(',').map(u => u.trim()).filter(Boolean)
      : [];
  const images = [...new Set(
      [event.firstimage, event.firstimage2, ...galleryList]
          .filter((img): img is string => !!img && img.trim() !== '')
  )];

  const mapData = [{
    title: event.title,
    addr1: event.addr1,
    mapx: event.mapx,
    mapy: event.mapy,
    contentid: event.contentid,
    firstimage: event.firstimage,
  }];

  const eventLocation = { lat: parseFloat(event.mapy), lng: parseFloat(event.mapx) };

  const distanceText = (() => {
    if (!userLocation) return '위치 계산 중...';
    const lat = parseFloat(event.mapy);
    const lng = parseFloat(event.mapx);
    if (isNaN(lat) || isNaN(lng)) return '위치 정보 없음';
    return `${calculateDistance(userLocation.lat, userLocation.lng, lat, lng).toFixed(1)} km`;
  })();

  const periodText = buildPeriodText(event.eventStartDate, event.eventEndDate);

  return (
      <div className="min-h-screen bg-gray-50">

        {/* 토스트 알림 */}
        {toast && (
            <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold transition-all duration-300 ${
                toast.type === 'success' ? 'bg-emerald-500 text-white' :
                    toast.type === 'error' ? 'bg-red-500 text-white' :
                        'bg-gray-800 text-white'
            }`}>
              {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
              <span>{toast.msg}</span>
            </div>
        )}

        {/* 날짜 선택 모달 */}
        {showDateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm mx-4 flex flex-col gap-5">
                <h2 className="text-xl font-bold text-gray-900 text-center">📅 방문 예정일을 알려주세요</h2>
                <p className="text-sm text-gray-500 text-center -mt-2">언제 이 행사에 방문하실 예정인가요?</p>
                <input
                    type="date"
                    value={selectedDate}
                    min={event?.eventStartDate
                        ? `${event.eventStartDate.slice(0,4)}-${event.eventStartDate.slice(4,6)}-${event.eventStartDate.slice(6,8)}`
                        : new Date().toISOString().split('T')[0]}
                    max={event?.eventEndDate
                        ? `${event.eventEndDate.slice(0,4)}-${event.eventEndDate.slice(4,6)}-${event.eventEndDate.slice(6,8)}`
                        : undefined}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full border-2 border-gray-200 focus:border-orange-400 rounded-xl px-4 py-3 text-base outline-none transition-colors"
                />
                <div className="flex gap-3">
                  <button
                      onClick={() => setShowDateModal(false)}
                      className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-bold hover:bg-gray-50 transition-colors"
                  >취소</button>
                  <button
                      onClick={handleSoloApplyConfirm}
                      disabled={!selectedDate}
                      className={`flex-1 py-3 rounded-xl font-bold transition-colors ${
                          selectedDate ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-gray-100 text-gray-400 cursor-default'
                      }`}
                  >참여 신청</button>
                </div>
              </div>
            </div>
        )}

        {/* ── 히어로 이미지 섹션 ── */}
        <div className="relative h-[60vh] min-h-[420px] max-h-[600px] bg-gray-900 overflow-hidden">
          <div
              style={{
                display: 'flex',
                width: `${Math.max(images.length, 1) * 100}%`,
                height: '100%',
                transform: `translateX(-${(slideIndex / Math.max(images.length, 1)) * 100}%)`,
                transition: 'transform 0.5s cubic-bezier(0.4,0,0.2,1)',
              }}
          >
            {images.length > 0 ? images.map((src, idx) => (
                <div key={idx} style={{ width: `${100 / images.length}%`, flexShrink: 0, height: '100%' }}>
                  <LazyImage
                      src={src}
                      wrapperClassName="w-full h-full"
                      className="w-full h-full object-cover"
                      alt={`${event.title} ${idx + 1}`}
                      onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMAGE; }}
                  />
                </div>
            )) : (
                <div style={{ width: '100%', flexShrink: 0, height: '100%' }}>
                  <LazyImage src={DEFAULT_IMAGE} wrapperClassName="w-full h-full" className="w-full h-full object-cover" alt={event.title} />
                </div>
            )}
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

          <button
              onClick={() => navigate(-1)}
              className="absolute top-5 left-5 z-20 flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2 rounded-full font-medium transition-all text-sm border border-white/30"
          >
            <ArrowLeft className="w-4 h-4" /> 뒤로가기
          </button>

          {images.length > 1 && (
              <div className="absolute top-5 right-5 z-20 bg-black/40 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/20">
                {slideIndex + 1} / {images.length}
              </div>
          )}

          {images.length > 1 && (
              <>
                <button
                    onClick={() => setSlideIndex(i => Math.max(0, i - 1))}
                    disabled={slideIndex === 0}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all disabled:opacity-20 border border-white/20"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                    onClick={() => setSlideIndex(i => Math.min(images.length - 1, i + 1))}
                    disabled={slideIndex === images.length - 1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all disabled:opacity-20 border border-white/20"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
                  {images.map((_, idx) => (
                      <button
                          key={idx}
                          onClick={() => setSlideIndex(idx)}
                          className={`rounded-full transition-all ${idx === slideIndex ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/40 hover:bg-white/70'}`}
                      />
                  ))}
                </div>
              </>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 pointer-events-none">
            {event.cat3 && (
                <span className="inline-block bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-3 tracking-wide uppercase">
                  {event.cat3}
                </span>
            )}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-2 drop-shadow-lg">
              {event.title}
            </h1>
            <div className="flex items-center gap-2 text-white/80 text-sm">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <span>{event.addr1}</span>
            </div>
          </div>
        </div>

        {/* ── 메인 콘텐츠 ── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 relative z-10 pb-10">

          {/* 스티키 요약 카드 */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5 sm:p-6 mb-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SummaryChip
                  icon={<Clock className="w-4 h-4 text-orange-500" />}
                  label="기간"
                  value={periodText ?? '상시 운영'}
              />
              <SummaryChip
                  icon={<Wallet className="w-4 h-4 text-orange-500" />}
                  label="요금"
                  value={event.usefee || '무료'}
                  highlight={!event.usefee}
              />
              <SummaryChip
                  icon={<Users className="w-4 h-4 text-orange-500" />}
                  label="분류"
                  value={event.cat3 || '문화행사'}
              />
              <SummaryChip
                  icon={<Phone className="w-4 h-4 text-orange-500" />}
                  label="문의"
                  value={event.tel || '정보 없음'}
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* 좌측 메인 컬럼 */}
            <div className="lg:col-span-2 space-y-8">

              {event.description && (
                  <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <span className="w-1 h-6 bg-orange-500 rounded-full inline-block"></span>
                      행사 소개
                    </h2>
                    <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{event.description}</p>
                  </section>
              )}

              <section className="bg-orange-50/40 rounded-2xl border border-orange-100 shadow-sm p-6 sm:p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <span className="w-1 h-6 bg-orange-500 rounded-full inline-block"></span>
                  접근성 정보
                </h2>

                {(hasAnyAccessibilityData || supportsGuideDog) && (
                    <div className="flex gap-2 mb-5">
                      {hasAnyAccessibilityData && <IconLabel type="barrierFree" />}
                      {supportsGuideDog && <IconLabel type="guideDog" />}
                    </div>
                )}

                {!hasAnyAccessibilityData && !supportsGuideDog ? (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
                      <Info className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-gray-600">배리어프리 시설 정보 미등록</p>
                        <p className="text-xs text-gray-400 mt-1">
                          현장 방문 전 주최 측에 직접 문의해 주세요.
                          {event.tel && <span className="ml-1 text-orange-500 font-medium">{event.tel}</span>}
                        </p>
                      </div>
                    </div>
                ) : (
                    <div className="space-y-5">
                      {(parkingOk || elevatorOk || restroomOk || routeOk || wheelchairOk || exitOk || publicTransOk) && (
                          <div>
                            <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              <span>🦽</span> 이동 편의
                            </p>
                            <div className="space-y-2">
                              {parkingOk    && <AccessibilityBadge type="verified" label="주차 가능"       description={event.parking!} />}
                              {elevatorOk   && <AccessibilityBadge type="verified" label="엘리베이터"      description={event.elevator!} />}
                              {restroomOk   && <AccessibilityBadge type="verified" label="장애인 화장실"   description={event.restroom!} />}
                              {routeOk      && <AccessibilityBadge type="info"     label="접근 경로"       description={event.route!} />}
                              {wheelchairOk && <AccessibilityBadge type="verified" label="휠체어 대여"     description={event.wheelchair!} />}
                              {exitOk       && <AccessibilityBadge type="verified" label="출입통로 경사로" description={event.exit!} />}
                              {publicTransOk && <AccessibilityBadge type="info"   label="대중교통 접근"   description={event.publicTransport!} />}
                            </div>
                          </div>
                      )}
                      {(braileOk || audioOk || helpDogOk) && (
                          <div>
                            <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              <span>👁</span> 시각 지원
                            </p>
                            <div className="space-y-2">
                              {braileOk  && <AccessibilityBadge type="verified" label="점자블록"      description={event.braileBlock!} />}
                              {audioOk   && <AccessibilityBadge type="verified" label="오디오 가이드" description={event.audioGuide!} />}
                              {helpDogOk && <AccessibilityBadge type="verified" label="보조견 동반"   description={event.helpDog!} />}
                            </div>
                          </div>
                      )}
                      {(signOk || videoOk) && (
                          <div>
                            <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              <span>👂</span> 청각 지원
                            </p>
                            <div className="space-y-2">
                              {signOk  && <AccessibilityBadge type="verified" label="수화 안내" description={event.signGuide!} />}
                              {videoOk && <AccessibilityBadge type="verified" label="자막 영상" description={event.videoGuide!} />}
                            </div>
                          </div>
                      )}
                      {strollerOk && (
                          <div>
                            <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              <span>👶</span> 영유아 가족
                            </p>
                            <div className="space-y-2">
                              <AccessibilityBadge type="verified" label="유모차 대여" description={event.stroller!} />
                            </div>
                          </div>
                      )}
                    </div>
                )}
              </section>
            </div>

            {/* 우측 사이드바 */}
            <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="h-60">
                  <MapView
                      data={mapData}
                      onDetailClick={() => {}}
                      userLocation={userLocation}
                      mapCenter={eventLocation}
                      showMarkerCount={false}
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">행사 위치</p>
                      <p className="text-sm font-semibold text-gray-800 leading-snug">{event.addr1}</p>
                    </div>
                    <span className="ml-3 flex-shrink-0 text-xs font-bold bg-orange-50 text-orange-500 border border-orange-100 px-2.5 py-1 rounded-full whitespace-nowrap">
                      {distanceText}
                    </span>
                  </div>
                  <button
                      onClick={handleOpenKakaoMapRoute}
                      className="w-full py-2.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
                  >
                    <Navigation className="w-4 h-4 text-orange-400" />
                    카카오맵으로 길찾기
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <p className="text-xs text-gray-400 font-medium text-center">이 행사에 참여하고 싶으세요?</p>

                {soloApplied ? (
                    <button
                        onClick={handleSoloCancel}
                        className="w-full py-3.5 rounded-xl border-2 border-red-200 text-red-400 font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      혼자 참여 신청 취소
                    </button>
                ) : (
                    <button
                        onClick={handleSoloApplyClick}
                        disabled={soloLoading}
                        className="w-full py-3.5 rounded-xl border-2 border-orange-400 text-orange-500 font-bold hover:bg-orange-50 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {soloLoading ? '신청 중...' : '혼자 참여 신청하기'}
                    </button>
                )}

                <button
                    onClick={handleGoToGroup}
                    className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-all shadow-md shadow-orange-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  동행 구하기
                </button>
              </div>
            </div>
          </div>

          {/* ── Quick Review 섹션 (맨 하단) ── */}
          <section className="mt-10 rounded-[32px] border border-orange-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">Quick Review</p>
                <h2 className="text-3xl font-black text-slate-900">참여 버튼 아래에서 바로 남기는 간편 리뷰</h2>
                <p className="mt-2 text-sm text-slate-500">한 줄 리뷰와 발자국 평점은 작성 후 7일이 지나면 잠기고, 사진은 캣타워 갤러리에도 자동 저장됩니다.</p>
              </div>
              <button
                  className="rounded-full border border-orange-200 px-4 py-2 text-sm font-semibold text-orange-600 whitespace-nowrap"
                  onClick={() => navigate('/reviews')}
              >
                정식 포스팅으로 이어쓰기
              </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              {/* 리뷰 입력 폼 */}
              <div className="space-y-5 rounded-[28px] bg-orange-50/70 p-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">한 줄 리뷰</label>
                  <textarea
                      className="min-h-[110px] w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 outline-none resize-none focus:border-orange-300 transition-colors"
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
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
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-orange-300 bg-white px-4 py-4 text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors">
                    {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    {uploadingImage ? '업로드 중...' : '사진 추가'}
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => void handleImageUpload(e.target.files)}
                    />
                  </label>
                  const existingImageCount = reviewImages.length;
                  const hasExistingImages = existingImageCount > 0;

                  {hasExistingImages || pendingImages.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {existingImageCount > 0 && (
                          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {reviewImages.map((image, index) => (
                                <div key={`${image.imageUrl}-${index}`} className="relative overflow-hidden rounded-2xl border border-slate-200">
                                  <img src={image.imageUrl} alt={`리뷰 이미지 ${index + 1}`} className="h-24 w-full object-cover" />
                                  <button
                                      type="button"
                                      className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[11px] text-white"
                                      onClick={() => setReviewImages((curr) => curr.filter((_, i) => i !== index))}
                                  >
                                    삭제
                                  </button>
                                </div>
                            ))}
                          </div>
                        )}
                        {pendingImages.length > 0 && (
                          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {pendingImages.map((file, index) => {
                              const previewUrl = URL.createObjectURL(file);
                              return (
                                <div key={`pending-${index}`} className="relative overflow-hidden rounded-2xl border border-slate-200">
                                  <img src={previewUrl} alt={`선택한 이미지 ${index + 1}`} className="h-24 w-full object-cover" />
                                  <button
                                      type="button"
                                      className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[11px] text-white"
                                      onClick={() => {
                                        setPendingImages((curr) => curr.filter((_, i) => i !== index));
                                        URL.revokeObjectURL(previewUrl);
                                      }}
                                  >
                                    삭제
                                  </button>
                                  <p className="text-xs text-slate-400 mt-1">선택된 이미지</p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                  )}
                </div>

                <button
                    onClick={() => void handleSaveQuickReview()}
                    disabled={savingReview || uploadingImage}
                    className="w-full rounded-2xl bg-slate-900 py-3 font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-60"
                >
                  {savingReview ? '저장 중...' : '간편 리뷰 저장'}
                </button>
              </div>

              {/* 리뷰 목록 */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">리뷰 목록</h3>
                  <span className="text-sm text-slate-400">{reviews.length}개 표시 중</span>
                </div>

                <div className="space-y-4">
                  {reviewLoading ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                        리뷰를 불러오는 중입니다.
                      </div>
                  ) : reviews.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                        아직 등록된 리뷰가 없습니다.
                      </div>
                  ) : (
                      reviews.map((review) => (
                          <article key={review.id} className="rounded-[26px] border border-slate-200 bg-white p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-semibold text-slate-900">{review.authorName}</p>
                                <p className="mt-1 text-xs text-slate-400">
                                  {new Date(review.createdAt).toLocaleDateString('ko-KR')}
                                </p>
                              </div>
                              <PawRating value={review.rating} readOnly size="sm" />
                            </div>
                            <p className="mt-4 text-sm leading-6 text-slate-700">{review.reviewText}</p>
                            {review.images.length > 0 && (
                                <div className="mt-4 flex gap-2 overflow-x-auto">
                                  {review.images.map((image, index) => (
                                      <img
                                          key={`${image.imageUrl}-${index}`}
                                          src={image.imageUrl}
                                          alt={`리뷰 이미지 ${index + 1}`}
                                          className="h-24 w-32 rounded-2xl object-cover flex-shrink-0"
                                      />
                                  ))}
                                </div>
                            )}
                            {review.status === 'PUBLISHED' && (
                                <button
                                    className="mt-4 rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-100 transition-colors"
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
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm disabled:opacity-40 hover:bg-slate-50 transition-colors"
                      onClick={() => void loadReviews(reviewPage - 1)}
                      disabled={reviewPage <= 0}
                  >
                    이전
                  </button>
                  <span className="text-sm text-slate-500">{reviewPage + 1} / {reviewTotalPages}</span>
                  <button
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm disabled:opacity-40 hover:bg-slate-50 transition-colors"
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
      </div>
  );
}

function SummaryChip({ icon, label, value, highlight }: {
  icon: React.ReactNode; label: string; value: string; highlight?: boolean
}) {
  return (
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-[11px] text-gray-400 font-medium mb-0.5">{label}</p>
          {highlight
              ? <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">무료</span>
              : <p className="text-sm font-semibold text-gray-800 truncate">{value}</p>
          }
        </div>
      </div>
  );
}