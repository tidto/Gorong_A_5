import axios from 'axios';
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/firebaseConfig';
import { navigateTo } from '../utils/navigationHelper'
import { API_BASE_URL } from '../config/env';

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
});

// ── 토큰 캐시 (매 요청마다 Firebase 네트워크 왕복 방지) ──────────
// Firebase ID 토큰 유효기간은 1시간. 만료 5분 전부터 갱신하여
// getIdToken(true) 강제 갱신으로 인한 왕복 지연을 제거합니다.
let _cachedToken: string | null = null
let _tokenExpiresAt = 0 // Unix ms

async function getFreshToken(): Promise<string | null> {
    const user = auth.currentUser
    if (!user) return null

    const now = Date.now()
    // 캐시된 토큰이 아직 유효하면 (만료 5분 전까지) 재사용
    if (_cachedToken && now < _tokenExpiresAt - 5 * 60 * 1000) {
        return _cachedToken
    }

    // 만료 임박 또는 없을 때만 네트워크 갱신 (false = 캐시 우선, 만료 시 자동 갱신)
    const token = await user.getIdToken(false)
    _cachedToken = token
    // Firebase 토큰은 1시간 유효 — 로컬에서 만료 시각 추정
    _tokenExpiresAt = now + 60 * 60 * 1000
    return token
}

// request 인터셉터 (토큰 추가) - 현재 유저 정보를 가져옵니다.
axiosInstance.interceptors.request.use(
    async (config) => {
        const token = await getFreshToken()
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// response 인터셉터 (에러 처리) ← 완전히 분리
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error.response?.status
        const isBanBlocked = status === 403 && error.response?.data?.message === '계정 이용이 제한되었습니다.'

        const url = String(error.config?.url ?? '')
        const isMiniHomeApi = url.includes('/minihomes')

        if (status === 401) {
            // 토큰 캐시 무효화 후 로그아웃
            _cachedToken = null
            _tokenExpiresAt = 0
            await signOut(auth)
            localStorage.removeItem('gorong-db-user')
            localStorage.removeItem('gorong-firebase-uid')
            navigateTo('/login')
        } else if (status === 403 && !isBanBlocked && !isMiniHomeApi) {
            navigateTo('/error/403')
        } else if (status === 404 && !isMiniHomeApi) {
            navigateTo('/error/404')
        } else if (status === 500 && !isMiniHomeApi) {
            navigateTo('/error/500')
        }

        return Promise.reject(error)
    }
);

export default axiosInstance;
