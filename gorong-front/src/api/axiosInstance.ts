import axios from 'axios';
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/firebaseConfig';
import { navigateTo } from '../utils/navigationHelper'
import { API_BASE_URL } from '../config/env';

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
});

// ── 토큰 캐시 (매 요청마다 Firebase 네트워크 왕복 방지) ──────────
let _cachedToken: string | null = null
let _tokenExpiresAt = 0 // Unix ms

/**
 * auth.currentUser가 아직 null일 수 있으므로 (Firebase 초기화 지연)
 * onAuthStateChanged로 최대 5초 기다린 뒤 유저를 반환한다.
 */
function waitForCurrentUser(): Promise<import('firebase/auth').User | null> {
    return new Promise((resolve) => {
        // 이미 준비돼 있으면 즉시 반환
        if (auth.currentUser !== null) {
            resolve(auth.currentUser);
            return;
        }
        // 최대 5초 대기
        const timer = setTimeout(() => {
            unsub();
            resolve(null);
        }, 5000);
        const unsub = auth.onAuthStateChanged((user) => {
            if (user !== null) {
                clearTimeout(timer);
                unsub();
                resolve(user);
            }
        });
    });
}

async function getFreshToken(): Promise<string | null> {
    // 페이지 초기 로드 직후에도 auth가 준비될 때까지 기다린다.
    const user = await waitForCurrentUser();
    if (!user) return null;

    const now = Date.now();
    // 캐시된 토큰이 아직 유효하면 (만료 5분 전까지) 재사용
    if (_cachedToken && now < _tokenExpiresAt - 5 * 60 * 1000) {
        return _cachedToken;
    }

    // 만료 임박 또는 없을 때만 네트워크 갱신
    const token = await user.getIdToken(false);
    _cachedToken = token;
    _tokenExpiresAt = now + 60 * 60 * 1000;
    return token;
}

// request 인터셉터 (토큰 추가)
axiosInstance.interceptors.request.use(
    async (config) => {
        const token = await getFreshToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// response 인터셉터 (에러 처리)
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error.response?.status;
        const isBanBlocked = status === 403 && error.response?.data?.message === '계정 이용이 제한되었습니다.';

        const url = String(error.config?.url ?? '');
        const isMiniHomeApi  = url.includes('/minihomes');
        const isGuestbookApi = url.includes('/guestbook');
        const isCattowerApi  = url.includes('/cattower');

        if (status === 401) {
            _cachedToken = null;
            _tokenExpiresAt = 0;
            await signOut(auth);
            localStorage.removeItem('gorong-db-user');
            localStorage.removeItem('gorong-firebase-uid');
            navigateTo('/login');
        } else if (status === 403 && !isBanBlocked && !isMiniHomeApi && !isGuestbookApi && !isCattowerApi) {
            navigateTo('/error/403');
        } else if (status === 404 && !isMiniHomeApi && !isGuestbookApi && !isCattowerApi) {
            navigateTo('/error/404');
        } else if (status === 500 && !isMiniHomeApi && !isGuestbookApi && !isCattowerApi) {
            navigateTo('/error/500');
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;