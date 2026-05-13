import React, { useEffect, useRef } from 'react';

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
}

export default function MapView({ data, onDetailClick }: MapViewProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const activeOverlay = useRef<any>(null);
    const markersRef = useRef<any[]>([]); // 마커 관리용

    useEffect(() => {
        (window as any).openDetail = (id: string) => onDetailClick(id);

        const initMap = () => {
            window.kakao.maps.load(() => {
                if (!mapContainer.current) return;

                const options = {
                    center: new window.kakao.maps.LatLng(35.8888, 128.6103),
                    level: 7
                };
                const map = new window.kakao.maps.Map(mapContainer.current, options);

                // 기존 마커 제거
                markersRef.current.forEach(m => m.setMap(null));
                markersRef.current = [];

                data.forEach((event) => {
                    const lat = parseFloat(event.mapy || event.mapY || "0");
                    const lng = parseFloat(event.mapx || event.mapX || "0");
                    const id = event.id || event.contentid;

                    if (!lat || !lng || !id) return;

                    const position = new window.kakao.maps.LatLng(lat, lng);
                    const marker = new window.kakao.maps.Marker({ position, map });
                    markersRef.current.push(marker);

                    const content = document.createElement('div');
                    content.style.cssText = 'padding:10px; background:white; border-radius:8px; border:1px solid #ddd; box-shadow: 0 2px 6px rgba(0,0,0,0.1);';
                    content.innerHTML = `
                        <div style="font-weight:bold; font-size:12px; margin-bottom:5px; white-space:nowrap;">${event.title}</div>
                        <button style="width:100%; background:#f97316; color:white; border:none; border-radius:4px; padding:6px; cursor:pointer; font-size:11px;">상세보기</button>
                    `;

                    const btn = content.querySelector('button');
                    btn?.addEventListener('click', (e) => {
                        e.stopPropagation();
                        onDetailClick(id);
                    });

                    const overlay = new window.kakao.maps.CustomOverlay({
                        content: content,
                        position: position,
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
            });
        };

        if (!window.kakao || !window.kakao.maps) {
            const script = document.createElement('script');
            script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=ab5c798e9276eae445ee5cf4e4ea329c&autoload=false`;
            script.async = true;
            script.onload = initMap;
            document.head.appendChild(script);
        } else {
            initMap();
        }
    }, [data, onDetailClick]);

    return <div ref={mapContainer} style={{ width: '100%', height: '100%', minHeight: '500px' }} />;
}