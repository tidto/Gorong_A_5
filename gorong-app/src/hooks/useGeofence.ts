import * as Location from 'expo-location'
import { useEffect, useRef, useState } from 'react'
import { Venue } from '../types'
import { verifyArrival } from '../services/api'

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export function useGeofence(venues: Venue[]) {
  const [insideVenueId, setInsideVenueId] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState(false)  // 도착 인증 여부
  const prevInside = useRef<string | null>(null)
  const verifiedVenues = useRef<Set<string>>(new Set())  // 이미 인증한 장소

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
              await handleEnter(enteredId)
            } else if (prevInside.current) {
              handleExit(prevInside.current)
            }
            prevInside.current = enteredId
            setInsideVenueId(enteredId)
          }
        }
      )
    })()

    return () => subscription?.remove()
  }, [venues])

  const handleEnter = async (venueId: string) => {
    console.log(`진입: ${venueId}`)
    // 최초 진입 시에만 도착 인증
    if (!verifiedVenues.current.has(venueId)) {
      try {
        await verifyArrival(venueId)
        verifiedVenues.current.add(venueId)
        setIsVerified(true)
        console.log(`도착 인증 완료: ${venueId}`)
      } catch (err) {
        console.error('도착 인증 실패:', err)
      }
    }
  }

  const handleExit = (venueId: string) => {
    console.log(`이탈: ${venueId}`)
    setIsVerified(false)
  }

  return { insideVenueId, isVerified }
}