import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { signUpToBackend } from "./userApi"; // 우리가 만든 백엔드 가입 API

const auth = getAuth();
const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    // 1. 구글 팝업 띄우기
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // 2. 백엔드에 우리 회원인지 확인 겸 가입 요청 (Bearer 토큰은 axiosInstance가 알아서 넣어줌)
    // 여기서 닉네임이나 주파수는 초기값을 던지고, 나중에 마이페이지에서 수정하게 할 수 있습니다.
    await signUpToBackend(user, user.displayName, "기본 주파수");

    console.log("구글 로그인 및 백엔드 연동 성공!");
    return user;
  } catch (error) {
    console.error("구글 로그인 에러:", error);
    throw error;
  }
};