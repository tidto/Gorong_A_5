import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import * as Location from 'expo-location'
import MapView, { Circle, Marker, Polyline } from 'react-native-maps'
import { useGeofence } from '../hooks/useGeofence'
import { fetchNearbyVenues, uploadFileToS3 } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { useTrailStore } from '../store/trailStore'
import { Venue } from '../types'

export default function MapScreen() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [showPawPrint, setShowPawPrint] = useState(false)
  const [outsideTimer, setOutsideTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const mapRef = useRef<MapView | null>(null)
  const { setInsideVenueId } = useAuthStore()
  const { insideVenueId, isVerified } = useGeofence(venues)
  const { isRecording, trail, startRecording, stopRecording } = useTrailStore()

  useEffect(() => {
    setInsideVenueId(insideVenueId)
  }, [insideVenueId, setInsideVenueId])

  const finalizeTrailArt = useCallback(async () => {
    if (!mapRef.current || trail.length < 2) return

    try {
      // 지도+경로를 캡처해 러닝아트 이미지로 저장한다.
      const snapshotUri = await mapRef.current.takeSnapshot({
        width: 1080,
        height: 1920,
        format: 'jpg',
        quality: 0.85,
        result: 'file',
      })

      await uploadFileToS3(
        snapshotUri,
        `trail-art-${Date.now()}.jpg`,
        'TRAIL_ART',
        true,
      )
    } catch (error) {
      console.error('러닝아트 업로드 실패:', error)
    }
  }, [trail.length])

  const handleStopRecording = useCallback(async (
    reason: 'manual' | 'max_duration' | 'left_venue_timeout',
  ) => {
    await stopRecording(reason, insideVenueId)
    await finalizeTrailArt()
  }, [stopRecording, insideVenueId, finalizeTrailArt])

  useEffect(() => {
    // 인증은 유지하고, 기록만 행사장 이탈 3분 후 자동 종료한다.
    if (isRecording && !insideVenueId && !outsideTimer) {
      const timer = setTimeout(() => {
        handleStopRecording('left_venue_timeout')
      }, 3 * 60 * 1000)
      setOutsideTimer(timer)
      return
    }

    if ((insideVenueId || !isRecording) && outsideTimer) {
      clearTimeout(outsideTimer)
      setOutsideTimer(null)
    }
  }, [isRecording, insideVenueId, outsideTimer, handleStopRecording])

  useEffect(() => {
    return () => {
      if (outsideTimer) clearTimeout(outsideTimer)
    }
  }, [outsideTimer])

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
        setVenues(response.data)
      } catch (err) {
        console.error('주변 행사 조회 실패:', err)
        Alert.alert('오류', '주변 행사 정보를 불러오지 못했습니다.')
      }
    })()
  }, [])

  useEffect(() => {
    if (!isVerified || !insideVenueId) return
    const venue = venues.find(v => v.id === insideVenueId)
    Alert.alert('도착 인증', `${venue?.name ?? '행사장'}에 도착했습니다.`)
  }, [isVerified, insideVenueId, venues])

  if (!userLocation) {
    return (
      <View style={styles.center}>
        <Text>위치 정보를 불러오는 중...</Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        showsUserLocation
        initialRegion={{
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
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
              strokeColor={insideVenueId === venue.id ? 'rgba(0,200,0,0.8)' : 'rgba(0,122,255,0.5)'}
              fillColor={insideVenueId === venue.id ? 'rgba(0,200,0,0.1)' : 'rgba(0,122,255,0.1)'}
            />
          </React.Fragment>
        ))}

        {isRecording && trail.length > 1 && !showPawPrint && (
          <Polyline coordinates={trail} strokeColor="#FF6B35" strokeWidth={3} />
        )}

        {isRecording && showPawPrint && trail.map((point, i) => (
          i % 5 === 0 ? (
            <Marker
              key={i}
              coordinate={{ latitude: point.latitude, longitude: point.longitude }}
            >
              <Text style={{ fontSize: 16 }}>🐾</Text>
            </Marker>
          ) : null
        ))}
      </MapView>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.btn, isRecording && styles.btnActive]}
          onPress={isRecording ? () => handleStopRecording('manual') : startRecording}
        >
          <Text style={styles.btnText}>
            {isRecording ? '트레일 기록 종료' : '트레일 기록 시작'}
          </Text>
        </TouchableOpacity>

        {isRecording && (
          <TouchableOpacity
            style={styles.btn}
            onPress={() => setShowPawPrint(prev => !prev)}
          >
            <Text style={styles.btnText}>
              {showPawPrint ? '선으로 보기' : '발자국 보기'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {insideVenueId && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {isVerified ? '도착 인증 완료' : '행사장 진입 중'}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  buttonRow: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  btnActive: { backgroundColor: '#FF6B35' },
  btnText: { fontWeight: '600', color: '#333' },
  badge: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: { fontWeight: '700', fontSize: 14 },
})
