import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import MapView from '../components/MapView';
import Button from '../components/Button';
import IconLabel from '../components/IconLabel'
import RiveCharacter from '../components/RiveCharacter';
import AccessibilityBadge from '../components/AccessibilityBadge';
import { ArrowLeft, Clock, Users, MapPin, Info, Wallet, Phone } from 'lucide-react';

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
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);

  const DEFAULT_IMAGE = '/images/default-event.png';

  useEffect(() => {
    const fetchEventDetail = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/map`);
        const found = response.data.find((item: any) => String(item.contentid) === id);
        if (found) setEvent(found);
      } catch (error) {
        console.error("상세 데이터 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchEventDetail();
  }, [id]);

  if (loading) return <div className="p-20 text-center font-bold">데이터 로딩 중...</div>;
  if (!event) return <div className="p-20 text-center font-bold">행사를 찾을 수 없습니다.</div>;

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
            <img src={event.firstimage || DEFAULT_IMAGE} className="w-full h-full object-cover" alt={event.title} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-8">
              <h1 className="text-4xl font-bold text-white mb-2">{event.title}</h1>
              <p className="text-lg text-white/90">{event.addr1}</p>
            </div>
          </div>

          <div className="p-8 space-y-10">
            {/* 상세 정보 섹션 */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1"><Clock className="w-4 h-4" /><span>기간</span></div>
                <p className="text-sm font-semibold text-gray-800">2026.05.01 ~ 05.31</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1"><Wallet className="w-4 h-4" /><span>요금</span></div>
                <p className="text-sm font-semibold text-gray-800">{event.usefee || '무료'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1"><Users className="w-4 h-4" /><span>분류</span></div>
                <p className="text-sm font-semibold text-gray-800">{event.cat3 || '문화행사'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1"><Phone className="w-4 h-4" /><span>문의</span></div>
                <p className="text-sm font-semibold text-gray-800">{event.tel || '정보 없음'}</p>
              </div>
            </section>

            {/* 설명 및 지도 섹션 */}
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
                <div className="space-y-3">
                  <AccessibilityBadge type="verified" label="휠체어 접근 가능" description="현장 확인 완료" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}