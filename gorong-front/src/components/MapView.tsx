import React, { useEffect, useRef, useState } from 'react';

interface MapEvent {
    title: string;
    addr1: string;
    mapx?: string; mapX?: string;
    mapy?: string; mapY?: string;
    id?: string; contentid?: string;
    firstimage?: string; firstImage?: string;
    eventstartdate?: string; eventenddate?: string;
}

interface MapViewProps {
    data: MapEvent[];
    onDetailClick: (id: string) => void;
    userLocation?: { lat: number; lng: number } | null;
}

export default function MapView({ data, onDetailClick, userLocation }: MapViewProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const activeOverlay = useRef<any>(null);
    const userMarkerRef = useRef<any>(null);
    const [markerCount, setMarkerCount] = useState(0);

    const YJU_LAT = 35.8956224;
    const YJU_LNG = 128.6224266;

    const DEFAULT_IMAGE = '/images/default-event.png';

    const renderMarkers = (map: any) => {
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];
        if (activeOverlay.current) {
            activeOverlay.current.setMap(null);
            activeOverlay.current = null;
        }

        let count = 0;

        data.forEach((event) => {
            const lat = parseFloat(event.mapy ?? event.mapY ?? '');
            const lng = parseFloat(event.mapx ?? event.mapX ?? '');
            const id = event.id || event.contentid;

            if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0 || !id) return;

            const position = new window.kakao.maps.LatLng(lat, lng);
            const marker = new window.kakao.maps.Marker({ position, map });
            markersRef.current.push(marker);
            count++;

            const eventImage = event.firstimage || event.firstImage || DEFAULT_IMAGE;

            const formatPeriod = () => {
                if (!event.eventstartdate || !event.eventenddate) return '일정 정보 없음';
                const start = event.eventstartdate.replace(/(\d{4})(\d{2})(\d{2})/, '$1.$2.$3');
                const end = event.eventenddate.replace(/(\d{4})(\d{2})(\d{2})/, '$1.$2.$3');
                return `${start} ~ ${end}`;
            };

            const content = document.createElement('div');
            content.style.cssText = `
                background: white; 
                border-radius: 16px; 
                border: 1px solid #f3f4f6; 
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); 
                width: 240px;
                overflow: hidden;
                pointer-events: auto;
                font-family: system-ui, -apple-system, sans-serif;
            `;

            content.innerHTML = `
                <div style="width: 100%; height: 110px; position: relative; background: #f3f4f6;">
                    <img src="${eventImage}" 
                         style="width: 100%; height: 100%; object-fit: cover; display: block;" 
                         onerror="this.src='${DEFAULT_IMAGE}';"
                         alt="${event.title}" />
                </div>
                <div style="padding: 12px; text-align: left;">
                    <div style="font-weight: 800; font-size: 14px; color: #111827; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">
                        ${event.title}
                    </div>
                    <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        📅 ${formatPeriod()}
                    </div>
                    <div style="font-size: 11px; color: #6b7280; margin-bottom: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        📍 ${event.addr1 || '주소 정보 없음'}
                    </div>
                    <button id="btn-detail-${id}" style="width: 100%; background: #f97316; color: white; border: none; border-radius: 8px; padding: 10px; cursor: pointer; font-size: 12px; font-weight: bold; transition: background 0.2s;">
                        상세보기
                    </button>
                </div>
            `;

            const overlay = new window.kakao.maps.CustomOverlay({
                content,
                position,
                yAnchor: 1.35,
                zIndex: 10,
                clickable: true
            });

            window.kakao.maps.event.addListener(marker, 'click', () => {
                if (activeOverlay.current) activeOverlay.current.setMap(null);
                overlay.setMap(map);
                activeOverlay.current = overlay;
                map.panTo(position);

                const btn = content.querySelector(`#btn-detail-${id}`);
                if (btn) {
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        onDetailClick(id);
                    };
                }
            });
        });

        window.kakao.maps.event.addListener(map, 'click', () => {
            if (activeOverlay.current) {
                activeOverlay.current.setMap(null);
                activeOverlay.current = null;
            }
        });

        setMarkerCount(count);
    };

    const renderUserMarker = (map: any, lat: number, lng: number) => {
        if (userMarkerRef.current) userMarkerRef.current.setMap(null);
        const position = new window.kakao.maps.LatLng(lat, lng);
        const content = document.createElement('div');
        content.style.cssText = `width: 20px; height: 20px; background: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 0 4px rgba(59,130,246,0.3);`;
        const overlay = new window.kakao.maps.CustomOverlay({ content, position, yAnchor: 0.5, xAnchor: 0.5, zIndex: 5 });
        overlay.setMap(map);
        userMarkerRef.current = overlay;
    };

    const initMap = (lat: number, lng: number) => {
        window.kakao.maps.load(() => {
            if (!mapContainer.current) return;
            const isDefault = (lat === YJU_LAT && lng === YJU_LNG);
            const initialLevel = isDefault ? 9 : 4;
            const centerPosition = new window.kakao.maps.LatLng(lat, lng);

            if (!mapRef.current) {
                mapRef.current = new window.kakao.maps.Map(mapContainer.current, {
                    center: centerPosition,
                    level: initialLevel
                });
            } else {
                mapRef.current.setCenter(centerPosition);
                mapRef.current.setLevel(initialLevel);
            }

            renderMarkers(mapRef.current);
            renderUserMarker(mapRef.current, lat, lng);
        });
    };

    useEffect(() => {
        const isUserLocationValid = userLocation && userLocation.lat !== 0 && userLocation.lng !== 0;
        const centerLat = isUserLocationValid ? userLocation!.lat : YJU_LAT;
        const centerLng = isUserLocationValid ? userLocation!.lng : YJU_LNG;

        const runInit = () => initMap(centerLat, centerLng);

        if (window.kakao && window.kakao.maps && window.kakao.maps.load) {
            runInit();
        } else {
            const scriptId = 'kakao-map-sdk';
            let script = document.getElementById(scriptId) as HTMLScriptElement;
            if (!script) {
                script = document.createElement('script');
                script.id = scriptId;
                script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=ab5c798e9276eae445ee5cf4e4ea329c&autoload=false&libraries=services,clusterer`;
                script.async = true;
                document.head.appendChild(script);
            }
            script.onload = () => window.kakao.maps.load(runInit);
        }
    }, [data, userLocation]);

    // ★ [정밀 수정] 크기 변경 감지 루프 내 이중 렌더링 스케줄러(Timeout + rAF) 도입
    useEffect(() => {
        if (!mapContainer.current) return;

        let timeoutId: ReturnType<typeof setTimeout>;

        const resizeObserver = new ResizeObserver(() => {
            // 연속적인 호출 발생 시 이전 타이머 제거 (디바운싱 방어 코드)
            if (timeoutId) clearTimeout(timeoutId);

            // 브라우저의 다음 페인팅 주기 이후에 실행되도록 보장하여 치우침을 원천 차단
            timeoutId = setTimeout(() => {
                requestAnimationFrame(() => {
                    if (mapRef.current) {
                        mapRef.current.relayout();

                        const isUserLocationValid = userLocation && userLocation.lat !== 0 && userLocation.lng !== 0;
                        const centerLat = isUserLocationValid ? userLocation!.lat : YJU_LAT;
                        const centerLng = isUserLocationValid ? userLocation!.lng : YJU_LNG;

                        const centerPosition = new window.kakao.maps.LatLng(centerLat, centerLng);
                        mapRef.current.setCenter(centerPosition);
                    }
                });
            }, 200); // 200ms 여유를 주어 레이아웃이 최종 확정된 후 중앙 정렬 처리
        });

        resizeObserver.observe(mapContainer.current);

        return () => {
            resizeObserver.disconnect();
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [userLocation]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div ref={mapContainer} style={{ width: '100%', height: '100%', minHeight: '500px' }} />
            {markerCount > 0 && (
                <div style={{
                    position: 'absolute', bottom: 12, left: 12, zIndex: 10,
                    background: 'rgba(255,255,255,0.95)', borderRadius: 8,
                    padding: '6px 14px', fontSize: 13, fontWeight: 'bold',
                    color: '#ea580c', boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                    border: '1px solid #fed7aa'
                }}>
                    📍 {markerCount}개 행사 발견
                </div>
            )}
        </div>
    );
}