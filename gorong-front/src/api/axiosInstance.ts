import axios from 'axios';
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/firebaseConfig'; 
import { navigateTo } from '../utils/navigationHelper'
import { API_BASE_URL } from '../config/env';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

// request 인터셉터 (토큰 추가) - 현재 유저 정보를 가져옵니다.
axiosInstance.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken(true);
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
    const isGuestbookApi = url.includes('/guestbook')
    const isCattowerApi = url.includes('/cattower')

    if (status === 401) {
      await signOut(auth)
      localStorage.removeItem('gorong-db-user')
      localStorage.removeItem('gorong-firebase-uid')
      navigateTo('/login')
    } else if (status === 403 && !isBanBlocked && !isMiniHomeApi && !isGuestbookApi && !isCattowerApi) {
      navigateTo('/error/403')
    } else if (status === 404 && !isMiniHomeApi && !isGuestbookApi && !isCattowerApi) {
      navigateTo('/error/404')
    } else if (status === 500 && !isMiniHomeApi && !isGuestbookApi && !isCattowerApi) {
      navigateTo('/error/500')
    }

    return Promise.reject(error)
  }
);

export default axiosInstance;
