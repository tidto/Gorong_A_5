import { useCallback, useEffect, useMemo, useState } from "react";
import type { DecorItem, SlotType } from "../../../components/minihome/mini-home/DecorationModal";
import type { UserItem } from "../../../types/minihome/item";
import type { EquipItem } from "../../../types/minihome/minihome";
import { useNotification } from "../../../contexts/NotificationContext";
import { updateMyCatAppearance } from "../../../api/minihome/miniHomeApi";
import { getMyUserItems, saveMyEquipments } from "../../../api/minihome/itemApi";
import { equipPreviewFromDraft } from "../../../utils/minihome/gocat/items";
import {
  listDecorItemsForSlot,
  resolveOwnedItemId,
  type DecorItemWithOwnership,
} from "../../../utils/minihome/gocat/decorItemCatalog";
import {
  loadEquippedDecorDraft,
  saveStoredEquipped,
  sanitizeEquipDraft,
} from "../../../utils/minihome/gocat/gocatEquippedStorage";
import { toPresentationAppearancePayload } from "../../../utils/minihome/cat-tower/catTowerPresentation";
import type { GrowthStage } from "../../../utils/minihome/growth/growth";
import { mapMiniHomeApiError } from "../../../utils/minihome/core/minihomeApiError";

type UseGoCatDecorationOptions = {
  pageEquips?: EquipItem[] | null;
  appearanceState?: Record<string, unknown> | null;
  goCatId?: number | null;
  canEdit?: boolean;
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
  const [ownedItems, setOwnedItems] = useState<UserItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsLoadError, setItemsLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveInfo, setSaveInfo] = useState<string | null>(null);
  const [decorationErr, setDecorationErr] = useState<string | null>(null);

  const loadDraft = useCallback(
    (items: UserItem[]) =>
      sanitizeEquipDraft(
        loadEquippedDecorDraft(options.pageEquips, options.appearanceState, {
          useLocalStorage: options.canEdit !== false,
        }, items),
        items
      ),
    [options.pageEquips, options.appearanceState, options.canEdit]
  );

  const [selectedEquipment, setSelectedEquipment] = useState<Record<SlotType, DecorItem | null>>(
    () => loadDraft([])
  );

  const syncDraftFromSources = useCallback(
    (items: UserItem[]) => {
      setSelectedEquipment(loadDraft(items));
    },
    [loadDraft]
  );

  useEffect(() => {
    syncDraftFromSources(ownedItems);
  }, [syncDraftFromSources, ownedItems, options.pageEquips, options.appearanceState]);

  useEffect(() => {
    if (!decorateOpen || !canEdit) return;

    let cancelled = false;
    setSaveInfo(null);
    setDecorationErr(null);
    setItemsLoadError(null);
    setItemsLoading(true);

    void getMyUserItems()
      .then((items) => {
        if (cancelled) return;
        setOwnedItems(items);
        syncDraftFromSources(items);
      })
      .catch((e) => {
        if (cancelled) return;
        setItemsLoadError(mapMiniHomeApiError(e, "아이템 목록을 불러오지 못했습니다."));
        setOwnedItems([]);
      })
      .finally(() => {
        if (!cancelled) setItemsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [decorateOpen, canEdit, syncDraftFromSources]);

  const filterItemsForSlot = useCallback(
    (targetSlot: SlotType) => listDecorItemsForSlot(targetSlot, growthStage, ownedItems),
    [ownedItems, growthStage]
  );

  const itemsForSlot = useMemo(
    () => (decorateOpen ? filterItemsForSlot(slot) : []),
    [decorateOpen, filterItemsForSlot, slot]
  );

  const emptySlotFlags = useMemo(
    () => ({
      HEAD: !itemsLoading && !itemsLoadError,
      BODY: !itemsLoading && !itemsLoadError,
      ACCESSORY: !itemsLoading && !itemsLoadError,
    }),
    [itemsLoading, itemsLoadError]
  );

  const itemsBySlot = useMemo(() => {
    if (!decorateOpen) {
      return { HEAD: [], BODY: [], ACCESSORY: [] } as const;
    }
    return {
      HEAD: filterItemsForSlot("HEAD"),
      BODY: filterItemsForSlot("BODY"),
      ACCESSORY: filterItemsForSlot("ACCESSORY"),
    };
  }, [decorateOpen, filterItemsForSlot]);

  const itemsEmptyBySlot = useMemo(
    () => ({
      HEAD: emptySlotFlags.HEAD && itemsBySlot.HEAD.length === 0,
      BODY: emptySlotFlags.BODY && itemsBySlot.BODY.length === 0,
      ACCESSORY: emptySlotFlags.ACCESSORY && itemsBySlot.ACCESSORY.length === 0,
    }),
    [emptySlotFlags, itemsBySlot]
  );

  const itemsEmptyForSlot =
    !decorateOpen || (!itemsLoading && !itemsLoadError && itemsForSlot.length === 0);

  const equipPreview = useMemo(
    () => equipPreviewFromDraft(selectedEquipment),
    [selectedEquipment]
  );

  const selectEquipment = useCallback((s: SlotType, item: DecorItem | null) => {
    setSelectedEquipment((prev) => ({ ...prev, [s]: item }));
  }, []);

  const toggleSlotItem = useCallback(
    (s: SlotType, item: DecorItemWithOwnership) => {
      if (item.locked) {
        toast(item.unlockHint ?? "행사 참여 후 획득할 수 있어요.", "info");
        return;
      }
      setSelectedEquipment((prev) => {
        if (prev[s]?.itemCode === item.itemCode || prev[s]?.itemId === item.itemId) {
          return { ...prev, [s]: null };
        }
        return { ...prev, [s]: item };
      });
    },
    [toast]
  );

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

    const draft = sanitizeEquipDraft(selectedEquipment, ownedItems);
    setSelectedEquipment(draft);

    const localOk = saveStoredEquipped(draft);
    if (!localOk) {
      const msg = "장착 정보를 기기에 저장하지 못했습니다.";
      setDecorationErr(msg);
      toast(msg, "error");
      setSaving(false);
      return false;
    }

    try {
      await saveMyEquipments({
        headItemId: resolveOwnedItemId(draft.HEAD, ownedItems),
        bodyItemId: resolveOwnedItemId(draft.BODY, ownedItems),
        accessoryItemId: resolveOwnedItemId(draft.ACCESSORY, ownedItems),
      });
      await updateMyCatAppearance(toPresentationAppearancePayload(draft));
      options.onEquippedSaved?.(draft);
      setSaveInfo("장착 정보가 저장되었습니다.");
      toast("장착 정보가 저장되었습니다.", "success");
      setSaving(false);
      return true;
    } catch (e) {
      const msg = mapMiniHomeApiError(e, "장착 저장에 실패했습니다.");
      setDecorationErr(msg);
      toast(msg, "error");
      setSaving(false);
      return false;
    }
  }, [selectedEquipment, ownedItems, canEdit, toast, options]);

  return {
    slot,
    setSlot,
    selectedEquipment,
    setSelectedEquipment,
    selectEquipment,
    toggleSlotItem,
    equipPreview,
    ownedItems,
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
