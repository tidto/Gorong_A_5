import axios from 'axios';
// ⭐️ 수정: 여기서도 config 파일의 auth를 사용합니다.
import { auth } from '../firebase/firebaseConfig'; 

// In local dev we always target the local backend to avoid accidentally calling a remote URL from `.env`.
const localApiBase = 'http://127.0.0.1:8080/api';
const baseURL = import.meta.env.DEV ? localApiBase : (import.meta.env.VITE_API_BASE_URL || localApiBase);

const axiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

axiosInstance.interceptors.request.use(
  async (config) => {
    const url = config.url ?? '';
    const isChatbotRequest = url.startsWith('/chatbot/') || url.includes('/chatbot/');

    // 현재 유저 정보를 가져옵니다.
    const user = auth.currentUser;

    if (user && !isChatbotRequest) {
      const token = await user.getIdToken(true);
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
