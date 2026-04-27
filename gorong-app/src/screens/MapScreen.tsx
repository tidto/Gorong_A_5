import MapView, { Marker, Circle } from 'react-native-maps';
import { useGeofence } from '../hooks/useGeofence';
import React from 'react';

const VENUES = [
  { id: 'venue_001', name: '대구 아트 페스티벌', lat: 35.8714, lng: 128.6014, radius: 150 },
  // TourAPI에서 불러온 행사 데이터로 채움
];

export default function MapScreen() {
  const { insideVenueId } = useGeofence(VENUES);

  return (
    <MapView style={{ flex: 1 }} showsUserLocation followsUserLocation>
      {VENUES.map(venue => (
        <React.Fragment key={venue.id}>
          {/* 행사장 마커 */}
          <Marker coordinate={{ latitude: venue.lat, longitude: venue.lng }}
                  title={venue.name}
                  pinColor={insideVenueId === venue.id ? 'green' : 'red'} />
          {/* 지오펜스 범위 원 */}
          <Circle center={{ latitude: venue.lat, longitude: venue.lng }}
                  radius={venue.radius}
                  strokeColor="rgba(0,122,255,0.5)"
                  fillColor="rgba(0,122,255,0.1)" />
        </React.Fragment>
      ))}
    </MapView>
  );
}