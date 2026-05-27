import { useCallback, useMemo } from "react";
import type { DecorItem, SlotType } from "../../../components/minihome/DecorationModal";
import { useGoCatDecoration } from "./useGoCatDecoration";
import type { GrowthStage } from "../../../utils/minihome/growth";
import type { EquipItem } from "../../../types/minihome/minihome";
import { equipPreviewFromDraft } from "../../../utils/minihome/items";

type Options = {
  pageEquips?: EquipItem[] | null;
  appearanceState?: Record<string, unknown> | null;
  goCatId?: number | null;
  canEdit?: boolean;
  onEquippedSaved?: (draft: Record<SlotType, DecorItem | null>) => void;
};

/** 꾸미기 모달 — 아이템 장착(overlay) + localStorage/API 저장 */
export function useGoCatCustomize(
  _cat: unknown,
  growthStage: GrowthStage,
  modalOpen: boolean,
  options: Options
) {
  const decoration = useGoCatDecoration(0, growthStage, modalOpen, options);

  const equipPreview = useMemo(
    () => equipPreviewFromDraft(decoration.selectedEquipment),
    [decoration.selectedEquipment]
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
    selectedBodyItem: decoration.selectedEquipment.BODY,
    selectedAccessoryItem: decoration.selectedEquipment.ACCESSORY,
    setSelectedHeadItem: (item: DecorItem | null) =>
      decoration.setSelectedEquipment((d) => ({ ...d, HEAD: item })),
    setSelectedBodyItem: (item: DecorItem | null) =>
      decoration.setSelectedEquipment((d) => ({ ...d, BODY: item })),
    setSelectedAccessoryItem: (item: DecorItem | null) =>
      decoration.setSelectedEquipment((d) => ({ ...d, ACCESSORY: item })),
    equipDraft: decoration.selectedEquipment,
    setEquipDraft: decoration.setSelectedEquipment,
    equipPreview,
    itemsBySlot: decoration.itemsBySlot,
    itemsLoading: decoration.itemsLoading,
    itemsLoadError: decoration.itemsLoadError,
    itemsEmptyBySlot: decoration.itemsEmptyBySlot,
    saving: decoration.saving,
    error: decoration.decorationErr,
    saveAll,
    canEdit: decoration.canEdit,
  };
}
