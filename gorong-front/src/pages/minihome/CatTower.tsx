import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  persistMigratedEquipDraft,
} from "../../utils/minihome/gocat/gocatEquipMigration";
import { getMyUserItems } from "../../api/minihome/itemApi";
import { filterOwnedUserItems } from "../../utils/minihome/gocat/gocatItemCatalog";
import {
  logGoCatLockAudit,
  readLocalStorageEquippedRaw,
} from "../../utils/minihome/gocat/gocatLockDebug";
import { emptyDraft } from "../../utils/minihome/gocat/items";
import type { DecorItem, SlotType } from "../../components/minihome/mini-home/DecorationModal";
import { computeGrowthState } from "../../utils/minihome/growth/growth";
import { MINIHOME_UNLOCKS_SYNC_EVENT } from "../../utils/minihome/core/minihomeUnlocksSync";
import { needsGoCatSetup } from "../../utils/minihome/gocat/goCatSetup";
import CatTowerDecorationLayer from "./CatTowerDecorationLayer";

export default function CatTower() {
  const navigate = useNavigate();
  const { userId: routeUserId } = useParams<{ userId?: string }>();
  const { displayName, firebaseUser, loadingUserId, userIdError, isReady } = useMiniHomeUserId();

  const {
    myUserId,
    page,
    loading,
    err,
    canEdit,
    isReadOnly,
    isOwner,
    loadPage,
    setPage,
    setErr,
    resolvingOwner,
  } = useCatTowerView({ routeUserId, isReady });

  const roomOwnerId = page?.miniHome?.userId ?? null;
  const pageReady = Boolean(roomOwnerId) && !loading && !resolvingOwner;

  const [decorateOpen, setDecorateOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [itemsRefreshToken, setItemsRefreshToken] = useState(0);
  const [equippedDraft, setEquippedDraft] = useState<Record<SlotType, DecorItem | null>>(() =>
    emptyDraft()
  );
  const [ownedUserItems, setOwnedUserItems] = useState<ReturnType<typeof filterOwnedUserItems>>([]);

  const growth = useMemo(() => computeGrowthState(page), [page]);
  const needsSetup = useMemo(() => needsGoCatSetup(page), [page]);
  const isOwnTower = routeUserId == null || routeUserId.trim() === "";

  const cat = page?.miniHome?.cat ?? null;

  const handleEquippedSaved = useCallback((draft: Record<SlotType, DecorItem | null>) => {
    setEquippedDraft(draft);
    setPage((prev) => (prev ? applyEquipDraftToPage(prev, draft) : prev));
  }, [setPage]);

  useEffect(() => {
    if (!pageReady) return;
    let cancelled = false;
    void getMyUserItems()
      .then((items) => {
        if (cancelled) return;
        const filtered = filterOwnedUserItems(items);
        setOwnedUserItems(filtered);
        const raw = loadNormalizedEquipDraft(page?.activeEquips, cat?.appearanceState, {
          useLocalStorage: false,
          growthStage: growth.stage,
          ownedItems: filtered,
        });
        const normalized = canEdit
          ? persistMigratedEquipDraft(raw, filtered, growth.stage)
          : raw;
        setEquippedDraft(normalized);
        logGoCatLockAudit({
          source: "CatTower page load",
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
        setOwnedUserItems([]);
        setEquippedDraft(
          loadNormalizedEquipDraft(page?.activeEquips, cat?.appearanceState, {
            useLocalStorage: false,
            growthStage: growth.stage,
            ownedItems: [],
          })
        );
      });
    return () => {
      cancelled = true;
    };
  }, [canEdit, pageReady, page?.activeEquips, cat?.appearanceState, growth.stage, itemsRefreshToken]);

  useEffect(() => {
    if (!isOwnTower || !pageReady) return;
    const onUnlocksSync = () => {
      void loadPage();
      setItemsRefreshToken((t) => t + 1);
      setRefreshToken((t) => t + 1);
    };
    window.addEventListener(MINIHOME_UNLOCKS_SYNC_EVENT, onUnlocksSync);
    return () => window.removeEventListener(MINIHOME_UNLOCKS_SYNC_EVENT, onUnlocksSync);
  }, [isOwnTower, pageReady, loadPage]);

  const myEquippedPreview = useMemo(
    () =>
      normalizeEquipPreview(
        equipPreviewFromDraft(equippedDraft, ownedUserItems, growth.stage)
      ),
    [equippedDraft, ownedUserItems, growth.stage]
  );

  const ownerEquippedPreview = useMemo(
    () => ownerEquipPreviewFromPage(page?.activeEquips, cat?.appearanceState, growth.stage),
    [page?.activeEquips, cat?.appearanceState, growth.stage]
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
  const handleRefresh = useCallback(() => {
    void loadPage();
    setRefreshToken((t) => t + 1);
  }, [loadPage]);

  const handleRoomAppearanceSaved = useCallback(
    (nextAppearance: Record<string, unknown>) => {
      void loadPage();
      setItemsRefreshToken((t) => t + 1);
      setPage((prev) => {
        if (!prev?.miniHome?.cat) return prev;
        const cat = prev.miniHome.cat;
        return {
          ...prev,
          miniHome: {
            ...prev.miniHome,
            cat: {
              ...cat,
              appearanceState: {
                ...(cat.appearanceState ?? {}),
                ...nextAppearance,
              },
            },
          },
        };
      });
    },
    [loadPage, setPage]
  );

  /** 최초 로드만 전체 스피너 — 새로고침 중에는 대시보드·모달 유지 */
  const bootstrapping = loading && page == null;
  const gateReady =
    !loadingUserId && isReady && Boolean(firebaseUser) && !bootstrapping && Boolean(page);

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

  const showMain =
    gateReady && (!canEdit || !isOwnTower || !needsSetup);

  if (!showMain) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-gradient-to-b from-[#f0faf2] via-[#fffaf5] to-[#fef6ee]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent">
      <div className="relative mx-auto max-w-6xl px-4 py-4 sm:py-6">
        <CatTowerDashboard
          nickname={ownerLabel}
          catName={catName}
          growth={growth}
          isPublic={Boolean(page?.miniHome?.isPublic)}
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
          onDecorate={handleDecorate}
          onBack={handleBack}
          onEvents={handleEvents}
          onRefresh={handleRefresh}
          onAppearanceSaved={handleRoomAppearanceSaved}
          onReport={isReadOnly ? handleReport : undefined}
        />

        {err ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {err}
          </div>
        ) : null}

        <CatTowerDecorationLayer
          open={decorateOpen}
          growthStage={growth.stage}
          activityCount={growth.activityCount}
          page={page}
          canEdit={canEdit}
          onClose={handleCloseDecorate}
          onEquippedSaved={handleEquippedSaved}
          onPageUpdate={setPage}
          onReloadPage={loadPage}
        />
      </div>
    </div>
  );
}
