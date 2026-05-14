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

            const content = document.createElement('div');
            content.style.cssText = 'padding:10px; background:white; border-radius:8px; border:1px solid #ddd; box-shadow:0 2px 6px rgba(0,0,0,0.1); min-width:140px;';
            content.innerHTML = `
                <div style="font-weight:bold; font-size:12px; margin-bottom:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:140px;">${event.title}</div>
                <button style="width:100%; background:#f97316; color:white; border:none; border-radius:4px; padding:6px; cursor:pointer; font-size:11px;">상세보기</button>
            `;
            content.querySelector('button')?.addEventListener('click', (e) => {
                e.stopPropagation();
                onDetailClick(id);
            });

            const overlay = new window.kakao.maps.CustomOverlay({
                content,
                position,
                yAnchor: 1.5
            });

            window.kakao.maps.event.addListener(marker, 'click', () => {
                if (activeOverlay.current) activeOverlay.current.setMap(null);
                overlay.setMap(map);
                activeOverlay.current = overlay;
                map.panTo(position);
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
        if (userMarkerRef.current) {
            userMarkerRef.current.setMap(null);
        }

        const position = new window.kakao.maps.LatLng(lat, lng);
        const content = document.createElement('div');
        content.style.cssText = `width: 20px; height: 20px; background: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 0 4px rgba(59,130,246,0.3); position: relative;`;

        const tooltip = document.createElement('div');
        tooltip.style.cssText = `position: absolute; bottom: 28px; left: 50%; transform: translateX(-50%); background: #1e40af; color: white; font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 4px; white-space: nowrap;`;
        tooltip.textContent = '현재 위치';
        content.appendChild(tooltip);

        const overlay = new window.kakao.maps.CustomOverlay({ content, position, yAnchor: 0.5, xAnchor: 0.5, zIndex: 5 });
        overlay.setMap(map);
        userMarkerRef.current = overlay;
    };

    const initMap = (lat: number, lng: number) => {
        window.kakao.maps.load(() => {
            if (!mapContainer.current) return;
            if (!mapRef.current) {
                mapRef.current = new window.kakao.maps.Map(mapContainer.current, {
                    center: new window.kakao.maps.LatLng(lat, lng),
                    level: 10 // 사용자님의 설정 유지
                });
            } else {
                mapRef.current.setCenter(new window.kakao.maps.LatLng(lat, lng));
            }
            renderMarkers(mapRef.current);
            renderUserMarker(mapRef.current, lat, lng);
        });
    };

    useEffect(() => {
        const centerLat = userLocation?.lat ?? 35.8714;
        const centerLng = userLocation?.lng ?? 128.6014;
        const run = () => initMap(centerLat, centerLng);

        if (!window.kakao || !window.kakao.maps) {
            const script = document.createElement('script');
            // 보안을 위해 환경 변수 키 사용 유지
            script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAO_MAP_KEY}&autoload=false`;
            script.async = true;
            script.onload = run;
            document.head.appendChild(script);
        } else {
            run();
        }
    }, [data, userLocation, onDetailClick]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div ref={mapContainer} style={{ width: '100%', height: '100%', minHeight: '500px' }} />
            {markerCount > 0 && (
                <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 10, background: 'rgba(255,255,255,0.93)', borderRadius: 8, padding: '4px 12px', fontSize: 13, fontWeight: 'bold', color: '#ea580c', boxShadow: '0 2px 6px rgba(0,0,0,0.12)' }}>
                    📍 {markerCount}개 행사
                </div>
            )}
        </div>
    );
}