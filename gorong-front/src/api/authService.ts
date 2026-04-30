import { 
  GoogleAuthProvider, 
  GithubAuthProvider, 
  signInWithPopup, 
  User 
} from "firebase/auth";
// ⭐️ 수정: getAuth()를 직접 호출하지 않고, 우리가 만든 config 파일에서 가져옵니다.
import { auth } from '../firebase/firebaseConfig'; 

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

export const loginWithGoogle = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) { 
    console.error("구글 로그인 에러:", error);
    throw error;
  }
}; 

export const loginWithGithub = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, githubProvider);
    return result.user;
  } catch (error: any) {
    console.error("깃허브 로그인 에러:", error);
    throw error;
  }
};