// ──────────────────────────────────────────────────────────────
// index.js — 앱 진입점
//
// ⚠️ react-native-gesture-handler 는 반드시 파일 최상단 첫 번째 줄에
//    import 해야 합니다. (Stack Navigator, Swipe 동작 필수 의존성)
//    위치가 바뀌면 Expo Go에서 제스처가 작동하지 않습니다.
// ──────────────────────────────────────────────────────────────
import 'react-native-gesture-handler' // ← 반드시 첫 번째

import { registerRootComponent } from 'expo'
import App from './App'

// registerRootComponent: AppRegistry.registerComponent + 환경별 초기화를 한 번에 처리
registerRootComponent(App)