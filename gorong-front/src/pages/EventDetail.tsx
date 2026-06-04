import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import axiosInstance from '../api/axiosInstance';
import MapView from '../components/MapView';
import IconLabel from '../components/IconLabel';
import AccessibilityBadge from '../components/AccessibilityBadge';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Clock, Users, Wallet, Phone, Navigation, Loader2, Info, ChevronLeft, ChevronRight } from 'lucide-react';

interface EventData {
  title: string;
  addr1: string;
  mapx: string;
  mapy: string;
  contentid: string;
  firstimage?: string;
  firstimage2?: string;
  overview?: string;
  usefee?: string;
  cat3?: string;
  tel?: string;
  parking?: string;
  elevator?: string;
  restroom?: string;
  route?: string;
  eventStartDate?: string;
  eventEndDate?: string;
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

  const DEFAULT_IMAGE = '/images/default-event.png';

  // 1. 상세 데이터 + 혼자참여 여부 확인
  useEffect(() => {
    const fetchEventDetail = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const headers: Record<string, string> = {};
        const firebaseUser = auth.user as { getIdToken?: () => Promise<string> } | null;
        if (firebaseUser && typeof firebaseUser.getIdToken === 'function') {
          const token = await firebaseUser.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await axios.get(`/api/public/map/${id}`, { headers });
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

  // 2. 유저 현재 위치 감지
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

  // 혼자 참여 취소
  const handleSoloCancel = async () => {
    if (!window.confirm('혼자 참여 신청을 취소하시겠습니까?')) return;
    try {
      await axiosInstance.delete('/event-participation/solo', {
        params: { eventContentId: id },
      });
      setSoloApplied(false);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) alert('로그인이 필요합니다.');
      else alert('참여 취소 중 오류가 발생했습니다.');
    }
  };

  // 혼자 참여 버튼 클릭 → 날짜 선택 팝업
  const handleSoloApplyClick = () => {
    if (soloApplied) return;
    setSelectedDate('');
    setShowDateModal(true);
  };

  // 날짜 확정 후 API 호출
  const handleSoloApplyConfirm = async () => {
    if (!selectedDate) { alert('방문 예정 날짜를 선택해주세요.'); return; }
    setShowDateModal(false);
    setSoloLoading(true);
    try {
      await axiosInstance.post('/event-participation/solo', {
        eventContentId: id,
        eventTitle: event?.title ?? '',
        visitDate: selectedDate,
      });
      setSoloApplied(true);
      alert('혼자 참여 신청이 완료되었습니다! 🎉');
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) alert('로그인이 필요합니다.');
      else if (status === 409) alert('이미 이 행사에 혼자 참여 신청하셨습니다.');
      else alert('참여 신청 중 오류가 발생했습니다.');
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
      alert('행사 위치 정보가 없어 카카오맵을 열 수 없습니다.');
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
          <button onClick={() => navigate('/')} className="text-orange-500 underline">
            홈으로 돌아가기
          </button>
        </div>
    );
  }

  const parkingOk  = isAccessible(event.parking);
  const elevatorOk = isAccessible(event.elevator);
  const restroomOk = isAccessible(event.restroom);
  const routeOk    = isAccessible(event.route);
  const hasAnyAccessibilityData = parkingOk || elevatorOk || restroomOk || routeOk;

  const supportsGuideDog =
      event.title.includes('배리어프리') ||
      event.overview?.includes('안내건') ||
      event.overview?.includes('시각장애인');

  // 이미지 슬라이더용 배열 (있는 것만)
  const images = [event.firstimage, event.firstimage2]
      .filter((img): img is string => !!img && img.trim() !== '');

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
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* ── 날짜 선택 팝업 모달 ── */}
        {showDateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 flex flex-col gap-5">
                <h2 className="text-xl font-bold text-gray-900 text-center">📅 방문 예정일을 알려주세요</h2>
                <p className="text-sm text-gray-500 text-center -mt-2">언제 이 행사에 방문하실 예정인가요?</p>
                <input
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full border-2 border-gray-200 focus:border-orange-400 rounded-xl px-4 py-3 text-base outline-none transition-colors"
                />
                <div className="flex gap-3">
                  <button
                      onClick={() => setShowDateModal(false)}
                      className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-bold hover:bg-gray-50 transition-colors"
                  >
                    취소
                  </button>
                  <button
                      onClick={handleSoloApplyConfirm}
                      disabled={!selectedDate}
                      className={`flex-1 py-3 rounded-xl font-bold transition-colors ${
                          selectedDate
                              ? 'bg-orange-500 hover:bg-orange-600 text-white'
                              : 'bg-gray-100 text-gray-400 cursor-default'
                      }`}
                  >
                    참여 신청
                  </button>
                </div>
              </div>
            </div>
        )}

        <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-orange-600 hover:text-orange-700 mb-6 font-medium transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> 뒤로가기
        </button>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 text-left">

          {/* ── 헤더 이미지 슬라이더 ── */}
          <div className="relative h-80 bg-gray-100 overflow-hidden">
            <div
                style={{
                  display: 'flex',
                  width: `${Math.max(images.length, 1) * 100}%`,
                  height: '100%',
                  transform: `translateX(-${(slideIndex / Math.max(images.length, 1)) * 100}%)`,
                  transition: 'transform 0.4s ease',
                }}
            >
              {images.length > 0 ? images.map((src, idx) => (
                  <div key={idx} style={{ width: `${100 / images.length}%`, flexShrink: 0, height: '100%' }}>
                    <img
                        src={src}
                        className="w-full h-full object-cover"
                        alt={`${event.title} ${idx + 1}`}
                        onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMAGE; }}
                    />
                  </div>
              )) : (
                  <div style={{ width: '100%', flexShrink: 0, height: '100%' }}>
                    <img src={DEFAULT_IMAGE} className="w-full h-full object-cover" alt={event.title} />
                  </div>
              )}
            </div>

            {/* 그라디언트 + 타이틀 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-8 pointer-events-none">
              <h1 className="text-4xl font-bold text-white mb-2">{event.title}</h1>
              <p className="text-lg text-white/90">{event.addr1}</p>
            </div>

            {/* 이전/다음 버튼 — 이미지 2장 이상일 때만 */}
            {images.length > 1 && (
                <>
                  <button
                      onClick={() => setSlideIndex(i => Math.max(0, i - 1))}
                      disabled={slideIndex === 0}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all disabled:opacity-30"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                      onClick={() => setSlideIndex(i => Math.min(images.length - 1, i + 1))}
                      disabled={slideIndex === images.length - 1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all disabled:opacity-30"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* 닷 인디케이터 */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
                    {images.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setSlideIndex(idx)}
                            className={`rounded-full transition-all ${
                                idx === slideIndex
                                    ? 'w-5 h-2 bg-white'
                                    : 'w-2 h-2 bg-white/50 hover:bg-white/80'
                            }`}
                        />
                    ))}
                  </div>
                </>
            )}
          </div>

          <div className="p-8 space-y-10">
            {/* 요약 정보 카드 4개 */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <DetailInfoCard
                  icon={<Clock className="w-4 h-4" />}
                  label="기간"
                  value={periodText ?? '상시 운영'}
              />
              <DetailInfoCard
                  icon={<Wallet className="w-4 h-4" />}
                  label="요금"
                  value={event.usefee || '무료'}
              />
              <DetailInfoCard
                  icon={<Users className="w-4 h-4" />}
                  label="분류"
                  value={event.cat3 || '문화행사'}
              />
              <DetailInfoCard
                  icon={<Phone className="w-4 h-4" />}
                  label="문의"
                  value={event.tel || '정보 없음'}
              />
            </section>

            {/* 행사 설명 */}
            {event.overview && (
                <section>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 행사 소개</h2>
                  <p className="text-gray-600 leading-relaxed">{event.overview}</p>
                </section>
            )}

            <div className="grid lg:grid-cols-2 gap-8">
              {/* 행사 위치 */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">📍 행사 위치</h2>
                  <span className="text-sm font-semibold bg-orange-50 text-orange-600 px-3 py-1 rounded-full border border-orange-100">
                    내 위치에서 {distanceText}
                  </span>
                </div>
                <div className="rounded-2xl overflow-hidden border border-gray-200 h-64 mb-4">
                  <MapView
                      data={mapData}
                      onDetailClick={() => {}}
                      userLocation={userLocation}
                      mapCenter={eventLocation}
                      showMarkerCount={false}
                  />
                </div>
                <button
                    onClick={handleOpenKakaoMapRoute}
                    className="w-full py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all text-sm"
                >
                  <Navigation className="w-4 h-4 text-orange-400 fill-orange-400" />
                  카카오 맵으로 실시간 길찾기 및 이동 경로 보기
                </button>
              </div>

              {/* 접근성 정보 */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">♿ 접근성 정보</h2>

                {(hasAnyAccessibilityData || supportsGuideDog) && (
                    <div className="flex gap-2 mb-4">
                      {hasAnyAccessibilityData && <IconLabel type="barrierFree" />}
                      {supportsGuideDog && <IconLabel type="guideDog" />}
                    </div>
                )}

                <div className="space-y-2">
                  {parkingOk && (
                      <AccessibilityBadge type="verified" label="주차 가능" description={event.parking!} />
                  )}
                  {elevatorOk && (
                      <AccessibilityBadge type="verified" label="엘리베이터" description={event.elevator!} />
                  )}
                  {restroomOk && (
                      <AccessibilityBadge type="verified" label="장애인 화장실" description={event.restroom!} />
                  )}
                  {routeOk && (
                      <AccessibilityBadge type="info" label="접근 경로" description={event.route!} />
                  )}

                  {!hasAnyAccessibilityData && !supportsGuideDog && (
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
                        <Info className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-gray-600">배리어프리 시설 정보 미등록</p>
                          <p className="text-xs text-gray-400 mt-1">
                            현장 방문 전 주최 측에 직접 문의해 주세요.
                            {event.tel && (
                                <span className="ml-1 text-orange-500 font-medium">{event.tel}</span>
                            )}
                          </p>
                        </div>
                      </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 하단 버튼 영역 ── */}
        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4 pb-8">

          {/* 혼자 참여 버튼 */}
          {soloApplied ? (
              <button
                  onClick={handleSoloCancel}
                  className="flex items-center justify-center gap-2 w-full sm:w-1/2 lg:w-1/3 py-4 text-lg font-bold rounded-xl shadow-md transition-all duration-200 bg-white border-2 border-red-300 text-red-400 hover:bg-red-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                혼자 참여 신청 취소
              </button>
          ) : (
              <button
                  onClick={handleSoloApplyClick}
                  disabled={soloLoading}
                  className="flex items-center justify-center gap-2 w-full sm:w-1/2 lg:w-1/3 py-4 text-lg font-bold rounded-xl shadow-md transition-all duration-200 bg-white border-2 border-orange-500 text-orange-500 hover:bg-orange-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {soloLoading ? '신청 중...' : '혼자 참여 신청하기'}
              </button>
          )}

          {/* 동행 구하기 버튼 */}
          <button
              onClick={handleGoToGroup}
              className="flex items-center justify-center gap-2 w-full sm:w-1/2 lg:w-1/3 py-4 bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold rounded-xl shadow-md transition-all duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            이 행사 함께 갈 동행 구하기
          </button>
        </div>

      </div>
  );
}

function DetailInfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <div className="flex items-center gap-2 text-gray-500 mb-1">{icon}<span>{label}</span></div>
        <p className="text-sm font-semibold text-gray-800">{value}</p>
      </div>
  );
}