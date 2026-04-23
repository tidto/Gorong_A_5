import axiosInstance from "./axiosInstance";
import axios from 'axios';
import { User } from "firebase/auth"; // ⭐️ Firebase의 User 타입을 가져옵니다.

const BASE_URL = 'http://localhost:8080/api'; // 백엔드 주소

// ⭐️ 파라미터 옆에 : Type 형태로 명확하게 정체를 밝혀줍니다.
export const signUpToBackend = async (
  firebaseUser: User,   // 그냥 any가 아니라 Firebase 유저 객체!
  nickname: string,     // 닉네임은 문자열!
  gorongHz: string      // 주파수도 문자열!
) => {
  try {
    const signUpData = {
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email,
      nickname: nickname,
      gorongHz: gorongHz // 온보딩에서 선택한 주파수
    };

    // 우리가 만든 /api/users/signup 엔드포인트로 전송!
    const response = await axiosInstance.post('/users/signup', signUpData);
    return response.data;
  } catch (error) {
    console.error("회원가입 중 백엔드 통신 에러:", error);
    throw error;
  }
};

// 백엔드에 유저 가입 여부 확인
export const checkUserStatus = async (idToken: string) => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {}, {
      headers: {
        Authorization: `Bearer ${idToken}` // 백엔드 필터를 통과하기 위한 토큰
      }
    });
    return response.data; // { isRegistered: true/false, ... }
  } catch (error) {
    console.error("유저 상태 확인 에러:", error);
    throw error;
  }
};