import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import MapView from '../components/MapView';
import IconLabel from '../components/IconLabel';
import AccessibilityBadge from '../components/AccessibilityBadge';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Clock, Users, Wallet, Phone, Navigation } from 'lucide-react';

interface EventData {
  title: string;
  addr1: string;
  mapx: string;
  mapy: string;
  contentid: string;
  firstimage?: string;
  overview?: string;
  usefee?: string;
  cat3?: string;
  tel?: string;
  parking?: string;
  elevator?: string;
  restroom?: string;
  eventstartdate?: string;
  eventenddate?: string;
}

// 하버사인(Haversine) 공식을 이용한 두 좌표 간의 직선 거리 계산 함수 (km 단위)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // 지구 반지름 (km)
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const DEFAULT_LOCATION = { lat: 35.8956, lng: 128.6224 }; // 영진전문대 좌표

const isValidLocation = (location?: { lat?: number; lng?: number } | null) => {
  if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') return false;
  return location.lat !== 0 && location.lng !== 0;
};

const toKakaoLinkName = (name?: string) => {
  const safeName = (name || '행사 위치')
      .replace(/[/?#&=,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  return safeName || '행사 위치';
};

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const DEFAULT_IMAGE = '/images/default-event.png';

  // 1. 상세 데이터 호출
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
      } catch (error) {
        console.error("상세 데이터 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEventDetail();
  }, [id, auth.user]);

  // 2. 길찾기 및 거리 산정을 위한 유저 현재 위치 감지 (메인페이지 검증 로직 반영)
  useEffect(() => {
    const applyFallbackLocation = () => {
      setUserLocation(DEFAULT_LOCATION);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
          (pos) => {
            const location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserLocation(isValidLocation(location) ? location : DEFAULT_LOCATION);
          },
          applyFallbackLocation,
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      applyFallbackLocation();
    }
  }, []);

  const handleGoToGroup = () => {
    navigate('/group', {
      state: {
        eventId: id,
        eventTitle: event?.title,
        eventImage: event?.firstimage || DEFAULT_IMAGE
      }
    });
  };

  // 3. 카카오 맵 외부 길찾기 링크 열기 함수
  const handleOpenKakaoMapRoute = () => {
    if (!event) return;

    const eventLat = Number(event.mapy);
    const eventLng = Number(event.mapx);
    if (!isValidLocation({ lat: eventLat, lng: eventLng })) {
      alert('행사 위치 정보가 없어 카카오맵을 열 수 없습니다.');
      return;
    }

    const destinationName = toKakaoLinkName(event.title);

    // 출발지(내 위치)가 있으면 from/to 형식, 없으면 목적지만
    if (isValidLocation(userLocation)) {
      const url = `https://map.kakao.com/link/from/내위치,${userLocation!.lat},${userLocation!.lng}/to/${destinationName},${eventLat},${eventLng}`;
      window.open(url, '_blank');
    } else {
      const url = `https://map.kakao.com/link/to/${destinationName},${eventLat},${eventLng}`;
      window.open(url, '_blank');
    }
  };

  if (loading) return <div className="p-20 text-center font-bold text-orange-600">데이터 로딩 중...</div>;
  if (!event) return (
      <div className="p-20 text-center">
        <p className="text-gray-500 mb-4">행사를 찾을 수 없습니다.</p>
        <button onClick={() => navigate('/')} className="text-orange-500 underline">홈으로 돌아가기</button>
      </div>
  );

  const isAccessible = (field: string | undefined) => {
    if (!field) return false;
    const normalized = field.trim().toUpperCase();
    return normalized !== 'N' && normalized !== '없음' && normalized !== '';
  };

  const hasAccessibilityInfo = isAccessible(event.parking) || isAccessible(event.elevator) || isAccessible(event.restroom);

  const supportsGuideDog =
      event.title.includes('배리어프리') ||
      event.overview?.includes('안내犬') ||
      event.overview?.includes('안내견') ||
      event.overview?.includes('시각장애인');

  const mapData = [{
    title: event.title,
    addr1: event.addr1,
    mapx: event.mapx,
    mapy: event.mapy,
    contentid: event.contentid,
    firstimage: event.firstimage
  }];

  const eventLocation = {
    lat: parseFloat(event.mapy),
    lng: parseFloat(event.mapx)
  };

  // 현재 유저 위치와 행사 위치 간의 거리 계산 실행
  const distanceText = (() => {
    if (!userLocation) return '위치 계산 중...';
    const eventLat = parseFloat(event.mapy);
    const eventLng = parseFloat(event.mapx);
    if (isNaN(eventLat) || isNaN(eventLng)) return '위치 정보 없음';

    const dist = calculateDistance(userLocation.lat, userLocation.lng, eventLat, eventLng);
    return `${dist.toFixed(1)} km`;
  })();

  const formatDate = (d?: string) =>
      d?.length === 8 ? `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}` : null;

  const startDate = formatDate(event.eventstartdate);
  const endDate   = formatDate(event.eventenddate);
  const periodValue = startDate && endDate
      ? `${startDate} ~ ${endDate}`
      : startDate
          ? `${startDate} ~`
          : '상시 운영';

  return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-orange-600 hover:text-orange-700 mb-6 font-medium">
          <ArrowLeft className="w-5 h-5" /> 뒤로가기
        </button>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 text-left">
          <div className="relative h-80">
            <img
                src={event.firstimage || DEFAULT_IMAGE}
                className="w-full h-full object-cover"
                alt={event.title}
                onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMAGE; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-8">
              <h1 className="text-4xl font-bold text-white mb-2">{event.title}</h1>
              <p className="text-lg text-white/90">{event.addr1}</p>
            </div>
          </div>

          <div className="p-8 space-y-10">
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <DetailInfoCard icon={<Clock className="w-4 h-4" />} label="기간" value={periodValue} />
              <DetailInfoCard icon={<Wallet className="w-4 h-4" />} label="요금" value={event.usefee || '무료'} />
              <DetailInfoCard icon={<Users className="w-4 h-4" />} label="분류" value={event.cat3 || '문화행사'} />
              <DetailInfoCard icon={<Phone className="w-4 h-4" />} label="문의" value={event.tel || '정보 없음'} />
            </section>

            {/* 행사 설명 */}
            {event.overview && (
                <section>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 행사 소개</h2>
                  <p className="text-gray-600 leading-relaxed">{event.overview}</p>
                </section>
            )}

            <div className="grid lg:grid-cols-2 gap-8">
              {/* [수정 및 확장] 행사 위치 영역 내 거리 연동 및 길찾기 버튼 반영 */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">📍 행사 위치</h2>
                  {/* 기획서 명세 요구사항: 내 위치 기준 거리 레이블 출력 */}
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
                  />
                </div>
                {/* 기획서 명세 요구사항: 카카오 맵 연동 길찾기 버튼 제공 */}
                <button
                    onClick={handleOpenKakaoMapRoute}
                    className="w-full py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all text-sm"
                >
                  <Navigation className="w-4 h-4 text-orange-400 fill-orange-400" />
                  카카오 맵으로 실시간 길찾기 및 이동 경로 보기
                </button>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">♿ 접근성 정보</h2>

                <div className="flex gap-2 mb-4">
                  {hasAccessibilityInfo && <IconLabel type="barrierFree" />}
                  {supportsGuideDog && <IconLabel type="guideDog" />}
                </div>

                <div className="space-y-2">
                  {isAccessible(event.parking) && (
                      <AccessibilityBadge type="verified" label="주차 가능" description={event.parking!} />
                  )}
                  {isAccessible(event.elevator) && (
                      <AccessibilityBadge type="verified" label="엘리베이터" description={event.elevator!} />
                  )}
                  {isAccessible(event.restroom) && (
                      <AccessibilityBadge type="verified" label="화장실" description={event.restroom!} />
                  )}

                  {!hasAccessibilityInfo && !supportsGuideDog && (
                      <AccessibilityBadge type="verified" label="휠체어 접근 가능" description="기본 접근 가능 (상세 시설 정보 없음)" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex justify-center pb-8">
          <button
              onClick={handleGoToGroup}
              className="flex items-center justify-center gap-2 w-full md:w-2/3 lg:w-1/2 py-4 bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold rounded-xl shadow-md transition-all duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/xl" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            이 행사 함께 갈 동행 구하기
          </button>
        </div>

      </div>
  );
}

function DetailInfoCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <div className="flex items-center gap-2 text-gray-500 mb-1">{icon}<span>{label}</span></div>
        <p className="text-sm font-semibold text-gray-800">{value}</p>
      </div>
  );
}
