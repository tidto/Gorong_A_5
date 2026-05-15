import React, { useEffect, useRef, useState } from 'react';

interface MapEvent {
    title: string;
    addr1: string;
    mapx?: string; mapX?: string;
    mapy?: string; mapY?: string;
    id?: string; contentid?: string;
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

    // [기본값] 영진전문대학교 정보관 좌표
    const YJU_LAT = 35.8956224;
    const YJU_LNG = 128.6224266;

    const renderMarkers = (map: any) => {
        // 기존 마커 및 오버레이 초기화
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

            // 1. 커스텀 오버레이 컨테이너 생성
            const content = document.createElement('div');
            content.style.cssText = `
                padding: 12px; 
                background: white; 
                border-radius: 12px; 
                border: 1px solid #e5e7eb; 
                box-shadow: 0 4px 12px rgba(0,0,0,0.15); 
                min-width: 160px;
                pointer-events: auto; /* 클릭 이벤트 허용 */
            `;

            content.innerHTML = `
                <div style="font-weight:bold; font-size:13px; color:#111827; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:150px;">
                    ${event.title}
                </div>
                <div style="font-size:11px; color:#6b7280; margin-bottom:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    ${event.addr1 || '주소 정보 없음'}
                </div>
                <button id="btn-detail-${id}" style="width:100%; background:#f97316; color:white; border:none; border-radius:6px; padding:8px; cursor:pointer; font-size:12px; font-weight:bold;">
                    상세보기
                </button>
            `;

            // 2. 오버레이 객체 생성 (clickable: true 필수)
            const overlay = new window.kakao.maps.CustomOverlay({
                content,
                position,
                yAnchor: 1.4,
                zIndex: 10,
                clickable: true
            });

            // 3. 마커 클릭 시 이벤트
            window.kakao.maps.event.addListener(marker, 'click', () => {
                if (activeOverlay.current) activeOverlay.current.setMap(null);
                overlay.setMap(map);
                activeOverlay.current = overlay;
                map.panTo(position);

                // 오버레이가 지도에 붙은 후 버튼에 이벤트 리스너를 다시 확인/할당
                const btn = content.querySelector(`#btn-detail-${id}`);
                if (btn) {
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        console.log("Navigating to ID:", id); // 디버깅용 로그
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

            if (!mapRef.current) {
                mapRef.current = new window.kakao.maps.Map(mapContainer.current, {
                    center: new window.kakao.maps.LatLng(lat, lng),
                    level: initialLevel
                });
            } else {
                mapRef.current.setCenter(new window.kakao.maps.LatLng(lat, lng));
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