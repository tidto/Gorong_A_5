import { useCallback, useEffect, useMemo, useState } from "react";
import { getMiniHomePage, getMyMiniHomePage } from "../../../api/minihome/miniHomeApi";
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
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState<MiniHomePage | null>(null);

  const invalidViewedUserId = Boolean(routeUserId?.trim()) && viewedUserId == null;
  const ownerCheckDone = viewedUserId == null || myUserId != null;

  const isOwner =
    viewedUserId == null || (myUserId != null && viewedUserId === myUserId);
  /** owner 확인 전에는 편집 UI 숨김 — API 데이터만 표시 */
  const canEdit = ownerCheckDone && isOwner;
  const isReadOnly = ownerCheckDone && viewedUserId != null && !isOwner;
  const resolvingOwner = viewedUserId != null && myUserId == null;

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
        const data = await getMiniHomePage(viewedUserId);
        setPage({
          ...data,
          activeEquips: enrichEquipItems(data.activeEquips ?? []),
        });

        void getMyMiniHomePage()
          .then((mine) => setMyUserId(mine.miniHome.userId))
          .catch(() => {
            /* isOwner 판별 실패 시 read-only 유지 */
          });
        return;
      }

      const data = await getMyMiniHomePage();
      setMyUserId(data.miniHome.userId);
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
