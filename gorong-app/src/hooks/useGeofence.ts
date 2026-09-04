// ──────────────────────────────────────────────────────────────
// useGeofence.ts — 지오펜스 감지 + 도착 인증
//
// [핵심 버그 수정]
//   기존: verifyArrival 호출이 watchPositionAsync 콜백 안에 있음
//         → distanceInterval: 10m 조건으로 사용자가 정지 시 콜백 미발생
//         → 8초 카운트다운은 되지만 인증이 절대 안 됨
//   수정: setInterval 콜백 안에서 8초 도달 시 인증 트리거
//         → 이동 여부와 무관하게 체류 시간만으로 인증
// ──────────────────────────────────────────────────────────────

import * as Location from 'expo-location'
import { useEffect, useRef, useState } from 'react'
import { verifyArrival } from '../services/api'
import { Venue } from '../types'

// 두 좌표 간 거리 계산 (Haversine, 단위: 미터)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// 자동 인증까지 대기 시간 (초) — MapScreen에서 카운트다운 표시에 사용
export const ENTER_DWELL_S = 8

export function useGeofence(venues: Venue[]) {
  const [insideVenueId, setInsideVenueId] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState(false)
  // 0 ~ ENTER_DWELL_S: 매초 증가, MapScreen 진행바에 사용
  const [dwellSeconds, setDwellSeconds] = useState(0)

  // 이미 인증된 venue ID 집합 (중복 인증 방지)
  const verifiedVenues = useRef<Set<string>>(new Set())
  // 현재 진입 중인 venue ID (ref로 setInterval 클로저에서 최신값 참조)
  const currentInsideRef = useRef<string | null>(null)
  // 진입 시각 (체류 시간 계산용)
  const enteredAt = useRef<number | null>(null)
  // 마지막 GPS 좌표 (인증 API 호출 시 사용)
  const lastCoordRef = useRef<{ latitude: number; longitude: number } | null>(null)
  // 체류 타이머 ref
  const dwellIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopDwellTimer = () => {
    if (dwellIntervalRef.current) {
      clearInterval(dwellIntervalRef.current)
      dwellIntervalRef.current = null
    }
  }

useEffect(() => {
    let subscription: Location.LocationSubscription | undefined

    // startDwellTimer를 useEffect 안으로 이동 — venues 클로저 stale 방지
    const startDwellTimer = (venueId: string) => {
      stopDwellTimer()
      setDwellSeconds(0)
      enteredAt.current = Date.now()

      dwellIntervalRef.current = setInterval(async () => {
        if (!enteredAt.current || !currentInsideRef.current) return
        if (currentInsideRef.current !== venueId) {
          stopDwellTimer()
          return
        }

        const elapsed = Math.floor((Date.now() - enteredAt.current) / 1000)
        setDwellSeconds(Math.min(elapsed, ENTER_DWELL_S))

        if (elapsed >= ENTER_DWELL_S && !verifiedVenues.current.has(venueId)) {
          stopDwellTimer()
          verifiedVenues.current.add(venueId)
          setIsVerified(true)
          setDwellSeconds(ENTER_DWELL_S)

          if (lastCoordRef.current) {
            const { latitude, longitude } = lastCoordRef.current
            console.log(`[Geofence] verifyArrival 호출 좌표 - lat=${latitude}, lng=${longitude}`)
            let success = false
            for (let attempt = 1; attempt <= 3; attempt++) {
              try {
                await verifyArrival(venueId, latitude, longitude)
                success = true
                console.log(`[Geofence] 백엔드 도착 인증 성공 - venueId=${venueId}, attempt=${attempt}`)
                break
              } catch (err: any) {
                const status = err?.response?.status
                console.warn(`[Geofence] 백엔드 도착 인증 실패 attempt=${attempt} - venueId=${venueId}, status=${status}`)
                if (status === 400 || status === 403) break
                if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 2000))
              }
            }
            if (!success) {
              console.error(`[Geofence] 백엔드 도착 인증 최종 실패 - venueId=${venueId}`)
            }
                    } else {
            console.warn(`[Geofence] lastCoordRef.current 없음 - verifyArrival 호출 불가`)
          }
        }
      }, 1000)
    }


    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 0,
        },
        (location) => {
          const { latitude, longitude } = location.coords
          lastCoordRef.current = { latitude, longitude }

          let enteredId: string | null = null
          for (const venue of venues) {
            if (venue.geofenceEnabled === false || venue.radius <= 0) continue
            const dist = getDistance(latitude, longitude, venue.lat, venue.lng)
            if (dist <= venue.radius) {
              enteredId = venue.id
              break
            }
          }

          const prevInside = currentInsideRef.current

          if (enteredId !== prevInside) {
            currentInsideRef.current = enteredId
            setInsideVenueId(enteredId)

            if (enteredId) {
              const alreadyVerified = verifiedVenues.current.has(enteredId)
              setIsVerified(alreadyVerified)
              if (!alreadyVerified) {
                startDwellTimer(enteredId)
              } else {
                setDwellSeconds(ENTER_DWELL_S)
              }
            } else {
              stopDwellTimer()
              setDwellSeconds(0)
              setIsVerified(false)
            }
          }
        }
      )
    })()

    return () => {
      subscription?.remove()
      stopDwellTimer()
    }
  }, [venues])

  return {
    insideVenueId,
    isVerified,
    dwellSeconds,
  }
}