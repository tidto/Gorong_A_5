import { 
  getAuth, 
  GoogleAuthProvider, 
  GithubAuthProvider, 
  signInWithPopup, 
  User // ⭐️ Firebase에서 제공하는 User 타입을 가져옵니다.
} from "firebase/auth";

const auth = getAuth();
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// ⭐️ 리턴 타입을 Promise<User>로 명확하게 지정해 줍니다.
export const loginWithGoogle = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) { // ⭐️ error 객체에 any 지정 (또는 unknown)
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