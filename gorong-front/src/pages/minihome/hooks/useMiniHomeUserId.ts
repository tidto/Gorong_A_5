import { useAuth } from "../../../contexts/AuthContext";

/**
 * 미니홈 전용 — Firebase 로그인 여부만 확인합니다.
 * DB userId는 getMyMiniHomePage 응답의 miniHome.userId를 사용하세요.
 */
export function useMiniHomeUserId() {
  const auth = useAuth();
  const firebaseUser = auth.firebaseUser;

  const displayName =
    auth.user?.nickname || firebaseUser?.email || "사용자";

  return {
    userId: 0,
    displayName,
    firebaseUser,
    loadingUserId: auth.isLoading,
    userIdError: null as string | null,
    isReady: Boolean(firebaseUser),
  };
}
