import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,  // ← 추가
  GoogleAuthProvider,
  GithubAuthProvider,
} from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// 팝업 → 리다이렉트로 변경
export const loginWithGoogle = () =>
  signInWithRedirect(auth, googleProvider);

export const loginWithGithub = () =>
  signInWithRedirect(auth, githubProvider);

// 리다이렉트 후 돌아왔을 때 결과 받는 함수
export const getLoginRedirectResult = () =>
  getRedirectResult(auth);