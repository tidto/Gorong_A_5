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
import {
  loadEquippedDecorDraft,
  ownerEquipPreviewFromPage,
} from "../../utils/minihome/gocat/gocatEquippedStorage";
import { emptyDraft } from "../../utils/minihome/gocat/items";
import type { DecorItem, SlotType } from "../../components/minihome/mini-home/DecorationModal";
import {
  completeMyCatSetup,
  createMyMiniHome,
} from "../../api/minihome/miniHomeApi";
import { computeGrowthState } from "../../utils/minihome/growth/growth";
import {
  isCatAppearanceConfigured,
  parseCatAppearance,
  toAppearanceApiPayload,
} from "../../utils/minihome/gocat/catAppearance";
import { mapMiniHomeApiError } from "../../utils/minihome/core/minihomeApiError";
import GoCatOnboarding, { type GoCatOnboardingSubmit } from "../../components/minihome/onboarding/GoCatOnboarding";
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
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingErr, setOnboardingErr] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [equippedDraft, setEquippedDraft] = useState<Record<SlotType, DecorItem | null>>(() =>
    emptyDraft()
  );

  const growth = useMemo(() => computeGrowthState(page), [page]);

  const needsOnboarding = useMemo(() => {
    if (!page?.miniHome?.cat) return true;
    const cat = page.miniHome.cat;
    return !isCatAppearanceConfigured(cat.appearanceState, cat.appearanceConfigured);
  }, [page]);

  const showOnboarding =
    canEdit && !loadingUserId && isReady && Boolean(firebaseUser) && !loading && needsOnboarding;
  const cat = page?.miniHome?.cat ?? null;

  const handleEquippedSaved = useCallback((draft: Record<SlotType, DecorItem | null>) => {
    setEquippedDraft(draft);
    setPage((prev) => (prev ? applyEquipDraftToPage(prev, draft) : prev));
  }, [setPage]);

  useEffect(() => {
    setEquippedDraft(
      loadEquippedDecorDraft(page?.activeEquips, cat?.appearanceState, {
        useLocalStorage: canEdit,
      })
    );
  }, [page?.activeEquips, cat?.appearanceState, canEdit]);

  const myEquippedPreview = useMemo(
    () => normalizeEquipPreview(equipPreviewFromDraft(equippedDraft)),
    [equippedDraft]
  );

  const ownerEquippedPreview = useMemo(
    () => ownerEquipPreviewFromPage(page?.activeEquips, cat?.appearanceState),
    [page?.activeEquips, cat?.appearanceState]
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

  const busy = loading || onboardingSaving;

  const activityCount = page?.stats?.activityCount ?? growth.activityCount;
  const galleryCount = page?.stats?.galleryCount ?? page?.galleries?.length ?? 0;

  async function handleOnboardingSubmit(payload: GoCatOnboardingSubmit) {
    setOnboardingSaving(true);
    setOnboardingErr(null);
    try {
      const body = {
        ...toAppearanceApiPayload(payload.appearance),
        catName: payload.catName,
      };
      if (!canEdit) return;
      if (!page?.miniHome?.cat) {
        await createMyMiniHome(body);
      } else {
        await completeMyCatSetup(body);
      }
      await loadPage();
    } catch (e: unknown) {
      setOnboardingErr(mapMiniHomeApiError(e, "Go냥이 저장에 실패했습니다."));
    } finally {
      setOnboardingSaving(false);
    }
  }

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

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#f0faf2] via-[#fffaf5] to-[#fef6ee]">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-20 top-20 h-64 w-64 rounded-full bg-emerald-200/20 blur-3xl" />
        <div className="absolute -right-16 top-40 h-56 w-56 rounded-full bg-orange-200/20 blur-3xl" />
        <div className="absolute bottom-32 left-1/4 h-48 w-48 rounded-full bg-rose-100/25 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-4 sm:py-6">
        {showOnboarding ? (
          <GoCatOnboarding
            growthStage={growth.stage}
            initialCatName={cat?.catName}
            initialAppearance={cat ? parseCatAppearance(cat.appearanceState) : undefined}
            saving={onboardingSaving}
            error={onboardingErr ?? err}
            onSubmit={handleOnboardingSubmit}
          />
        ) : null}

        {!showOnboarding ? (
          <>
            <CatTowerDashboard
              nickname={ownerLabel}
              catName={catName}
              growth={growth}
              isPublic={Boolean(page?.miniHome?.isPublic)}
              equipped={displayEquipped}
              appearanceState={cat?.appearanceState}
              activities={page?.activities ?? []}
              galleries={page?.galleries ?? []}
              activityCount={activityCount}
              galleryCount={galleryCount}
              loading={loading && !page}
              busy={busy}
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
          </>
        ) : null}
      </div>
    </div>
  );
}
