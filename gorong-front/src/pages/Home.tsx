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
    LAT_MIN: 34.0, LAT_MAX: 38.5,
    LNG_MIN: 126.0, LNG_MAX: 131.0
};

const DEFAULT_LOCATION = { lat: 35.8956, lng: 128.6224 }; // 영진전문대 좌표

export default function Home() {
    const navigate = useNavigate()
    const auth = useAuth()
    const [events, setEvents] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

    const DEFAULT_IMAGE = '/images/default-event.png';

    // 1. 위치 감지 로직: 로그인 시에만 작동
    useEffect(() => {
        if (!auth.user) {
            setUserLocation(null);
            return;
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                },
                async () => {
                    try {
                        const res = await fetch('https://ipapi.co/json/');
                        const data = await res.json();
                        setUserLocation(data.latitude ? { lat: data.latitude, lng: data.longitude } : DEFAULT_LOCATION);
                    } catch {
                        setUserLocation(DEFAULT_LOCATION);
                    }
                },
                { timeout: 5000 }
            );
        } else {
            setUserLocation(DEFAULT_LOCATION);
        }
    }, [auth.user]);

    // 2. 행사 데이터 호출 로직
    useEffect(() => {
        const fetchEvents = async () => {
            setIsLoading(true);
            try {
                const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
                const response = await fetch(`${baseUrl}/public/map`);
                if (!response.ok) throw new Error("로드 실패");
                const data = await response.json();

                const mappedData = Array.isArray(data) ? data.map(item => ({
                    ...item,
                    id: item.contentid?.toString() || item.id?.toString(),
                    mapx: item.mapx || item.mapX,
                    mapy: item.mapy || item.mapY,
                    addr1: item.addr1 || item.address,
                    image: item.firstimage || item.firstImage || DEFAULT_IMAGE
                })) : [];

                setEvents(mappedData);
            } catch (err) {
                console.error(err);
                setEvents([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchEvents();
    }, []);

    // 3. 지도 및 리스트 필터링
    const displayEvents = useMemo(() => {
        return events.filter(event => {
            const lat = parseFloat(event.mapy ?? '');
            const lng = parseFloat(event.mapx ?? '');
            if (isNaN(lat) || isNaN(lng)) return false;

            const isInsideRegion = lat >= REGION_BOUNDARY.LAT_MIN && lat <= REGION_BOUNDARY.LAT_MAX &&
                lng >= REGION_BOUNDARY.LNG_MIN && lng <= REGION_BOUNDARY.LNG_MAX;

            if (!isInsideRegion) return false;

            const query = searchQuery.trim().toLowerCase();
            if (!query) return true;
            return event.title.toLowerCase().includes(query) || event.addr1.toLowerCase().includes(query);
        });
    }, [events, searchQuery]);

    // 4. 추천 필터링 (비로그인 시에는 전체 목록 중 상위 6개)
    const recommendedEvents = useMemo(() => {
        // 비로그인 시 데이터를 무작위로 섞어서 6개 추출
        if (!auth.user) {
            return [...displayEvents].sort(() => Math.random() - 0.5).slice(0, 6);
        }

        // 2. 로그인 상태: 관심사 기반 정렬 로직 강화
        // auth.user.interests가 ['NA', 'VE'] 형태인지 확인 필요
        const userInterests = auth.user?.interests || []
        // 유저의 관심사 문자를 API 카테고리 코드(A01, A02 등)로 변환
        const targetCodes = userInterests.map((interest: string) => CATEGORY_MAP[interest]).filter(Boolean);

        // [검증용 로그] 사용자의 관심사 코드 확인
        console.log("✅ 현재 로그인 유저 관심사 키:", userInterests);
        console.log("🔍 매칭 대상 카테고리 코드:", targetCodes);

        return [...displayEvents]
            .sort((a, b) => {
                // 각 행사의 카테고리 코드 추출 (tourCategoryCode 또는 cat3)
                const aCode = (a.tourCategoryCode || a.cat3 || "").toUpperCase();
                const bCode = (b.tourCategoryCode || b.cat3 || "").toUpperCase();

                // 관심사 코드가 행사의 카테고리 코드로 시작하는지 확인 (가중치 부여)
                const aMatch = targetCodes.some((code: string) => aCode.startsWith(code)) ? 1 : 0;
                const bMatch = targetCodes.some((code: string) => bCode.startsWith(code)) ? 1 : 0;

                // 가중치가 높은 순(1 -> 0)으로 정렬하고, 가중치가 같다면 최신 등록순 혹은 랜덤 섞기
                if (bMatch !== aMatch) return bMatch - aMatch;
                return 0.5 - Math.random(); // 같은 가중치 내에서도 랜덤성을 주어 단조로움 방지
            })
            .slice(0, 6);
    }, [displayEvents, auth.user, auth.loggedIn]);

    const handleDetailNavigation = useCallback((id: string) => {
        if (id) {
            console.log("Navigating to:", id);
            navigate(`/events/${id}`);
        }
    }, [navigate]);

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 text-left">
            {/* 상단 웰컴 섹션 */}
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
                <div className="w-48 h-48 bg-orange-100 rounded-full flex items-center justify-center overflow-hidden shadow-inner">
                    <RiveCharacter />
                </div>
            </section>

            {/* 지도 섹션 */}
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

            {/* 추천 카드 섹션 */}
            <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-orange-500">🎯</span> {auth.user?.nickname || 'Go냥이'}님을 위한 맞춤 추천
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recommendedEvents.map((event) => (
                        <Card
                            key={event.id}
                            title={event.title}
                            description={event.addr1}
                            image={event.image}
                            onClick={() => handleDetailNavigation(event.id)} // 전달된 ID로 이동
                        />
                    ))}
                </div>
            </section>
        </div>
    )
}

