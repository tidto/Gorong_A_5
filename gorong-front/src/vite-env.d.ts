/// <reference types="vite/client" />

interface ImportMetaEnv {
  // 여기에 프로젝트에서 사용하는 VITE_ 환경 변수들의 타입을 명시해 줍니다.
  readonly VITE_API_BASE_URL: string;
  // readonly VITE_FIREBASE_API_KEY: string; (나중에 추가할 변수들)
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}