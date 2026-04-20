import axios from 'axios';
import { getAuth } from "firebase/auth";

// 모든 API 요청마다 토큰을 가져와서 헤더에 넣는 코드를 짜면 너무 중복이 심해집니다. 
// 이를 자동으로 처리해주는 Axios Instance를 만들어야 합니다.

const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
});

// ⭐️ 핵심: 요청을 보내기 직전에 가로채서(Interceptor) 토큰을 끼워 넣습니다.
axiosInstance.interceptors.request.use(
  async (config) => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      // Firebase로부터 현재 유저의 따끈따끈한 ID 토큰을 가져옵니다.
      const token = await user.getIdToken();
      // 백엔드의 FirebaseTokenFilter가 기다리고 있는 'Authorization' 헤더에 넣습니다.
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;