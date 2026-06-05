import { lazy, Suspense, useCallback } from "react";
import type { DecorItem, SlotType } from "../../components/minihome/mini-home/DecorationModal";
import type { MiniHomePage } from "../../types/minihome/minihome";
import { useGoCatCustomize } from "./hooks/useGoCatCustomize";
import { applyEquipDraftToPage } from "../../utils/minihome/gocat/items";
import type { GrowthStage } from "../../utils/minihome/growth/growth";
import { getCatTowerRoomPresentation } from "../../utils/minihome/cat-tower/catTowerRoomPresentation";

const DecorationModal = lazy(
  () => import("../../components/minihome/mini-home/DecorationModal")
);
const DecorationCustomizePanel = lazy(
  () => import("../../components/minihome/decoration/DecorationCustomizePanel")
);
const DecorateCatPreview = lazy(
  () => import("../../components/minihome/rive/DecorateCatPreview")
);

type Props = {
  open: boolean;
  growthStage: GrowthStage;
  activityCount: number;
  page: MiniHomePage | null;
  canEdit: boolean;
  onClose: () => void;
  onEquippedSaved: (draft: Record<SlotType, DecorItem | null>) => void;
  onPageUpdate: (updater: (prev: MiniHomePage | null) => MiniHomePage | null) => void;
  onReloadPage: () => Promise<void>;
};

/** 꾸미기 모달·API — 열릴 때만 마운트 (Rive 프리뷰 2중 로드 방지) */
export default function CatTowerDecorationLayer({
  open,
  growthStage,
  activityCount,
  page,
  canEdit,
  onClose,
  onEquippedSaved,
  onPageUpdate,
  onReloadPage,
}: Props) {
  const cat = page?.miniHome?.cat ?? null;
  const roomPresentation = getCatTowerRoomPresentation(cat?.appearanceState ?? null, true);

  const customize = useGoCatCustomize(cat, growthStage, open, {
    pageEquips: page?.activeEquips,
    appearanceState: cat?.appearanceState,
    goCatId: cat?.goCatId,
    canEdit,
    activityCount,
    onEquippedSaved,
  });

  const handleSave = useCallback(async () => {
    const { equipOk, draft } = await customize.saveAll();
    if (equipOk) {
      onEquippedSaved(draft);
      onPageUpdate((prev) => (prev ? applyEquipDraftToPage(prev, draft) : prev));
      onClose();
      await onReloadPage();
    }
  }, [customize, onClose, onEquippedSaved, onPageUpdate, onReloadPage]);

  if (!open || !canEdit) return null;

  return (
    <Suspense fallback={null}>
      <DecorationModal
        open={open}
        saving={customize.saving}
        error={customize.error}
        canEdit={customize.canEdit}
        growthStage={growthStage}
        customizePanel={
          <DecorationCustomizePanel
            selectedHeadItem={customize.selectedHeadItem}
            selectedFaceItem={customize.selectedFaceItem}
            selectedNeckItem={customize.selectedNeckItem}
            setEquipDraft={customize.setEquipDraft}
            itemsBySlot={customize.itemsBySlot}
            itemsLoading={customize.itemsLoading}
            itemsLoadError={customize.itemsLoadError}
            disabled={customize.saving}
            growthStage={growthStage}
            activityCount={activityCount}
            ownedItems={customize.ownedItems}
            onLogLockState={customize.logLockStateToConsole}
            onResetLockTest={customize.resetLockTestData}
            onToggleSlotItem={customize.toggleSlotItem}
          />
        }
        onClose={onClose}
        onSave={handleSave}
        roomBackground={roomPresentation.background}
        roomItems={roomPresentation.items}
        Preview={
          <DecorateCatPreview
            growthStage={growthStage}
            activityCount={activityCount}
            equipped={customize.equipPreview}
            interactive
          />
        }
      />
    </Suspense>
  );
}
