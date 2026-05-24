import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import RiveCharacter from '../components/RiveCharacter'
import MapView from '../components/MapView'
import Card from '../components/Card'
import { useAuth } from '../contexts/AuthContext'
import { Search, Trophy, CloudSun, Target } from 'lucide-react' // Target 아이콘 추가

const CATEGORY_MAP: Record<string, string> = {
    'NA': 'A01', 'VE': 'A02', 'LS': 'A03', 'SH': 'A04', 'FD': 'A05', 'C01': 'C01'
};

const RECOMMEND_BY_WEATHER: Record<string, string[]> = {
    'Clear': ['A03', 'A04'],
    'Clouds': ['A03', 'A04'],
    'Rain': ['A01', 'A02'],
    'Snow': ['A01', 'A02'],
};

const RECOMMEND_BY_TIME: Record<'DAY' | 'NIGHT', string[]> = {
    'DAY': ['A03', 'A04', 'A05'],
    'NIGHT': ['A01', 'A03']
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
    const [topEvents, setTopEvents] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

    // 지도의 중심 좌표를 강제로 제어하기 위한 독립 상태 추가
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(DEFAULT_LOCATION)

    const [weatherState, setWeatherState] = useState<string>('Clear')
    const [timeState, setTimeState] = useState<'DAY' | 'NIGHT'>('DAY')

    const DEFAULT_IMAGE = '/images/default-event.png';

    // 1. 위치 감지 로직 (HTTP 배포 환경 서울 튕김 예외 처리 포함)
    useEffect(() => {
        if (!auth.user) {
            setUserLocation(null);
            return;
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setUserLocation(loc);
                    setMapCenter(loc); // 최초 로드 시 중심을 사용자 위치로 설정
                },
                async () => {
                    try {
                        const res = await fetch('https://ipapi.co/json/');
                        const data = await res.json();
                        if (data.region === 'Seoul' || !data.latitude || !data.longitude) {
                            setUserLocation(DEFAULT_LOCATION);
                            setMapCenter(DEFAULT_LOCATION);
                        } else {
                            const loc = { lat: data.latitude, lng: data.longitude };
                            setUserLocation(loc);
                            setMapCenter(loc);
                        }
                    } catch {
                        setUserLocation(DEFAULT_LOCATION);
                        setMapCenter(DEFAULT_LOCATION);
                    }
                },
                { timeout: 5000 }
            );
        } else {
            setUserLocation(DEFAULT_LOCATION);
            setMapCenter(DEFAULT_LOCATION);
        }
    }, [auth.user]);

    // 2. 실시간 날씨 API(OpenWeatherMap) 호출 및 시간대 판단 로직
    useEffect(() => {
        const currentHour = new Date().getHours();
        const isNight = currentHour >= 18 || currentHour < 6;
        setTimeState(isNight ? 'NIGHT' : 'DAY');

        const fetchWeatherData = async () => {
            const lat = userLocation?.lat || DEFAULT_LOCATION.lat;
            const lng = userLocation?.lng || DEFAULT_LOCATION.lng;
            const apiKey = import.meta.env.VITE_WEATHER_API_KEY;

            if (!apiKey) return;

            try {
                const response = await fetch(
                    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}`
                );
                if (response.ok) {
                    const data = await response.json();
                    if (data.weather && data.weather[0]) {
                        setWeatherState(data.weather[0].main);
                    }
                }
            } catch (err) {
                console.error("날씨 API 연동 실패:", err);
            }
        };

        fetchWeatherData();
    }, [userLocation]);

    // 3. 행사 데이터 호출 및 인기 행사 분리 로직
    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoading(true);
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

            try {
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

                if (mappedData.length > 0) {
                    setTopEvents(mappedData.slice(0, 10));
                }

            } catch (err) {
                console.error("데이터 로드 중 오류 발생:", err);
                setEvents([]);
                setTopEvents([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllData();
    }, []);

    // 4. 지도 및 리스트 필터링
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

    // 5. 관심사 + 실시간 날씨/시간 복합 가중치 추천 알고리즘
    const recommendedEvents = useMemo(() => {
        const weatherTargets = RECOMMEND_BY_WEATHER[weatherState] || [];
        const timeTargets = RECOMMEND_BY_TIME[timeState] || [];

        const userInterests = auth.user?.interests || [];
        const interestCodes = userInterests.map((interest: string) => CATEGORY_MAP[interest]).filter(Boolean);

        return [...displayEvents]
            .map(event => {
                let score = 0;
                const eventCode = (event.tourCategoryCode || event.cat3 || "").toUpperCase();

                if (interestCodes.some((code: string) => eventCode.startsWith(code))) score += 3;
                if (weatherTargets.some(code => eventCode.startsWith(code))) score += 2;
                if (timeTargets.some(code => eventCode.startsWith(code))) score += 1;

                return { ...event, score };
            })
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return 0.5 - Math.random();
            })
            .slice(0, 6);
    }, [displayEvents, auth.user, weatherState, timeState]);

    const handleDetailNavigation = useCallback((id: string) => {
        if (id) {
            navigate(`/events/${id}`);
        }
    }, [navigate]);

    // ★ [신규] 버튼 클릭 시 사용자의 현재 위치 좌표로 지도의 중심을 강제 리셋하는 함수
    const handleRecenterToUserLocation = useCallback(() => {
        if (userLocation) {
            // 현재 감지된 실시간 유저 좌표로 맵 센터 재설정
            setMapCenter({ ...userLocation });
        } else {
            // GPS 미감지 상태일 경우 기본 영진전문대 좌표로 리셋
            setMapCenter({ ...DEFAULT_LOCATION });
        }
    }, [userLocation]);

    const weatherNoticeText = useMemo(() => {
        const statusMap: Record<string, string> = {
            'Clear': '☀️ 맑고 선선한 오늘, 야외 축제나 야외 활동',
            'Rain': '🌧️ 비가 내리는 오늘, 포근한 실내 전시회나 문화 공간',
            'Clouds': '☁️ 흐린 하늘인 오늘, 부담 없이 걷기 좋은 행사',
            'Snow': '❄️ 하얀 눈이 내리는 오늘, 감성 가득한 실내 문화 행사'
        };
        return `${statusMap[weatherState] || '☀️ 오늘 날씨에 딱 맞는'} 추천 카드를 조합해 보았어요.`;
    }, [weatherState]);

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-12 text-left">
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

            {/* 인기 행사 TOP 10 랭킹 섹션 */}
            {topEvents.length > 0 && (
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-amber-500" />
                        지금 가장 핫한 인기 행사 <span className="text-orange-500">TOP 10</span>
                    </h2>
                    <div className="flex gap-6 overflow-x-auto pb-4 pt-2 snap-x scrollbar-hide scroll-smooth">
                        {topEvents.map((event, index) => (
                            <div key={`top-${event.id}`} className="snap-start shrink-0 w-72 relative group">
                                <div className="absolute top-3 left-3 z-10 w-10 h-10 bg-black/80 backdrop-blur-sm border border-orange-400 text-white flex items-center justify-center font-black rounded-xl shadow-lg text-lg">
                                    {index + 1}
                                </div>
                                <Card
                                    title={event.title}
                                    description={event.addr1 || event.address}
                                    image={event.image}
                                    onClick={() => handleDetailNavigation(event.id)}
                                />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* 지도 섹션 (내 위치 GPS 이동 버튼 추가됨) */}
            <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-orange-500">📍</span> 대구/경북 주변 행사
                </h2>
                <div className="w-full h-[500px] rounded-2xl overflow-hidden shadow-lg border border-gray-200 relative group">
                    {/* MapView에 고정 좌표대신 동적 가변 상태인 mapCenter 바인딩 */}
                    <MapView
                        data={displayEvents}
                        onDetailClick={handleDetailNavigation}
                        userLocation={mapCenter}
                    />

                    {/* ★ [신규 추가] 지도 내 위치 트래킹 플로팅 버튼 UI */}
                    <button
                        onClick={handleRecenterToUserLocation}
                        className="absolute bottom-6 right-6 z-20 p-3 bg-white hover:bg-gray-50 text-gray-800 rounded-full shadow-xl border border-gray-200/80 hover:text-orange-500 transition-all active:scale-95"
                        title="내 위치로 지도 이동"
                    >
                        <Target className="w-6 h-6 text-orange-500" />
                    </button>

                    {isLoading && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center font-bold text-orange-600 z-10">
                            데이터 로딩 중...
                        </div>
                    )}
                </div>
            </section>

            {/* 추천 카드 섹션 */}
            <section>
                <div className="mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-orange-500">🎯</span> {auth.user?.nickname || 'Go냥이'}님을 위한 맞춤 추천
                    </h2>
                    <p className="text-sm font-medium text-gray-500 mt-1 flex items-center gap-1">
                        <CloudSun className="w-4 h-4 text-orange-400" /> {weatherNoticeText}
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recommendedEvents.map((event) => (
                        <Card
                            key={event.id}
                            title={event.title}
                            description={event.addr1}
                            image={event.image}
                            onClick={() => handleDetailNavigation(event.id)}
                        />
                    ))}
                </div>
            </section>
        </div>
    )
}