import axios from 'axios';
// ⭐️ 수정: 여기서도 config 파일의 auth를 사용합니다.
import { auth } from '../firebase/firebaseConfig'; 

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
});

axiosInstance.interceptors.request.use(
  async (config) => {
    // 현재 유저 정보를 가져옵니다.
    const user = auth.currentUser;

    if (user) {
      const token = await user.getIdToken(true);
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
