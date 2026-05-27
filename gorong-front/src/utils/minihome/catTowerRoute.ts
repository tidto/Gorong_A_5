/** CatTower URL의 userId 파라미터 → DB userId (유효하지 않으면 null) */
export function parseViewedUserId(routeUserId?: string): number | null {
  if (!routeUserId?.trim()) return null;
  const n = Number(routeUserId.trim());
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
  return n;
}
