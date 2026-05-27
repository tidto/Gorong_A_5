import { useCallback, useEffect, useMemo, useState } from "react";
import type { DecorItem, SlotType } from "../../../components/minihome/mini-home/DecorationModal";
import type { UserItem } from "../../../types/minihome/item";
import type { EquipItem } from "../../../types/minihome/minihome";
import { useNotification } from "../../../contexts/NotificationContext";
import { updateMyCatAppearance } from "../../../api/minihome/miniHomeApi";
import { equipPreviewFromDraft } from "../../../utils/minihome/gocat/items";
import { listDecorItemsForSlot } from "../../../utils/minihome/gocat/decorItemCatalog";
import {
  loadEquippedDecorDraft,
  saveStoredEquipped,
  sanitizeEquipDraft,
} from "../../../utils/minihome/gocat/gocatEquippedStorage";
import { toPresentationAppearancePayload } from "../../../utils/minihome/cat-tower/catTowerPresentation";
import type { GrowthStage } from "../../../utils/minihome/growth/growth";

type UseGoCatDecorationOptions = {
  pageEquips?: EquipItem[] | null;
  appearanceState?: Record<string, unknown> | null;
  goCatId?: number | null;
  canEdit?: boolean;
  /** localStorage 저장 후 CatTower 등 부모 UI 갱신 */
  onEquippedSaved?: (draft: Record<SlotType, DecorItem | null>) => void;
};

export function useGoCatDecoration(
  _userId: number,
  growthStage: GrowthStage,
  decorateOpen: boolean,
  options: UseGoCatDecorationOptions
) {
  const { toast } = useNotification();
  const canEdit = options.canEdit !== false;

  const [slot, setSlot] = useState<SlotType>("HEAD");
  const loadDraft = useCallback(
    () =>
      sanitizeEquipDraft(
        loadEquippedDecorDraft(options.pageEquips, options.appearanceState, {
          useLocalStorage: options.canEdit !== false,
        })
      ),
    [options.pageEquips, options.appearanceState, options.canEdit]
  );

  const [selectedEquipment, setSelectedEquipment] = useState<Record<SlotType, DecorItem | null>>(
    () => loadDraft()
  );
  const [ownedItems, setOwnedItems] = useState<UserItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsLoadError, setItemsLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveInfo, setSaveInfo] = useState<string | null>(null);
  const [decorationErr, setDecorationErr] = useState<string | null>(null);

  const syncDraftFromSources = useCallback(() => {
    setSelectedEquipment(loadDraft());
  }, [loadDraft]);

  useEffect(() => {
    syncDraftFromSources();
  }, [syncDraftFromSources]);

  useEffect(() => {
    if (!decorateOpen || !canEdit) return;

    setSaveInfo(null);
    setDecorationErr(null);
    setItemsLoadError(null);
    setOwnedItems([]);
    setItemsLoading(false);
    syncDraftFromSources();
  }, [decorateOpen, canEdit, syncDraftFromSources]);

  const filterItemsForSlot = useCallback(
    (targetSlot: SlotType) => listDecorItemsForSlot(targetSlot, growthStage, ownedItems),
    [ownedItems, growthStage]
  );

  const itemsForSlot = useMemo(() => filterItemsForSlot(slot), [filterItemsForSlot, slot]);

  const itemsBySlot = useMemo(
    () => ({
      HEAD: filterItemsForSlot("HEAD"),
      BODY: filterItemsForSlot("BODY"),
      ACCESSORY: filterItemsForSlot("ACCESSORY"),
    }),
    [filterItemsForSlot]
  );

  const itemsEmptyBySlot = useMemo(
    () => ({
      HEAD: !itemsLoading && !itemsLoadError && itemsBySlot.HEAD.length === 0,
      BODY: !itemsLoading && !itemsLoadError && itemsBySlot.BODY.length === 0,
      ACCESSORY: !itemsLoading && !itemsLoadError && itemsBySlot.ACCESSORY.length === 0,
    }),
    [itemsLoading, itemsLoadError, itemsBySlot]
  );

  const itemsEmptyForSlot =
    !itemsLoading && !itemsLoadError && itemsForSlot.length === 0;

  const equipPreview = useMemo(
    () => equipPreviewFromDraft(selectedEquipment),
    [selectedEquipment]
  );

  const selectEquipment = useCallback((s: SlotType, item: DecorItem | null) => {
    setSelectedEquipment((prev) => ({ ...prev, [s]: item }));
  }, []);

  const toggleSlotItem = useCallback((s: SlotType, item: DecorItem) => {
    setSelectedEquipment((prev) => {
      if (prev[s]?.itemCode === item.itemCode || prev[s]?.itemId === item.itemId) {
        return { ...prev, [s]: null };
      }
      return { ...prev, [s]: item };
    });
  }, []);

  const saveDecoration = useCallback(async (): Promise<boolean> => {
    if (!canEdit) {
      const msg = "다른 사용자 홈에서는 저장할 수 없습니다.";
      setDecorationErr(msg);
      toast(msg, "warning");
      return false;
    }

    setSaving(true);
    setDecorationErr(null);
    setSaveInfo(null);

    const draft = sanitizeEquipDraft(selectedEquipment);
    setSelectedEquipment(draft);
    const localOk = saveStoredEquipped(draft);
    if (!localOk) {
      const msg = "장착 정보를 기기에 저장하지 못했습니다.";
      setDecorationErr(msg);
      toast(msg, "error");
      setSaving(false);
      return false;
    }

    options.onEquippedSaved?.(draft);

    try {
      await updateMyCatAppearance(toPresentationAppearancePayload(draft));
    } catch (e) {
      console.warn("[GoCat] equip API save failed — localStorage kept", e);
    }

    setSaveInfo("장착 정보가 저장되었습니다.");
    toast("장착 정보가 저장되었습니다.", "success");
    setSaving(false);

    return true;
  }, [selectedEquipment, canEdit, toast, options]);

  return {
    slot,
    setSlot,
    selectedEquipment,
    setSelectedEquipment,
    selectEquipment,
    toggleSlotItem,
    equipPreview,
    itemsLoading,
    itemsLoadError,
    itemsEmpty: itemsEmptyForSlot,
    itemsForSlot,
    itemsBySlot,
    itemsEmptyBySlot,
    saving,
    saveInfo,
    decorationErr,
    saveDecoration,
    canEdit,
    goCatId: options.goCatId ?? null,
  };
}
