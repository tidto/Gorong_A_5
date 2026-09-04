import { useState, useRef, useCallback } from 'react';
import * as Location from 'expo-location';

type Coordinate = {
  latitude: number;
  longitude: number;
};

export function useTrailRecording() {
  const [trail, setTrail] = useState<Coordinate[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showAsLine, setShowAsLine] = useState(true);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const startRecording = useCallback(async () => {
    setTrail([]);
    setIsRecording(true);

    subscriptionRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 5 },
      ({ coords }) => {
        setTrail(prev => [...prev, {
          latitude: coords.latitude,
          longitude: coords.longitude,
        }]);
      }
    );
  }, []);

  const stopRecording = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    setIsRecording(false);
  }, []);

  // 발자국용: 10개 좌표마다 1개만 추출
  const pawPrintCoords = trail.filter((_, i) => i % 10 === 0);

  return {
    trail,
    isRecording,
    showAsLine,
    setShowAsLine,
    pawPrintCoords,
    startRecording,
    stopRecording,
  };
}