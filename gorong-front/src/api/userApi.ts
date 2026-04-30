import axios from 'axios';
import axiosInstance from "./axiosInstance";
import { User } from "firebase/auth";

// ⭐️ 수정: 하드코딩 제거. 전역 환경변수 사용
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';


// src/api/userApi.ts

export interface SignUpPayload {
  email: string | null;
  nickname: string;
  birthYear: string;
  address: string;
  isForeigner: boolean;
  requiresBarrierFree: boolean;
  disabilityType: string;
  interestCodes: string[]; // 명시적 카테고리 (TourAPI 연동)
  gorongHz: string;        // ⭐️ 온보딩을 통해 분석된 유저 고유 성향/패턴 타입
}

// ⭐️ 파라미터를 하나의 payload 객체로 묶어서 받습니다.
export const signUpToBackend = async (payload: SignUpPayload) => {
  try {
    // axiosInstance가 알아서 Bearer 토큰을 헤더에 넣어주므로 바로 post 하면 됩니다.
    // URL도 백엔드 설계에 맞춰 버전(v1)을 포함하는 것을 권장합니다.
    const response = await axiosInstance.post('/v1/users/signup', payload);
    return response.data;
  } catch (error) {
    console.error("회원가입 API 통신 에러:", error);
    throw error;
  }
};

// 백엔드에 유저 가입 여부 확인
export const checkUserStatus = async (idToken: string) => {
  try {
    // 💡 아키텍트 포인트: 
    // 로그인 직후에는 auth.currentUser가 갱신되기 전 찰나의 타이밍 이슈가 생길 수 있습니다.
    // 따라서 이 API만큼은 axiosInstance(인터셉터)를 쓰지 않고, 
    // 방금 발급받은 idToken을 생짜 axios에 직접 꽂아 보내는 것이 훨씬 안전합니다. (기존 로직 유지)
    const response = await axios.post(`${API_BASE_URL}/v1/users/login`, {}, {
      headers: {
        Authorization: `Bearer ${idToken}`
      }
    });
    return response.data; 
  } catch (error) {
    console.error("유저 상태 확인 에러:", error);
    throw error;
  }

  
};