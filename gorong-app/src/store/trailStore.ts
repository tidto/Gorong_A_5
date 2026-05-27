import { create } from 'zustand'
import * as Location from 'expo-location'
import { saveTrail } from '../services/api'

type Coordinate = { latitude: number; longitude: number }
type StopReason = 'manual' | 'max_duration' | 'left_venue_timeout'

interface TrailStore {
  trail: Coordinate[]
  isRecording: boolean
  startedAt: number | null
  startRecording: () => Promise<void>
  stopRecording: (reason?: StopReason, venueId?: string | null) => Promise<void>
}

let subscription: Location.LocationSubscription | null = null
let maxDurationTimer: ReturnType<typeof setTimeout> | null = null
const MAX_RECORDING_MS = 60 * 60 * 1000

export const useTrailStore = create<TrailStore>((set) => ({
  trail: [],
  isRecording: false,
  startedAt: null,

  startRecording: async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()  // 권한 체크도 추가 (버그 6 해결)
    if (status !== 'granted') return

    set({ trail: [], isRecording: true, startedAt: Date.now() })
    subscription = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 5 },
      ({ coords }) => {
        set(state => ({
          trail: [...state.trail, {
            latitude: coords.latitude,
            longitude: coords.longitude,
          }],
        }))
      }
    )

    // 러닝아트는 최대 60분까지만 기록하고 자동 종료한다.
    if (maxDurationTimer) clearTimeout(maxDurationTimer)
    maxDurationTimer = setTimeout(() => {
      // setState 내부 함수에서 직접 상태를 가져오기 위해 getState를 사용한다.
      useTrailStore.getState().stopRecording('max_duration')
    }, MAX_RECORDING_MS)
  },

  stopRecording: async (reason = 'manual', venueId) => {
    subscription?.remove()
    subscription = null
    if (maxDurationTimer) {
      clearTimeout(maxDurationTimer)
      maxDurationTimer = null
    }

    const snapshot = useTrailStore.getState().trail
    set({ isRecording: false, startedAt: null })

    if (snapshot.length < 2) return

    try {
      const resolvedVenueId = venueId ?? 'UNKNOWN_VENUE'
      const payload = snapshot.map((p, index) => ({
        lat: p.latitude,
        lng: p.longitude,
        timestamp: Date.now() + index,
      }))
      await saveTrail(resolvedVenueId, payload)
      console.log(`트레일 저장 완료. reason=${reason}, points=${payload.length}`)
    } catch (error) {
      console.error('트레일 저장 실패:', error)
    }
  },
}))
