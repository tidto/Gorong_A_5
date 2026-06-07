// ──────────────────────────────────────────────────────────────
// useGeofence.ts — 지오펜스 감지 + 도착 인증
//
// 수정 사항:
//   - verifyArrival 백엔드 실패해도 로컬 인증 처리 (사용자는 실제 진입)
//   - dwellSeconds: 지오펜스 내 체류 시간(초) 실시간 반환 → UI 카운트다운
//   - isVerified: verifiedVenues ref 기반으로 즉시 반영
//   - ENTER_DWELL_S: 자동 인증까지 대기 시간 (UI 표시용)
// ──────────────────────────────────────────────────────────────

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

// 자동 인증까지 대기 시간 (초) — MapScreen에서 카운트다운 표시에 사용
export const ENTER_DWELL_S = 7

export function useGeofence(venues: Venue[]) {
  const [insideVenueId, setInsideVenueId] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState(false)

  // 체류 시간(초): 0 ~ ENTER_DWELL_S, 지오펜스 진입 후 매초 증가
  const [dwellSeconds, setDwellSeconds] = useState(0)

  const verifiedVenues = useRef<Set<string>>(new Set())
  const currentInsideRef = useRef<string | null>(null)
  const enteredAt = useRef<number | null>(null)

  // 체류 타이머: 매 1초마다 dwellSeconds 갱신
  const dwellIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 마지막 GPS 좌표 저장 (수동 인증 시 재사용)
  const lastCoordRef = useRef<{ latitude: number; longitude: number } | null>(null)

  const stopDwellTimer = () => {
    if (dwellIntervalRef.current) {
      clearInterval(dwellIntervalRef.current)
      dwellIntervalRef.current = null
    }
  }

  const startDwellTimer = (venueId: string) => {
    stopDwellTimer()
    setDwellSeconds(0)
    dwellIntervalRef.current = setInterval(() => {
      if (!enteredAt.current) return
      const elapsed = Math.floor((Date.now() - enteredAt.current) / 1000)
      // ENTER_DWELL_S 도달하면 타이머 정지 (인증 완료 예정)
      setDwellSeconds(Math.min(elapsed, ENTER_DWELL_S))
    }, 1000)
  }

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

          // GPS 좌표 캐시 (수동 인증 시 사용)
          lastCoordRef.current = { latitude, longitude }

          // 현재 진입한 지오펜스 찾기
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

          // 진입/이탈 상태 변화 처리
          if (enteredId !== prevInside) {
            currentInsideRef.current = enteredId
            setInsideVenueId(enteredId)

            if (enteredId) {
              // 새 지오펜스 진입 → 타이머 시작
              enteredAt.current = now
              startDwellTimer(enteredId)
              // 이전 venue의 isVerified는 유지 (다른 venue이므로 false로 초기화)
              setIsVerified(verifiedVenues.current.has(enteredId))
            } else {
              // 지오펜스 이탈 → 타이머 정지
              enteredAt.current = null
              stopDwellTimer()
              setDwellSeconds(0)
              setIsVerified(false)
            }
          }

          // ── 자동 도착 인증 (ENTER_DWELL_S초 체류 후) ──────────
          if (enteredId && enteredVenue) {
            if (!enteredAt.current) enteredAt.current = now
            const dwellMs = now - enteredAt.current

            if (dwellMs >= ENTER_DWELL_S * 1000 && !verifiedVenues.current.has(enteredId)) {
              verifiedVenues.current.add(enteredId)
              setIsVerified(true)
              stopDwellTimer()
              setDwellSeconds(ENTER_DWELL_S)

              try {
                // 백엔드 PostGIS 검증 (실패해도 이미 로컬 인증 처리됨)
                await verifyArrival(enteredId, latitude, longitude)
              } catch (err) {
                // ⚠️ 백엔드 실패 = 로컬 인증으로 처리
                // 사용자가 실제로 지오펜스 내에 있으므로 인증 유효
                console.warn('[Geofence] 백엔드 도착 인증 실패 (로컬 인증 처리):', err)
              }
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
    dwellSeconds,  // 0 ~ ENTER_DWELL_S (초)
  }
}
