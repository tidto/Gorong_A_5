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

const DEFAULT_LOCATION = { lat: 35.8714, lng: 128.6014 };

export default function Home() {
    const navigate = useNavigate()
    const auth = useAuth()
    const [events, setEvents] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

    const DEFAULT_IMAGE = '/images/default-event.png';

    // 1. 위치 감지 로직
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                },
                async () => {
                    try {
                        const res = await fetch('https://ipapi.co/json/');
                        const data = await res.json();
                        if (data.latitude && data.longitude) {
                            setUserLocation({ lat: data.latitude, lng: data.longitude });
                        } else {
                            setUserLocation(DEFAULT_LOCATION);
                        }
                    } catch {
                        setUserLocation(DEFAULT_LOCATION);
                    }
                },
                { timeout: 5000 }
            );
        } else {
            setUserLocation(DEFAULT_LOCATION);
        }
    }, []);

    // 2. 행사 데이터 호출 로직
    useEffect(() => {
        const fetchEvents = async () => {
            setIsLoading(true);
            try {
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json'
                };

                // Firebase 인증 토큰 안전한 주입
                if (auth?.user && typeof auth.user.getIdToken === 'function') {
                    const token = await auth.user.getIdToken();
                    headers['Authorization'] = `Bearer ${token}`;
                }

                // 환경 변수를 활용한 명시적 백엔드 URL 호출
                const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
                const response = await fetch(`${baseUrl}/public/map`, {
                    method: 'GET',
                    headers
                });

                if (!response.ok) {
                    throw new Error(`데이터 로드 실패: ${response.status}`);
                }

                const data = await response.json();

                // MapView 컴포넌트 인터페이스 규격에 맞게 속성명 일치화
                const mappedData = Array.isArray(data) ? data.map(item => ({
                    ...item,
                    id: item.contentid?.toString() || item.id?.toString(),
                    mapx: item.mapx || item.mapX,
                    mapy: item.mapy || item.mapY,
                    addr1: item.addr1 || item.address
                })) : [];

                setEvents(mappedData);
            } catch (err) {
                console.error("데이터 로드 실패:", err);
                setEvents([]);
            } finally {
                setIsLoading(false);
            }
        };

        if (auth.user !== undefined) {
            fetchEvents();
        }
    }, [auth.user]);

    // 3. 지도 표시용 데이터 필터링
    const displayEvents = useMemo(() => {
        return events.filter(event => {
            const lat = parseFloat(event.mapy ?? '');
            const lng = parseFloat(event.mapx ?? '');
            if (isNaN(lat) || isNaN(lng)) return false;

            const isInsideRegion =
                lat >= REGION_BOUNDARY.LAT_MIN && lat <= REGION_BOUNDARY.LAT_MAX &&
                lng >= REGION_BOUNDARY.LNG_MIN && lng <= REGION_BOUNDARY.LNG_MAX;

            const title = (event.title || "").toLowerCase();
            const addr = (event.addr1 || "").toLowerCase();
            const query = searchQuery.toLowerCase();

            return isInsideRegion && (title.includes(query) || addr.includes(query));
        });
    }, [events, searchQuery]);

    // 4. 사용자 맞춤 추천 필터링
    const recommendedEvents = useMemo(() => {
        const interests = auth.user?.interests || [];
        const targetCodes = interests.map((interest: string) => CATEGORY_MAP[interest]);

        return [...displayEvents].sort((a, b) => {
            const aCode = a.tourCategoryCode || a.cat3 || "";
            const bCode = b.tourCategoryCode || b.cat3 || "";
            const aMatch = targetCodes.some((code: string) => aCode.startsWith(code)) ? 1 : 0;
            const bMatch = targetCodes.some((code: string) => bCode.startsWith(code)) ? 1 : 0;
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
                    <MapView
                        data={displayEvents}
                        onDetailClick={handleDetailNavigation}
                        userLocation={userLocation}
                    />
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
                            {auth.user ? '추천 행사가 없습니다.' : '로그인하면 맞춤 행사를 추천해드려요 🐱'}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}