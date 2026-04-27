import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

// 두 좌표 사이의 거리 계산 (미터 단위)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // 지구 반지름 (미터)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export function useGeofence(venues: { id: string; lat: number; lng: number; radius: number }[]) {
  const [insideVenueId, setInsideVenueId] = useState<string | null>(null);
  const prevInside = useRef<string | null>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10 },
        (location) => {
          const { latitude, longitude } = location.coords;

          let enteredId: string | null = null;
          for (const venue of venues) {
            const dist = getDistance(latitude, longitude, venue.lat, venue.lng);
            if (dist <= venue.radius) { enteredId = venue.id; break; }
          }

          if (enteredId !== prevInside.current) {
            if (enteredId) onEnter(enteredId);         // 진입 이벤트
            else if (prevInside.current) onExit(prevInside.current); // 이탈 이벤트
            prevInside.current = enteredId;
            setInsideVenueId(enteredId);
          }
        }
      );
    })();

    return () => subscription?.remove();
  }, [venues]);

  return { insideVenueId };
}

function onEnter(venueId: string) {
  console.log(`진입: ${venueId}`);
  // 여기서 도착 인증 API 호출 + 채팅방 자동 입장
}
function onExit(venueId: string) {
  console.log(`이탈: ${venueId}`);
  // 여기서 채팅방 퇴장 처리
}