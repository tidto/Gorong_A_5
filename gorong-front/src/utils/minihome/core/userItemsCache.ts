import type { UserItem } from "../../../types/minihome/item";

const TTL_MS = 45_000;

let cached: UserItem[] | null = null;
let cachedAt = 0;
let inflight: Promise<UserItem[]> | null = null;

export function invalidateUserItemsCache(): void {
  cached = null;
  cachedAt = 0;
}

/** 동일 세션 내 중복 GET /minihomes/me/items 방지 */
export async function fetchCachedMyUserItems(
  fetcher: () => Promise<UserItem[]>
): Promise<UserItem[]> {
  const now = Date.now();
  if (cached && now - cachedAt < TTL_MS) {
    return cached;
  }
  if (inflight) {
    return inflight;
  }

  inflight = fetcher()
    .then((items) => {
      cached = items;
      cachedAt = Date.now();
      return items;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
