import * as Location from 'expo-location'
import { useEffect, useRef, useState } from 'react'
import { verifyArrival } from '../services/api'
import { Venue } from '../types'

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function useGeofence(venues: Venue[]) {
  const [insideVenueId, setInsideVenueId] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState(false)

  const verifiedVenues = useRef<Set<string>>(new Set())
  const currentInsideRef = useRef<string | null>(null)
  const enteredAt = useRef<number | null>(null)

  // GPS 경계값 흔들림을 줄이기 위한 규칙값
  const ENTER_DWELL_MS = 8000

  useEffect(() => {
    let subscription: Location.LocationSubscription | undefined

    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10 },
        async (location) => {
          const { latitude, longitude } = location.coords
          const now = Date.now()

          let enteredId: string | null = null
          let enteredVenue: Venue | null = null
          for (const venue of venues) {
            if (venue.geofenceEnabled === false || venue.radius <= 0) continue
            const dist = getDistance(latitude, longitude, venue.lat, venue.lng)
            if (dist <= venue.radius) {
              enteredId = venue.id
              enteredVenue = venue
              break
            }
          }

          const prevInside = currentInsideRef.current
          if (enteredId !== prevInside) {
            currentInsideRef.current = enteredId
            setInsideVenueId(enteredId)
            if (enteredId) {
              enteredAt.current = now
            }
          }

          // 반경 내부에서 N초 이상 유지되면 자동 도착 인증
          if (enteredId && enteredVenue) {
            if (!enteredAt.current) enteredAt.current = now

            const dwellMs = now - enteredAt.current
            if (dwellMs >= ENTER_DWELL_MS && !verifiedVenues.current.has(enteredId)) {
              try {
                // 최종 인증은 백엔드(PostGIS) 거리 검증으로 확정한다.
                await verifyArrival(enteredId, latitude, longitude)
                verifiedVenues.current.add(enteredId)
                setIsVerified(true)
              } catch (err) {
                console.error('도착 인증 실패:', err)
              }
            }
            return
          }
        }
      )
    })()

    return () => subscription?.remove()
  }, [venues])

  return { insideVenueId, isVerified }
}
