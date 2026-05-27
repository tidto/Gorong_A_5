import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DecorationModal from "../../components/minihome/DecorationModal";
import DecorationCustomizePanel from "../../components/minihome/decoration/DecorationCustomizePanel";
import CatTowerDashboard from "../../components/minihome/cat-tower/CatTowerDashboard";
import DecorateCatPreview from "../../components/minihome/rive/DecorateCatPreview";
import { useMiniHomeUserId } from "./hooks/useMiniHomeUserId";
import { useCatTowerView } from "./hooks/useCatTowerView";
import { useGoCatCustomize } from "./hooks/useGoCatCustomize";
import {
  applyEquipDraftToPage,
  equipPreviewFromDraft,
  normalizeEquipPreview,
} from "../../utils/minihome/items";
import {
  loadEquippedDecorDraft,
  ownerEquipPreviewFromPage,
} from "../../utils/minihome/gocatEquippedStorage";
import { emptyDraft } from "../../utils/minihome/items";
import type { DecorItem, SlotType } from "../../components/minihome/DecorationModal";
import {
  completeMyCatSetup,
  createMyMiniHome,
} from "../../api/minihome/miniHomeApi";
import { computeGrowthState } from "../../utils/minihome/growth";
import {
  isCatAppearanceConfigured,
  parseCatAppearance,
  toAppearanceApiPayload,
} from "../../utils/minihome/catAppearance";
import { mapMiniHomeApiError } from "../../utils/minihome/minihomeApiError";
import GoCatOnboarding, { type GoCatOnboardingSubmit } from "../../components/minihome/onboarding/GoCatOnboarding";

export default function CatTower() {
  const navigate = useNavigate();
  const { userId: routeUserId } = useParams<{ userId?: string }>();
  const { displayName, firebaseUser, loadingUserId, userIdError, isReady } = useMiniHomeUserId();

  const {
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

  const [decorateOpen, setDecorateOpen] = useState(false);
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingErr, setOnboardingErr] = useState<string | null>(null);
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

  const customize = useGoCatCustomize(cat, growth.stage, decorateOpen, {
    pageEquips: page?.activeEquips,
    appearanceState: cat?.appearanceState,
    goCatId: cat?.goCatId,
    canEdit,
    onEquippedSaved: handleEquippedSaved,
  });

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
  const busy = loading || customize.saving || onboardingSaving;

  const activityCount = page?.stats?.activityCount ?? growth.activityCount;
  const galleryCount = page?.stats?.galleryCount ?? page?.galleries?.length ?? 0;

  async function handleSaveDecoration() {
    const { equipOk, draft } = await customize.saveAll();
    if (equipOk) {
      setEquippedDraft(draft);
      setPage((prev) => (prev ? applyEquipDraftToPage(prev, draft) : prev));
      setDecorateOpen(false);
    }
  }

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
      {/* 페이지 배경 — 미니홈피 감성 */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-20 top-20 h-64 w-64 rounded-full bg-emerald-200/20 blur-3xl" />
        <div className="absolute -right-16 top-40 h-56 w-56 rounded-full bg-orange-200/20 blur-3xl" />
        <div className="absolute bottom-32 left-1/4 h-48 w-48 rounded-full bg-rose-100/25 blur-3xl" />
        <span className="absolute left-[8%] top-[18%] animate-float text-lg opacity-30">🌸</span>
        <span
          className="absolute right-[10%] top-[22%] animate-petal-sway text-base opacity-25"
          style={{ animationDelay: "1s" }}
        >
          ✨
        </span>
        <span
          className="absolute bottom-[20%] right-[15%] animate-cloud-drift text-xl opacity-20"
          style={{ animationDelay: "0.5s" }}
        >
          ☁️
        </span>
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-6 sm:py-8">
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
              onDecorate={() => setDecorateOpen(true)}
              onBack={() => navigate("/cattower")}
              onEvents={() => navigate("/events")}
              onRefresh={loadPage}
              onReport={isReadOnly ? handleReport : undefined}
            />

            {err || customize.error ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {err ?? customize.error}
              </div>
            ) : null}

            {canEdit ? (
              <DecorationModal
                open={decorateOpen}
                saving={customize.saving}
                error={customize.error}
                canEdit={customize.canEdit}
                growthStage={growth.stage}
                customizePanel={
                  <DecorationCustomizePanel
                    selectedHeadItem={customize.selectedHeadItem}
                    selectedBodyItem={customize.selectedBodyItem}
                    selectedAccessoryItem={customize.selectedAccessoryItem}
                    setEquipDraft={customize.setEquipDraft}
                    itemsLoading={customize.itemsLoading}
                    itemsLoadError={customize.itemsLoadError}
                    disabled={customize.saving}
                    growthStage={growth.stage}
                    activityCount={growth.activityCount}
                  />
                }
                onClose={() => setDecorateOpen(false)}
                onSave={handleSaveDecoration}
                Preview={
                  <DecorateCatPreview
                    growthStage={growth.stage}
                    activityCount={growth.activityCount}
                    equipped={customize.equipPreview}
                    interactive
                  />
                }
              />
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
