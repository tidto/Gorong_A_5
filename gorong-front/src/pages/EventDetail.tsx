import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import MapView from '../components/MapView';
import IconLabel from '../components/IconLabel';
import AccessibilityBadge from '../components/AccessibilityBadge';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Clock, Users, Wallet, Phone } from 'lucide-react';

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
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);

  const DEFAULT_IMAGE = '/images/default-event.png';

  useEffect(() => {
    const fetchEventDetail = async () => {
      if (!id) return;

      try {
        setLoading(true);

        const headers: Record<string, string> = {};
        // 로그인된 경우에만 토큰 추가 (없어도 public 엔드포인트라 괜찮음)
        if (auth.user && typeof auth.user.getIdToken === 'function') {
          const token = await auth.user.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
        }

        // /api/public/map/:id → 비로그인도 접근 가능
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

  // 모집 게시판 글쓰기 페이지로 이동하는 핸들러
  const handleGoToGroup = () => {
    navigate('/group', {
      state: {
        eventId: id,
        eventTitle: event?.title,
        eventImage: event?.firstimage || DEFAULT_IMAGE
      }
    });
  };

  if (loading) return <div className="p-20 text-center font-bold text-orange-600">데이터 로딩 중...</div>;
  if (!event) return (
      <div className="p-20 text-center">
        <p className="text-gray-500 mb-4">행사를 찾을 수 없습니다.</p>
        <button onClick={() => navigate('/')} className="text-orange-500 underline">홈으로 돌아가기</button>
      </div>
  );

  const mapData = [{
    title: event.title,
    addr1: event.addr1,
    mapx: event.mapx,
    mapy: event.mapy,
    contentid: event.contentid
  }];

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
              <DetailInfoCard icon={<Clock className="w-4 h-4" />} label="기간" value="2026.05.01 ~ 05.31" />
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
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">📍 행사 위치</h2>
                <div className="rounded-2xl overflow-hidden border border-gray-200 h-64">
                  <MapView data={mapData} onDetailClick={() => {}} />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">♿ 접근성 정보</h2>
                <div className="flex gap-2 mb-4">
                  <IconLabel type="barrierFree" />
                  <IconLabel type="guideDog" />
                </div>
                <div className="space-y-2">
                  {event.parking && <AccessibilityBadge type="verified" label="주차 가능" description={event.parking} />}
                  {event.elevator && <AccessibilityBadge type="verified" label="엘리베이터" description={event.elevator} />}
                  {event.restroom && <AccessibilityBadge type="verified" label="화장실" description={event.restroom} />}
                  {!event.parking && !event.elevator && !event.restroom && (
                      <AccessibilityBadge type="verified" label="휠체어 접근 가능" description="현장 확인 완료" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- 새로 추가된 모집 게시판 이동 버튼 영역 --- */}
        <div className="mt-10 flex justify-center pb-8">
          <button
              onClick={handleGoToGroup}
              className="flex items-center justify-center gap-2 w-full md:w-2/3 lg:w-1/2 py-4 bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold rounded-xl shadow-md transition-all duration-200"
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

function DetailInfoCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <div className="flex items-center gap-2 text-gray-500 mb-1">{icon}<span>{label}</span></div>
        <p className="text-sm font-semibold text-gray-800">{value}</p>
      </div>
  );
}