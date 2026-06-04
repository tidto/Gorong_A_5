import { useCallback, useMemo } from "react";
import type { DecorItem, SlotType } from "../../../components/minihome/mini-home/DecorationModal";
import { useGoCatDecoration } from "./useGoCatDecoration";
import type { GrowthStage } from "../../../utils/minihome/growth/growth";
import type { EquipItem } from "../../../types/minihome/minihome";
import { equipPreviewFromDraft } from "../../../utils/minihome/gocat/items";

type Options = {
  pageEquips?: EquipItem[] | null;
  appearanceState?: Record<string, unknown> | null;
  goCatId?: number | null;
  canEdit?: boolean;
  activityCount?: number;
  onEquippedSaved?: (draft: Record<SlotType, DecorItem | null>) => void;
};

export function useGoCatCustomize(
  _cat: unknown,
  growthStage: GrowthStage,
  modalOpen: boolean,
  options: Options
) {
  const decoration = useGoCatDecoration(0, growthStage, modalOpen, options);

  const equipPreview = useMemo(
    () =>
      equipPreviewFromDraft(
        decoration.selectedEquipment,
        decoration.ownedItems,
        growthStage
      ),
    [decoration.selectedEquipment, decoration.ownedItems, growthStage]
  );

  const saveAll = useCallback(async () => {
    const equipOk = await decoration.saveDecoration();
    return {
      equipOk,
      draft: decoration.selectedEquipment,
    };
  }, [decoration]);

  return {
    selectedHeadItem: decoration.selectedEquipment.HEAD,
    selectedFaceItem: decoration.selectedEquipment.FACE,
    selectedNeckItem: decoration.selectedEquipment.NECK,
    setEquipDraft: decoration.setSelectedEquipment,
    equipPreview,
    itemsBySlot: decoration.itemsBySlot,
    itemsLoading: decoration.itemsLoading,
    itemsLoadError: decoration.itemsLoadError,
    itemsEmptyBySlot: decoration.itemsEmptyBySlot,
    ownedItems: decoration.ownedItems,
    saving: decoration.saving,
    error: decoration.decorationErr,
    saveAll,
    logLockStateToConsole: decoration.logLockStateToConsole,
    resetLockTestData: decoration.resetLockTestData,
    toggleSlotItem: decoration.toggleSlotItem,
    canEdit: decoration.canEdit,
  };
}
