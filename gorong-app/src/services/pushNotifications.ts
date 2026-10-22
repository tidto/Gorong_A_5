import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { isRunningInExpoGo } from 'expo'

import { registerPushToken, unregisterPushToken } from './api'

const CHANNEL_ID = 'group-chat'
const REGISTERED_TOKEN_KEY = 'gorong-android-fcm-token'

export const supportsAndroidRemotePush =
  Platform.OS === 'android' && !isRunningInExpoGo()

let notificationHandlerConfigured = false

async function loadNotifications() {
  if (!supportsAndroidRemotePush) return null

  // Expo Go에서는 모듈을 불러오는 것만으로 경고가 발생할 수 있어 개발 빌드에서만 지연 로드한다.
  const Notifications = await import('expo-notifications')
  if (!notificationHandlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    })
    notificationHandlerConfigured = true
  }
  return Notifications
}

export async function subscribeToAndroidPushToken(listener: (token: string) => void) {
  const Notifications = await loadNotifications()
  if (!Notifications) return null
  return Notifications.addPushTokenListener((deviceToken) => listener(deviceToken.data))
}

export async function registerAndroidPushNotifications() {
  const Notifications = await loadNotifications()
  if (!Notifications) return null

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: '모임 채팅',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'default',
  })

  let permission = await Notifications.getPermissionsAsync()
  if (!permission.granted) permission = await Notifications.requestPermissionsAsync()
  if (!permission.granted) return null

  const deviceToken = await Notifications.getDevicePushTokenAsync()
  const token = deviceToken.data
  if (typeof token !== 'string' || !token) return null

  await registerPushToken(token, 'ANDROID')
  await AsyncStorage.setItem(REGISTERED_TOKEN_KEY, token)
  return token
}

export async function unregisterAndroidPushNotifications() {
  if (!supportsAndroidRemotePush) return

  const token = await AsyncStorage.getItem(REGISTERED_TOKEN_KEY)
  if (!token) return
  await unregisterPushToken(token)
  await AsyncStorage.removeItem(REGISTERED_TOKEN_KEY)
}

export async function syncAndroidPushToken(token: string) {
  if (!supportsAndroidRemotePush || !token) return
  await registerPushToken(token, 'ANDROID')
  await AsyncStorage.setItem(REGISTERED_TOKEN_KEY, token)
}
