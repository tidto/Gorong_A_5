import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import MapView, { Marker, Circle, Polyline } from 'react-native-maps'
import * as Location from 'expo-location'
import { useGeofence } from '../hooks/useGeofence'
import { useTrailRecording } from '../hooks/useTrailRecording'
import { fetchNearbyVenues } from '../services/api'  // tourApi → api
import { Venue } from '../types'
import { useChat } from '../hooks/useChat'  // 지오펜스 진입 시 채팅 연결 위해 추가

export default function MapScreen() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [showPawPrint, setShowPawPrint] = useState(false)  // 발자국/선 토글

  const { insideVenueId, isVerified } = useGeofence(venues)
  const { isRecording, trail, startRecording, stopRecording } = useTrailRecording()

  // useChat에 insideVenueId 전달
  const { messages, sendMessage, isConnected } = useChat(insideVenueId)

  // 현재 위치 가져오기
 // 수정 후
useEffect(() => {
  ;(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('위치 권한 필요', '지도 기능을 사용하려면 위치 권한이 필요합니다.')
      return
    }

    const loc = await Location.getCurrentPositionAsync({})
    const { latitude, longitude } = loc.coords
    setUserLocation({ lat: latitude, lng: longitude })

    try {
      const response = await fetchNearbyVenues(latitude, longitude)
      setVenues(response.data)   // ← .data 추가
    } catch (err) {
      console.error('주변 행사 조회 실패:', err)
      Alert.alert('오류', '주변 행사 정보를 불러오지 못했습니다.')
    }
  })()
}, [])

  // 도착 인증 알림
  useEffect(() => {
    if (isVerified && insideVenueId) {
      const venue = venues.find(v => v.id === insideVenueId)
      Alert.alert('🎉 도착 인증', `${venue?.name}에 도착했습니다!`)
    }
  }, [isVerified, insideVenueId])

  if (!userLocation) return (
    <View style={styles.center}>
      <Text>위치 정보를 불러오는 중...</Text>
    </View>
  )

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        showsUserLocation
        initialRegion={{
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {/* 행사 마커 + 지오펜스 원 */}
        {venues.map(venue => (
          <React.Fragment key={venue.id}>
            <Marker
              coordinate={{ latitude: venue.lat, longitude: venue.lng }}
              title={venue.name}
              description={venue.address}
              pinColor={insideVenueId === venue.id ? 'green' : 'red'}
            />
            <Circle
              center={{ latitude: venue.lat, longitude: venue.lng }}
              radius={venue.radius}
              strokeColor={insideVenueId === venue.id
                ? 'rgba(0,200,0,0.8)'
                : 'rgba(0,122,255,0.5)'}
              fillColor={insideVenueId === venue.id
                ? 'rgba(0,200,0,0.1)'
                : 'rgba(0,122,255,0.1)'}
            />
          </React.Fragment>
        ))}

        {/* GPS 동선 — 선 또는 발자국 */}
        {isRecording && trail.length > 1 && !showPawPrint && (
          <Polyline
            coordinates={trail}  // useTrailRecording이 {latitude, longitude} 반환
            strokeColor="#FF6B35"
            strokeWidth={3}
          />
        )}
        {isRecording && showPawPrint && trail.map((point, i) => (
          i % 5 === 0 && (
            <Marker
              key={i}
              coordinate={{ latitude: point.latitude, longitude: point.longitude }}
            >
              <Text style={{ fontSize: 16 }}>🐾</Text>
            </Marker>
          )
        ))}
      </MapView>

      {/* 하단 버튼 */}
      <View style={styles.buttonRow}>
        {/* 아트러닝 기록 */}
        <TouchableOpacity
          style={[styles.btn, isRecording && styles.btnActive]}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <Text style={styles.btnText}>
            {isRecording ? '⏹ 동선 종료' : '▶ 동선 기록'}
          </Text>
        </TouchableOpacity>

        {/* 발자국/선 토글 */}
        {isRecording && (
          <TouchableOpacity
            style={styles.btn}
            onPress={() => setShowPawPrint(p => !p)}
          >
            <Text style={styles.btnText}>
              {showPawPrint ? '━ 선으로 보기' : '🐾 발자국 보기'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 지오펜스 진입 표시 */}
      {insideVenueId && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {isVerified ? '✅ 도착 인증 완료' : '📍 행사장 진입 중'}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  buttonRow: {
    position: 'absolute', bottom: 40, left: 16, right: 16,
    flexDirection: 'row', gap: 8,
  },
  btn: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12,
    padding: 12, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  btnActive: { backgroundColor: '#FF6B35' },
  btnText: { fontWeight: '600', color: '#333' },
  badge: {
    position: 'absolute', top: 60, alignSelf: 'center',
    backgroundColor: '#fff', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  badgeText: { fontWeight: '700', fontSize: 14 },
})