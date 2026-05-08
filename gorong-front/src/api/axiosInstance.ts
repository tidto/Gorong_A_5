import axios from 'axios';
// ⭐️ 수정: 여기서도 config 파일의 auth를 사용합니다.
import { auth } from '../firebase/firebaseConfig'; 
import { navigateTo } from '../utils/navigationHelper'

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
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
    const status = error.response?.status

    if (status === 400) navigateTo('/error/400')
    else if (status === 403) navigateTo('/error/403')
    else if (status === 404) navigateTo('/error/404')
    else if (status === 500) navigateTo('/error/500')

    return Promise.reject(error)
  }
  
);

export default axiosInstance;
