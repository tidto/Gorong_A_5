import axios from 'axios';
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/firebaseConfig'; 
import { navigateTo } from '../utils/navigationHelper'

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
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

    if (status === 401) {
      await signOut(auth)
      localStorage.removeItem('gorong-db-user')
      localStorage.removeItem('gorong-firebase-uid')
      navigateTo('/login')
    } else if (status === 403 && !isBanBlocked) navigateTo('/error/403')
    else if (status === 404) navigateTo('/error/404')
    else if (status === 500) navigateTo('/error/500')

    return Promise.reject(error)
  }
);

export default axiosInstance;
