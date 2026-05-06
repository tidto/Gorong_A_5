import {
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  User
} from "firebase/auth";
import { auth } from '../firebase/firebaseConfig';

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

export const loginWithGoogle = async (): Promise<User> => {
  try {
    if (!auth) {
      throw new Error('Firebase auth is not configured');
    }
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("구글 로그인 에러:", error);
    throw error;
  }
};

export const loginWithGithub = async (): Promise<User> => {
  try {
    if (!auth) {
      throw new Error('Firebase auth is not configured');
    }
    const result = await signInWithPopup(auth, githubProvider);
    return result.user;
  } catch (error: any) {
    console.error("깃허브 로그인 에러:", error);
    throw error;
  }
};