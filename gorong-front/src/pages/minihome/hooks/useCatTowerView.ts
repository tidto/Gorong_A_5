import { useCallback, useEffect, useMemo, useState } from "react";
import { getMiniHomePage, getMyMiniHomePage } from "../../../api/minihome/miniHomeApi";
import {
  fetchCachedMyUserId,
  peekCachedMyUserId,
  seedCachedMyUserId,
} from "../../../utils/minihome/core/miniHomeMeCache";
import type { MiniHomePage } from "../../../types/minihome/minihome";
import { enrichEquipItems } from "../../../utils/minihome/gocat/items";
import { mapMiniHomeApiError } from "../../../utils/minihome/core/minihomeApiError";
import { parseViewedUserId } from "../../../utils/minihome/cat-tower/catTowerRoute";

type Options = {
  routeUserId?: string;
  isReady: boolean;
};

/**
 * CatTower — 조회 대상 userId·isOwner·페이지 로드
 * - param 없음 → GET /minihomes/me/page
 * - param 있음 → GET /minihomes/{userId}/page
 */
export function useCatTowerView({ routeUserId, isReady }: Options) {
  const viewedUserId = useMemo(() => parseViewedUserId(routeUserId), [routeUserId]);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [myUserIdResolved, setMyUserIdResolved] = useState(() => viewedUserId == null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState<MiniHomePage | null>(null);

  const invalidViewedUserId = Boolean(routeUserId?.trim()) && viewedUserId == null;
  const ownerCheckDone = viewedUserId == null || myUserIdResolved;

  const isOwner =
    viewedUserId == null || (myUserId != null && viewedUserId === myUserId);
  const canEdit = ownerCheckDone && isOwner;
  const isReadOnly = ownerCheckDone && viewedUserId != null && !isOwner;
  const resolvingOwner = viewedUserId != null && !myUserIdResolved;

  const loadPage = useCallback(async () => {
    if (!isReady) return;

    setLoading(true);
    setErr(null);

    if (invalidViewedUserId) {
      setErr("잘못된 사용자 ID입니다.");
      setLoading(false);
      return;
    }

    try {
      if (viewedUserId != null) {
        const cachedMyId = peekCachedMyUserId();
        if (cachedMyId !== undefined) {
          setMyUserId(cachedMyId);
          setMyUserIdResolved(true);
        } else {
          try {
            const id = await fetchCachedMyUserId();
            setMyUserId(id);
          } catch {
            setMyUserId(null);
          } finally {
            setMyUserIdResolved(true);
          }
        }

        const data = await getMiniHomePage(viewedUserId);
        setPage({
          ...data,
          activeEquips: enrichEquipItems(data.activeEquips ?? []),
        });
        return;
      }

      const data = await getMyMiniHomePage();
      seedCachedMyUserId(data.miniHome.userId);
      setMyUserId(data.miniHome.userId);
      setMyUserIdResolved(true);
      setPage({
        ...data,
        activeEquips: enrichEquipItems(data.activeEquips ?? []),
      });
    } catch (e: unknown) {
      console.error("[CatTower] load failed", e);
      setErr(mapMiniHomeApiError(e));
    } finally {
      setLoading(false);
    }
  }, [isReady, viewedUserId, invalidViewedUserId]);

  useEffect(() => {
    setPage(null);
    setErr(null);
    setMyUserId(null);
    setMyUserIdResolved(viewedUserId == null);
  }, [viewedUserId]);

  return {
    viewedUserId,
    myUserId,
    page,
    loading,
    err,
    isOwner,
    canEdit,
    isReadOnly,
    resolvingOwner,
    invalidViewedUserId,
    loadPage,
    setPage,
    setErr,
  };
}
