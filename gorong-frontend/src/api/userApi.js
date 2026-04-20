import axiosInstance from "./axiosInstance";

export const signUpToBackend = async (firebaseUser,  nickname, gorongHz) => {
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