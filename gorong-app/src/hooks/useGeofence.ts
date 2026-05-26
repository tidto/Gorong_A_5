import * as Location from 'expo-location'
import { useEffect, useRef, useState } from 'react'
import { Venue } from '../types'
import { verifyArrival } from '../services/api'

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
  const prevInside = useRef<string | null>(null)
  const verifiedVenues = useRef<Set<string>>(new Set())

  useEffect(() => {
    let subscription: Location.LocationSubscription

    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10 },
        async (location) => {
          const { latitude, longitude } = location.coords

          let enteredId: string | null = null
          for (const venue of venues) {
            const dist = getDistance(latitude, longitude, venue.lat, venue.lng)
            if (dist <= venue.radius) { enteredId = venue.id; break }
          }

          if (enteredId !== prevInside.current) {
            if (enteredId) {
              // UI용 거리 계산은 클라이언트, 실제 인증은 백엔드 PostGIS 검증
              if (!verifiedVenues.current.has(enteredId)) {
                try {
                  await verifyArrival(enteredId, latitude, longitude)  // lat/lng 포함
                  verifiedVenues.current.add(enteredId)
                  setIsVerified(true)
                } catch (err) {
                  console.error('도착 인증 실패:', err)
                }
              }
            } else {
              setIsVerified(false)
            }
            prevInside.current = enteredId
            setInsideVenueId(enteredId)
          }
        }
      )
    })()

    return () => subscription?.remove()
  }, [venues])

  return { insideVenueId, isVerified }
}