/**
 * API base URL — VITE_API_BASE_URL 만 사용 (코드에 호스트 하드코딩 금지)
 * - /api → Vite proxy 또는 Nginx → 백엔드
 * - http://localhost:8080/api → 로컬 백엔드 직접
 */
export function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!raw) return "/api";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export const API_BASE_URL = resolveApiBaseUrl();
