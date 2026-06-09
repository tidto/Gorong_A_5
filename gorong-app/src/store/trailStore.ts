import { create } from 'zustand'
import * as Location from 'expo-location'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { saveTrail } from '../services/api'

type Coordinate = { latitude: number; longitude: number }
type StopReason = 'manual' | 'max_duration' | 'left_venue_timeout'

export type TrailHistoryEntry = {
  id: string
  startedAt: number
  endedAt: number
  reason: StopReason
  venueId: string
  pointCount: number
  serverSaved: boolean
  localSaved: boolean
}

interface TrailStore {
  trail: Coordinate[]
  isRecording: boolean
  startedAt: number | null
  recordingVenueId: string | null
  startRecording: (venueId?: string | null) => Promise<void>
  stopRecording: (reason?: StopReason, venueId?: string | null) => Promise<void>
  setRecordingVenueId: (venueId: string | null) => void
}

let subscription: Location.LocationSubscription | null = null
let maxDurationTimer: ReturnType<typeof setTimeout> | null = null
const MAX_RECORDING_MS = 60 * 60 * 1000
export const TRAIL_HISTORY_KEY = 'gorong-trail-history'
const TRAIL_SESSION_PREFIX = 'gorong-trail-session-'
const TRAIL_HISTORY_LIMIT = 20

async function appendTrailHistory(entry: TrailHistoryEntry, snapshot: Coordinate[]) {
  const sessionKey = `${TRAIL_SESSION_PREFIX}${entry.id}`
  const current = await AsyncStorage.getItem(TRAIL_HISTORY_KEY)
  const history = current ? (JSON.parse(current) as TrailHistoryEntry[]) : []

  await AsyncStorage.setItem(sessionKey, JSON.stringify(snapshot))
  const nextHistory = [entry, ...history].slice(0, TRAIL_HISTORY_LIMIT)
  await AsyncStorage.setItem(TRAIL_HISTORY_KEY, JSON.stringify(nextHistory))
}

export const useTrailStore = create<TrailStore>((set) => ({
  trail: [],
  isRecording: false,
  startedAt: null,
  recordingVenueId: null,

  startRecording: async (venueId = null) => {
    const { status } = await Location.requestForegroundPermissionsAsync()  // 권한 체크도 추가 (버그 6 해결)
    if (status !== 'granted') return

    set({
      trail: [],
      isRecording: true,
      startedAt: Date.now(),
      recordingVenueId: venueId ?? null,
    })

    try {
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      set({
        trail: [{
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        }],
      })
    } catch (error) {
      console.warn('현재 위치 초기화 실패:', error)
    }

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
    const startedAt = useTrailStore.getState().startedAt ?? Date.now()
    const endedAt = Date.now()
    const resolvedVenueId = venueId ?? useTrailStore.getState().recordingVenueId ?? 'UNKNOWN_VENUE'
    set({ isRecording: false, startedAt: null, recordingVenueId: null })
    let serverSaved = false

    try {
      const payload = snapshot.map((p, index) => ({
        lat: p.latitude,
        lng: p.longitude,
        timestamp: Date.now() + index,
      }))
      await saveTrail(resolvedVenueId, payload)
      serverSaved = true
      console.log(`트레일 저장 완료. reason=${reason}, points=${payload.length}`)
    } catch (error) {
      console.error('트레일 저장 실패:', error)
    }

    try {
      await appendTrailHistory({
        id: `${endedAt}`,
        startedAt,
        endedAt,
        reason,
        venueId: resolvedVenueId,
        pointCount: snapshot.length,
        serverSaved,
        localSaved: true,
      }, snapshot)
    } catch (error) {
      console.error('트레일 히스토리 저장 실패:', error)
    }
  },

  setRecordingVenueId: (venueId) => set((state) => (
    state.isRecording ? { recordingVenueId: venueId } : state
  )),
}))
