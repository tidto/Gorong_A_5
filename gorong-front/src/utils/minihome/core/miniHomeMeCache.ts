import { getMyMiniHomePage } from "../../../api/minihome/miniHomeApi";

let cachedUserId: number | null | undefined;
let inflight: Promise<number | null> | null = null;

/** GET /minihomes/me/page — userId만 캐시 (CatTower·프리뷰 중복 호출 방지) */
export function fetchCachedMyUserId(): Promise<number | null> {
  if (cachedUserId !== undefined) return Promise.resolve(cachedUserId);
  if (!inflight) {
    inflight = getMyMiniHomePage()
      .then((page) => {
        cachedUserId = page.miniHome.userId;
        return cachedUserId;
      })
      .catch(() => {
        cachedUserId = null;
        return null;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function peekCachedMyUserId(): number | null | undefined {
  return cachedUserId;
}

export function seedCachedMyUserId(userId: number): void {
  cachedUserId = userId;
}

export function invalidateMiniHomeMeCache(): void {
  cachedUserId = undefined;
}
