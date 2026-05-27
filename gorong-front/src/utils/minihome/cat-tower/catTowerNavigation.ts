/** 다른 유저 CatTower 경로 (userId 없으면 null) */
export function catTowerUserPath(userId?: number | null): string | null {
  if (userId == null || !Number.isFinite(userId) || userId <= 0) return null;
  return `/cattower/${Math.trunc(userId)}`;
}
