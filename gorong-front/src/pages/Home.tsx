import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import RiveCharacter from '../components/RiveCharacter'
import MapView from '../components/MapView'
import Card from '../components/Card'
import { useAuth } from '../contexts/AuthContext'
import { Search } from 'lucide-react'

const CATEGORY_MAP: Record<string, string> = {
  'NA': 'A01', 'VE': 'A02', 'LS': 'A03', 'SH': 'A04', 'FD': 'A05', 'C01': 'C01'
};

const REGION_BOUNDARY = {
  LAT_MIN: 35.5, LAT_MAX: 37.0,
  LNG_MIN: 128.0, LNG_MAX: 130.0
};

export default function Home() {
  const navigate = useNavigate()
  const auth = useAuth()
  const [events, setEvents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const DEFAULT_IMAGE = '/images/default-event.png';

  useEffect(() => {
    const fetchEvents = async () => {
      // 인증 정보가 로드될 때까지 대기
      if (!auth.user) return;

      setIsLoading(true);
      try {
        // 💡 SecurityConfig의 .authenticated()를 통과하기 위한 토큰 추출
        const token = await auth.user.getIdToken();

        const response = await fetch('/api/map', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`, // 출입증 지참
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) throw new Error('인증 에러 (403)');

        const data = await response.json();
        setEvents(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("데이터 로드 실패:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [auth.user]);

  const displayEvents = useMemo(() => {
    return events.filter(event => {
      // 백엔드 필드명 대소문자 방어 로직
      const lat = parseFloat(event.mapy || event.mapY);
      const lng = parseFloat(event.mapx || event.mapX);

      if (isNaN(lat) || isNaN(lng)) return false;

      const isInsideRegion =
          lat >= REGION_BOUNDARY.LAT_MIN && lat <= REGION_BOUNDARY.LAT_MAX &&
          lng >= REGION_BOUNDARY.LNG_MIN && lng <= REGION_BOUNDARY.LNG_MAX;

      const title = event.title || "";
      const addr = event.addr1 || "";
      const matchesSearch =
          title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          addr.toLowerCase().includes(searchQuery.toLowerCase());

      return isInsideRegion && matchesSearch;
    });
  }, [events, searchQuery]);

  const recommendedEvents = useMemo(() => {
    const interests = auth.user?.interests || [];
    const targetCodes = interests.map(interest => CATEGORY_MAP[interest]);

    return [...displayEvents].sort((a, b) => {
      const aCode = a.tourCategoryCode || a.cat3 || "";
      const bCode = b.tourCategoryCode || b.cat3 || "";
      const aMatch = targetCodes.some(code => aCode.startsWith(code)) ? 1 : 0;
      const bMatch = targetCodes.some(code => bCode.startsWith(code)) ? 1 : 0;
      return bMatch - aMatch;
    }).slice(0, 6);
  }, [displayEvents, auth.user?.interests]);

  const handleDetailNavigation = useCallback((id: string) => {
    if (id) navigate(`/events/${id}`);
  }, [navigate]);

  return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 text-left">
        <section className="bg-gradient-to-br from-orange-50 to-white rounded-2xl p-8 border border-orange-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1 space-y-6">
            <h1 className="text-4xl font-bold text-gray-900">
              안녕, {auth.user?.nickname || 'Go냥이'}! 👋
            </h1>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 transition-all shadow-sm"
                  placeholder="대구/경북 행사를 검색해보세요"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="w-48 h-48 bg-orange-100 rounded-full flex items-center justify-center overflow-hidden">
            <RiveCharacter />
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-orange-500">📍</span> 대구/경북 주변 행사
          </h2>
          <div className="w-full h-[500px] rounded-2xl overflow-hidden shadow-lg border border-gray-200 relative">
            <MapView data={displayEvents} onDetailClick={handleDetailNavigation} />
            {isLoading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center font-bold text-orange-600 z-10">
                  데이터 로딩 중...
                </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-orange-500">🎯</span> {auth.user?.nickname || 'Go냥이'}님을 위한 맞춤 추천
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedEvents.length > 0 ? (
                recommendedEvents.map((event) => (
                    <Card
                        key={event.id || event.contentid}
                        title={event.title}
                        description={event.addr1}
                        image={event.firstImage || event.firstimage || DEFAULT_IMAGE}
                        onClick={() => handleDetailNavigation(event.id || event.contentid)}
                    />
                ))
            ) : (
                <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed rounded-2xl">
                  추천 행사가 없습니다.
                </div>
            )}
          </div>
        </section>
      </div>
  )
}