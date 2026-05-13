import React, { useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import WebView from 'react-native-webview'

interface Venue {
  id: string
  name: string
  lat: number
  lng: number
  radius: number
}

interface Props {
  lat: number
  lng: number
  venues: Venue[]
  onVenueSelect?: (venueId: string) => void
}

export default function KakaoMap({ lat, lng, venues, onVenueSelect }: Props) {
  const webViewRef = useRef<WebView>(null)
  const KAKAO_KEY = process.env.EXPO_PUBLIC_KAKAO_MAP_KEY

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script type="text/javascript"
    src="//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&libraries=services">
  </script>
  <style>
    body { margin: 0; padding: 0; }
    #map { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = new kakao.maps.Map(document.getElementById('map'), {
      center: new kakao.maps.LatLng(${lat}, ${lng}),
      level: 5
    });

    // 현재 위치 마커
    var userMarker = new kakao.maps.Marker({
      position: new kakao.maps.LatLng(${lat}, ${lng}),
      map: map
    });

    // 행사장 마커 + 지오펜스 원
    var venues = ${JSON.stringify(venues)};
    venues.forEach(function(venue) {
      var pos = new kakao.maps.LatLng(venue.lat, venue.lng);

      var marker = new kakao.maps.Marker({ position: pos, map: map });
      var infowindow = new kakao.maps.InfoWindow({
        content: '<div style="padding:5px;font-size:12px;">' + venue.name + '</div>'
      });

      // 지오펜스 원
      new kakao.maps.Circle({
        map: map,
        center: pos,
        radius: venue.radius,
        strokeWeight: 2,
        strokeColor: '#0055FF',
        strokeOpacity: 0.6,
        fillColor: '#0055FF',
        fillOpacity: 0.1
      });

      kakao.maps.event.addListener(marker, 'click', function() {
        infowindow.open(map, marker);
        // React Native로 이벤트 전달
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'VENUE_CLICK',
          venueId: venue.id
        }));
      });
    });
  </script>
</body>
</html>
  `

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data)
      if (data.type === 'VENUE_CLICK') {
        onVenueSelect?.(data.venueId)
      }
    } catch {}
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={styles.map}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
})