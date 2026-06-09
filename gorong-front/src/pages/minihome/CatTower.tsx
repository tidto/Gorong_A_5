import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import CatTowerDashboard from "../../components/minihome/cat-tower/CatTowerDashboard";
import { useMiniHomeUserId } from "./hooks/useMiniHomeUserId";
import { useCatTowerView } from "./hooks/useCatTowerView";
import {
  applyEquipDraftToPage,
  equipPreviewFromDraft,
  normalizeEquipPreview,
} from "../../utils/minihome/gocat/items";
import { ownerEquipPreviewFromPage } from "../../utils/minihome/gocat/gocatEquippedStorage";
import {
  loadNormalizedEquipDraft,
  normalizeEquipDraft,
} from "../../utils/minihome/gocat/gocatEquipMigration";
import { getMyUserItems } from "../../api/minihome/itemApi";
import { filterOwnedUserItems } from "../../utils/minihome/gocat/gocatItemCatalog";
import {
  logGoCatLockAudit,
  readLocalStorageEquippedRaw,
} from "../../utils/minihome/gocat/gocatLockDebug";
import { emptyDraft } from "../../utils/minihome/gocat/items";
import type { DecorItem, SlotType } from "../../components/minihome/mini-home/DecorationModal";
import type { UserItem } from "../../types/minihome/item";
import { computeGrowthState } from "../../utils/minihome/growth/growth";
import { needsGoCatSetup } from "../../utils/minihome/gocat/goCatSetup";
import { resolveMiniHomeIsPublic, updateMyMiniHome } from "../../api/minihome/miniHomeApi";
import { useNotification } from "../../contexts/NotificationContext";
import { mapMiniHomeApiError } from "../../utils/minihome/core/minihomeApiError";
import CatTowerPrivateBlocked from "../../components/minihome/cat-tower/CatTowerPrivateBlocked";
import CatTowerDecorationLayer from "./CatTowerDecorationLayer";

export default function CatTower() {
  const { toast } = useNotification();
  const navigate = useNavigate();
  const { userId: routeUserId } = useParams<{ userId?: string }>();
  const { displayName, firebaseUser, loadingUserId, userIdError, isReady } = useMiniHomeUserId();

  const {
    myUserId,
    page,
    loading,
    err,
    privateBlocked,
    viewedUserId,
    canEdit,
    isReadOnly,
    isOwner,
    loadPage,
    setPage,
    setErr,
    resolvingOwner,
  } = useCatTowerView({ routeUserId, isReady });

  const roomOwnerId = page?.miniHome?.userId ?? null;
  const pageReady = Boolean(roomOwnerId) && !loading;

  const [decorateOpen, setDecorateOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [equippedDraft, setEquippedDraft] = useState<Record<SlotType, DecorItem | null>>(() =>
    emptyDraft()
  );
  const [ownedItems, setOwnedItems] = useState<UserItem[]>([]);

  const growth = useMemo(() => computeGrowthState(page), [page]);
  const needsSetup = useMemo(() => needsGoCatSetup(page), [page]);
  const isOwnTower = routeUserId == null || routeUserId.trim() === "";

  const cat = page?.miniHome?.cat ?? null;

  const handleEquippedSaved = useCallback((draft: Record<SlotType, DecorItem | null>) => {
    setEquippedDraft(draft);
    setPage((prev) => (prev ? applyEquipDraftToPage(prev, draft) : prev));
  }, [setPage]);

  /** 장착 draft — 저장 직후 page 변경으로 덮어쓰지 않음 (refreshToken·방 주인 변경 시만 재동기화) */
  useEffect(() => {
    if (!pageReady || roomOwnerId == null) return;
    let cancelled = false;
    void getMyUserItems()
      .then((items) => {
        if (cancelled) return;
        const filtered = filterOwnedUserItems(items);
        setOwnedItems(filtered);
        const raw = loadNormalizedEquipDraft(page?.activeEquips, cat?.appearanceState, {
          useLocalStorage: false,
          growthStage: growth.stage,
          ownedItems: filtered,
        });
        const normalized = normalizeEquipDraft(raw, filtered, growth.stage);
        setEquippedDraft(normalized);
        logGoCatLockAudit({
          source: "CatTower equip sync",
          growthStage: growth.stage,
          rawUserItems: items,
          pageEquips: page?.activeEquips,
          appearanceState: cat?.appearanceState ?? null,
          equipDraft: normalized,
          localStorageEquipped: readLocalStorageEquippedRaw(),
        });
      })
      .catch(() => {
        if (cancelled) return;
        setEquippedDraft(
          normalizeEquipDraft(
            loadNormalizedEquipDraft(page?.activeEquips, cat?.appearanceState, {
              useLocalStorage: false,
              growthStage: growth.stage,
              ownedItems: [],
            }),
            [],
            growth.stage
          )
        );
      });
    return () => {
      cancelled = true;
    };
  }, [pageReady, roomOwnerId, refreshToken, growth.stage]);

  const myEquippedPreview = useMemo(
    () => normalizeEquipPreview(equipPreviewFromDraft(equippedDraft, ownedItems, growth.stage)),
    [equippedDraft, ownedItems, growth.stage]
  );

  const ownerEquippedPreview = useMemo(
    () =>
      ownerEquipPreviewFromPage(
        page?.activeEquips,
        cat?.appearanceState,
        growth.stage,
        ownedItems
      ),
    [page?.activeEquips, cat?.appearanceState, growth.stage, ownedItems]
  );

  const displayEquipped = canEdit ? myEquippedPreview : ownerEquippedPreview;

  const handleReport = useCallback(() => {
    const targetId = page?.miniHome?.userId;
    console.log("[CatTower] report", { targetUserId: targetId, catName: page?.miniHome?.cat?.catName });
    window.alert("신고 기능은 준비 중입니다.");
  }, [page?.miniHome?.userId, page?.miniHome?.cat?.catName]);

  const handleDecorate = useCallback(() => setDecorateOpen(true), []);
  const handleBack = useCallback(() => navigate("/cattower"), [navigate]);
  const handleEvents = useCallback(() => navigate("/events"), [navigate]);
  const handleCloseDecorate = useCallback(() => setDecorateOpen(false), []);
  const handleRefresh = useCallback(async () => {
    await loadPage();
    setRefreshToken((t) => t + 1);
  }, [loadPage]);

  const handleVisibilityChange = useCallback(
    async (nextPublic: boolean) => {
      if (roomOwnerId == null) {
        toast("사용자 정보를 확인할 수 없습니다.", "error");
        return;
      }
      try {
        const updated = await updateMyMiniHome(roomOwnerId, { isPublic: nextPublic });
        const savedPublic = resolveMiniHomeIsPublic(updated?.isPublic, nextPublic);
        setPage((prev) =>
          prev
            ? {
                ...prev,
                miniHome: { ...prev.miniHome, isPublic: savedPublic },
              }
            : prev
        );
        toast(
          savedPublic ? "미니홈이 공개로 설정되었습니다." : "미니홈이 비공개로 설정되었습니다.",
          "success"
        );
        await loadPage();
      } catch (e: unknown) {
        toast(mapMiniHomeApiError(e, "공개 설정 저장에 실패했습니다."), "error");
        throw e;
      }
    },
    [roomOwnerId, setPage, toast, loadPage]
  );

  const pageLoaded = Boolean(page) && !loading;
  const gateReady = !loadingUserId && isReady && Boolean(firebaseUser) && pageLoaded;

  /** 본인 /cattower — 미설정 시 생성 페이지로 (온보딩 UI는 캣타워에 표시하지 않음) */
  useEffect(() => {
    if (!gateReady || !canEdit || !isOwnTower) return;
    if (needsSetup) {
      navigate("/cattower/create", { replace: true });
    }
  }, [gateReady, canEdit, isOwnTower, needsSetup, navigate]);

  useEffect(() => {
    if (loadingUserId || !isReady) return;
    if (!firebaseUser) {
      setErr("로그인이 필요합니다.");
      return;
    }
    if (userIdError) {
      setErr(userIdError);
      return;
    }
    void loadPage();
  }, [isReady, loadingUserId, firebaseUser?.uid, userIdError, routeUserId, loadPage, setErr]);

  const catName = page?.miniHome?.cat?.catName ?? "고냥이";
  const ownerLabel = page?.ownerNickname ?? (isOwner ? displayName : "사용자");

  const showMain = gateReady && (!canEdit || !isOwnTower || !needsSetup);
  const isBootstrapping = loadingUserId || !isReady || loading;

  const pageShell = (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#f0faf2] via-[#fffaf5] to-[#fef6ee]">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-20 top-20 h-64 w-64 rounded-full bg-emerald-200/20 blur-3xl" />
        <div className="absolute -right-16 top-40 h-56 w-56 rounded-full bg-orange-200/20 blur-3xl" />
        <div className="absolute bottom-32 left-1/4 h-48 w-48 rounded-full bg-rose-100/25 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-4 sm:px-5 sm:py-6">
        {showMain ? (
        <CatTowerDashboard
          nickname={ownerLabel}
          catName={catName}
          growth={growth}
          isPublic={resolveMiniHomeIsPublic(page?.miniHome?.isPublic)}
          equipped={displayEquipped}
          appearanceState={cat?.appearanceState}
          activities={page?.activities ?? []}
          galleries={page?.galleries ?? []}
          activityCount={page?.stats?.activityCount ?? growth.activityCount}
          galleryCount={page?.stats?.galleryCount ?? page?.galleries?.length ?? 0}
          loading={loading && !page}
          busy={loading}
          canEdit={canEdit}
          isReadOnly={isReadOnly}
          resolvingOwner={resolvingOwner}
          roomOwnerId={roomOwnerId}
          myUserId={myUserId}
          isOwner={isOwner}
          pageReady={pageReady}
          refreshToken={refreshToken}
          catDecorateOpen={decorateOpen}
          onDecorate={handleDecorate}
          onBack={handleBack}
          onEvents={handleEvents}
          onRefresh={handleRefresh}
          onReport={isReadOnly ? handleReport : undefined}
          onVisibilityChange={canEdit ? handleVisibilityChange : undefined}
        />
        ) : null}

        <CatTowerDecorationLayer
          open={decorateOpen}
          growthStage={growth.stage}
          activityCount={growth.activityCount}
          page={page}
          canEdit={canEdit}
          onClose={handleCloseDecorate}
          onEquippedSaved={handleEquippedSaved}
        />
      </div>
    </div>
  );

  if (gateReady && canEdit && isOwnTower && needsSetup) {
    return <Navigate to="/cattower/create" replace />;
  }

  if (isBootstrapping && !err) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-gradient-to-b from-[#f0faf2] via-[#fffaf5] to-[#fef6ee]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
      </div>
    );
  }

  if (privateBlocked && viewedUserId != null) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#f0faf2] via-[#fffaf5] to-[#fef6ee]">
        <div className="relative mx-auto max-w-6xl px-4 py-4 sm:px-5 sm:py-6">
          <CatTowerPrivateBlocked message={err ?? undefined} onBack={handleBack} />
        </div>
      </div>
    );
  }

  if (err && !page) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#f0faf2] via-[#fffaf5] to-[#fef6ee]">
        <div className="relative mx-auto flex min-h-[50vh] max-w-6xl items-center justify-center px-4 py-6">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm font-semibold text-red-700">
            {err}
          </div>
        </div>
      </div>
    );
  }

  if (!showMain) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-gradient-to-b from-[#f0faf2] via-[#fffaf5] to-[#fef6ee]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
      </div>
    );
  }

  return pageShell;
}
