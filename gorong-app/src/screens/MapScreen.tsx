import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import * as Location from 'expo-location'
import MapView, { Circle, Marker, Polyline } from 'react-native-maps'
import { useGeofence } from '../hooks/useGeofence'
import { fetchNearbyVenues, fetchPublicEvents, uploadFileToS3 } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { useTrailStore } from '../store/trailStore'
import { PublicEvent, Venue } from '../types'

function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatEventPeriod(start?: string, end?: string) {
  if (start && end) return `${start} ~ ${end}`
  if (start) return `${start} 시작`
  if (end) return `${end} 종료`
  return '기간 미정'
}

function mapPublicEventToVenue(item: PublicEvent): Venue {
  return {
    id: String(item.contentid),
    name: item.title,
    lat: Number(item.mapy),
    lng: Number(item.mapx),
    radius: 0,
    geofenceEnabled: false,
    address: item.addr1,
    category: item.cat1 ?? 'EVENT',
    imageUrl: item.firstimage,
    eventStartDate: item.eventStartDate,
    eventEndDate: item.eventEndDate,
    overview: item.overview,
  }
}

function mapNearbyVenueToVenue(item: Venue): Venue {
  return {
    ...item,
    geofenceEnabled: true,
  }
}

export default function MapScreen() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [showPawPrint, setShowPawPrint] = useState(false)
  const [outsideTimer, setOutsideTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const mapRef = useRef<MapView | null>(null)
  const { setInsideVenueId } = useAuthStore()
  const geofenceVenues = useMemo(
    () => venues.filter((venue) => venue.geofenceEnabled !== false && venue.radius > 0),
    [venues],
  )
  const { insideVenueId, isVerified } = useGeofence(geofenceVenues)
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
        const [publicResponse, nearbyResponse] = await Promise.all([
          fetchPublicEvents(),
          fetchNearbyVenues(latitude, longitude),
        ])

        const publicVenues = publicResponse.data
          .map(mapPublicEventToVenue)
          .filter((event) => Number.isFinite(event.lat) && Number.isFinite(event.lng))

        const nearbyVenues = nearbyResponse.data
          .map(mapNearbyVenueToVenue)
          .filter((event) => Number.isFinite(event.lat) && Number.isFinite(event.lng))

        const nearbyById = new Map(nearbyVenues.map((venue) => [venue.id, venue]))
        const mergedVenues = publicVenues.map((venue) => {
          const nearbyVenue = nearbyById.get(venue.id)
          if (!nearbyVenue) return venue
          return {
            ...venue,
            ...nearbyVenue,
            radius: nearbyVenue.radius,
            geofenceEnabled: true,
          }
        })

        nearbyVenues.forEach((venue) => {
          if (!mergedVenues.some((item) => item.id === venue.id)) {
            mergedVenues.push(venue)
          }
        })

        setVenues(mergedVenues)
        setSelectedVenueId((current) => current ?? mergedVenues[0]?.id ?? null)
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

  const visibleVenues = useMemo(() => {
    if (!userLocation) return venues.slice(0, 5)
    return [...venues]
      .map((venue) => ({
        ...venue,
        distance: distanceMeters(userLocation.lat, userLocation.lng, venue.lat, venue.lng),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8)
  }, [venues, userLocation])

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
              onPress={() => setSelectedVenueId(venue.id)}
            />
            {venue.geofenceEnabled !== false && venue.radius > 0 && (
              <Circle
                center={{ latitude: venue.lat, longitude: venue.lng }}
                radius={venue.radius}
                strokeWidth={insideVenueId === venue.id ? 4 : 2}
                strokeColor={insideVenueId === venue.id
                  ? 'rgba(255, 107, 53, 0.95)'
                  : 'rgba(59, 130, 246, 0.75)'}
                fillColor={insideVenueId === venue.id
                  ? 'rgba(255, 107, 53, 0.30)'
                  : 'rgba(59, 130, 246, 0.16)'}
              />
            )}
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

      <View style={styles.eventSheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>주변 행사</Text>
          <Text style={styles.sheetSub}>
            {selectedVenueId
              ? '선택된 행사와 지오펜싱 반경을 확인하세요'
              : '행사 마커를 눌러 상세를 확인하세요'}
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardRow}>
          {visibleVenues.map((venue) => {
            const isSelected = selectedVenueId === venue.id
            const isInside = insideVenueId === venue.id
            return (
              <TouchableOpacity
                key={venue.id}
                style={[
                  styles.eventCard,
                  isSelected && styles.eventCardSelected,
                  isInside && styles.eventCardInside,
                ]}
                onPress={() => setSelectedVenueId(venue.id)}
                activeOpacity={0.85}
              >
                <Text style={styles.eventCardTitle} numberOfLines={1}>
                  {venue.name}
                </Text>
                <Text style={styles.eventCardPeriod} numberOfLines={1}>
                  {formatEventPeriod(venue.eventStartDate, venue.eventEndDate)}
                </Text>
                <Text style={styles.eventCardAddress} numberOfLines={2}>
                  {venue.address}
                </Text>
                <View style={styles.eventCardFooter}>
                  <Text style={styles.eventCardRadius}>
                    {venue.geofenceEnabled === false || venue.radius <= 0
                      ? '지오펜싱 없음'
                      : `반경 ${venue.radius}m`}
                  </Text>
                  {isInside && <Text style={styles.eventCardBadge}>진입 중</Text>}
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

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
    bottom: 154,
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
    top: 76,
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
  eventSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 12,
    paddingBottom: 18,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  sheetHeader: {
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  sheetSub: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  cardRow: {
    gap: 10,
    paddingBottom: 4,
  },
  eventCard: {
    width: 180,
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  eventCardSelected: {
    borderColor: '#FF6B35',
    backgroundColor: '#fff7f2',
  },
  eventCardInside: {
    borderColor: '#FF6B35',
    backgroundColor: 'rgba(255,107,53,0.12)',
  },
  eventCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  eventCardPeriod: {
    marginTop: 4,
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '700',
  },
  eventCardAddress: {
    marginTop: 8,
    fontSize: 12,
    color: '#4b5563',
    lineHeight: 16,
  },
  eventCardFooter: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventCardRadius: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
  },
  eventCardBadge: {
    fontSize: 11,
    color: '#FF6B35',
    fontWeight: '800',
  },
})
