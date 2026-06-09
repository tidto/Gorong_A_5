import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getMiniHomePage,
  getMyMiniHomePage,
  resolveMiniHomeIsPublic,
} from "../../../api/minihome/miniHomeApi";
import {
  fetchCachedMyUserId,
  peekCachedMyUserId,
  seedCachedMyUserId,
} from "../../../utils/minihome/core/miniHomeMeCache";
import type { MiniHomePage } from "../../../types/minihome/minihome";
import { enrichEquipItems } from "../../../utils/minihome/gocat/items";
import {
  isPrivateMiniHomeForbidden,
  mapMiniHomeApiError,
} from "../../../utils/minihome/core/minihomeApiError";
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
  /** 타인 CatTower — 내 userId 조회 완료 여부 (null이어도 완료로 처리) */
  const [myUserIdResolved, setMyUserIdResolved] = useState(() => viewedUserId == null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [privateBlocked, setPrivateBlocked] = useState(false);
  const [page, setPage] = useState<MiniHomePage | null>(null);

  const invalidViewedUserId = Boolean(routeUserId?.trim()) && viewedUserId == null;
  const ownerCheckDone = viewedUserId == null || myUserIdResolved;

  const isOwner =
    viewedUserId == null || (myUserId != null && viewedUserId === myUserId);
  /** owner 확인 전에는 편집 UI 숨김 — API 데이터만 표시 */
  const canEdit = ownerCheckDone && isOwner;
  const isReadOnly = ownerCheckDone && viewedUserId != null && !isOwner;
  const resolvingOwner = viewedUserId != null && !myUserIdResolved;

  const loadPage = useCallback(async () => {
    if (!isReady) return;

    setLoading(true);
    setErr(null);
    setPrivateBlocked(false);

    if (invalidViewedUserId) {
      setErr("잘못된 사용자 ID입니다.");
      setLoading(false);
      return;
    }

    try {
      if (viewedUserId != null) {
        // 비공개 차단 판별 전에 내 userId를 먼저 확인 (본인 /cattower/:id 접속)
        let resolvedMyId: number | null = null;
        const cachedMyId = peekCachedMyUserId();
        if (cachedMyId !== undefined) {
          resolvedMyId = cachedMyId;
          setMyUserId(cachedMyId);
          setMyUserIdResolved(true);
        } else {
          try {
            const id = await fetchCachedMyUserId();
            resolvedMyId = id;
            setMyUserId(id);
          } catch {
            resolvedMyId = null;
            setMyUserId(null);
          } finally {
            setMyUserIdResolved(true);
          }
        }

        const data = await getMiniHomePage(viewedUserId);
        const ownerId = data.miniHome?.userId ?? viewedUserId;
        const isPublic = resolveMiniHomeIsPublic(data.miniHome?.isPublic);
        const isGuestViewer = resolvedMyId == null || resolvedMyId !== ownerId;

        if (!isPublic && isGuestViewer) {
          setPrivateBlocked(true);
          setErr("비공개 미니홈입니다. 주인만 볼 수 있어요.");
          setPage(null);
          return;
        }

        setPage({
          ...data,
          miniHome: { ...data.miniHome, isPublic },
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
      const blocked = isPrivateMiniHomeForbidden(e);
      setPrivateBlocked(blocked);
      setErr(mapMiniHomeApiError(e, blocked ? "비공개 미니홈입니다. 주인만 볼 수 있어요." : undefined));
      if (blocked) setPage(null);
    } finally {
      setLoading(false);
    }
  }, [isReady, viewedUserId, invalidViewedUserId]);

  useEffect(() => {
    setPage(null);
    setErr(null);
    setPrivateBlocked(false);
    setMyUserId(null);
    setMyUserIdResolved(viewedUserId == null);
  }, [viewedUserId]);

  return {
    viewedUserId,
    myUserId,
    page,
    loading,
    err,
    privateBlocked,
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
