import { create } from 'zustand'
import * as Location from 'expo-location'

type Coordinate = { latitude: number; longitude: number }

interface TrailStore {
  trail: Coordinate[]
  isRecording: boolean
  startRecording: () => Promise<void>
  stopRecording: () => void
}

let subscription: Location.LocationSubscription | null = null

export const useTrailStore = create<TrailStore>((set) => ({
  trail: [],
  isRecording: false,

  startRecording: async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()  // 권한 체크도 추가 (버그 6 해결)
    if (status !== 'granted') return

    set({ trail: [], isRecording: true })
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
  },

  stopRecording: () => {
    subscription?.remove()
    subscription = null
    set({ isRecording: false })
  },
}))