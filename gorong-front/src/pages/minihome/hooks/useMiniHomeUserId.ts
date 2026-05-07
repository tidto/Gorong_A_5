import { useMemo } from "react";
import { useAuth } from "../../../contexts/AuthContext";

function hash32(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function resolveUserId(uidOrEmail?: string | null) {
  if (!uidOrEmail) return 1;
  const n = hash32(uidOrEmail);
  return (n % 2_000_000_000) + 1;
}

export function useMiniHomeUserId() {
  const auth = useAuth();
  const firebaseUser = auth.firebaseUser;

  const userId = useMemo(() => {
    const key = firebaseUser?.email || firebaseUser?.uid || null;
    return resolveUserId(key);
  }, [firebaseUser]);

  const displayName = auth.user?.nickname || firebaseUser?.email || "사용자";

  return { userId, displayName, firebaseUser };
}

