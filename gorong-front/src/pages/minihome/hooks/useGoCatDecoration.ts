import { useCallback, useEffect, useMemo, useState } from "react";
import type { DecorItem, SlotType } from "../../../components/minihome/DecorationModal";
import { getMyUserItems, saveMyEquipments } from "../../../api/minihome/itemApi";
import type { UserItem } from "../../../types/minihome/item";
import type { EquipItem } from "../../../types/minihome/minihome";
import { useNotification } from "../../../contexts/NotificationContext";
import {
  buildEquipBySlot,
  draftFromEquips,
  emptyDraft,
  userItemToDecorItem,
} from "../../../utils/minihome/items";
import {
  isItemSlotCompatible,
  isItemUnlockedByStage,
  type GrowthStage,
} from "../../../utils/minihome/growth";

type UseGoCatDecorationOptions = {
  pageEquips?: EquipItem[] | null;
  goCatId?: number | null;
  canEdit?: boolean;
};

function apiErrorMessage(e: unknown): string {
  const anyErr = e as { response?: { data?: { message?: string } }; message?: string };
  const msg = anyErr?.response?.data?.message;
  if (typeof msg === "string" && msg.trim()) return msg;
  if (typeof anyErr?.message === "string" && anyErr.message.trim()) return anyErr.message;
  return "장착 저장 중 오류가 발생했습니다.";
}

export function useGoCatDecoration(
  _userId: number,
  growthStage: GrowthStage,
  decorateOpen: boolean,
  options: UseGoCatDecorationOptions
) {
  const { toast } = useNotification();
  const canEdit = options.canEdit !== false;

  const [slot, setSlot] = useState<SlotType>("HEAD");
  const [selectedEquipment, setSelectedEquipment] =
    useState<Record<SlotType, DecorItem | null>>(emptyDraft);
  const [ownedItems, setOwnedItems] = useState<UserItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsLoadError, setItemsLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveInfo, setSaveInfo] = useState<string | null>(null);
  const [decorationErr, setDecorationErr] = useState<string | null>(null);

  const equipBySlot = useMemo(
    () => buildEquipBySlot(options.pageEquips),
    [options.pageEquips]
  );

  useEffect(() => {
    if (!decorateOpen || !canEdit) return;

    setSaveInfo(null);
    setDecorationErr(null);
    setSelectedEquipment(draftFromEquips(options.pageEquips));

    let cancelled = false;

    (async () => {
      setItemsLoading(true);
      setItemsLoadError(null);
      try {
        const items = await getMyUserItems();
        if (cancelled) return;
        setOwnedItems(items);
      } catch (e) {
        if (cancelled) return;
        console.error("[MiniHome] getMyUserItems failed", e);
        setItemsLoadError("보유 아이템을 불러오지 못했습니다.");
        setOwnedItems([]);
      } finally {
        if (!cancelled) setItemsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [decorateOpen, canEdit, options.pageEquips]);

  const itemsForSlot = useMemo(() => {
    return ownedItems
      .map(userItemToDecorItem)
      .filter((it) => {
        const itemSlot = it.slotType;
        if (!itemSlot || !isItemSlotCompatible(itemSlot, growthStage)) return false;
        if (itemSlot !== slot) return false;
        return isItemUnlockedByStage(it.requiredGrowthStage, growthStage);
      });
  }, [ownedItems, slot, growthStage]);

  const itemsEmptyForSlot =
    !itemsLoading && !itemsLoadError && itemsForSlot.length === 0;

  const selectEquipment = useCallback((s: SlotType, item: DecorItem | null) => {
    setSelectedEquipment((prev) => ({ ...prev, [s]: item }));
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

    const payload = {
      headItemId: selectedEquipment.HEAD?.itemId ?? null,
      bodyItemId: selectedEquipment.BODY?.itemId ?? null,
      accessoryItemId: selectedEquipment.ACCESSORY?.itemId ?? null,
    };

    try {
      await saveMyEquipments(payload);
      setSaveInfo("장착 정보가 저장되었습니다.");
      toast("장착 정보가 저장되었습니다.", "success");
      return true;
    } catch (e: unknown) {
      console.error("[MiniHome] saveDecoration failed", e);
      const msg = apiErrorMessage(e);
      setDecorationErr(msg);
      toast(msg, "error");
      return false;
    } finally {
      setSaving(false);
    }
  }, [selectedEquipment, canEdit, toast]);

  return {
    slot,
    setSlot,
    selectedEquipment,
    setSelectedEquipment,
    selectEquipment,
    equipBySlot,
    itemsLoading,
    itemsLoadError,
    itemsEmpty: itemsEmptyForSlot,
    itemsForSlot,
    saving,
    saveInfo,
    decorationErr,
    saveDecoration,
    canEdit,
    goCatId: options.goCatId ?? null,
  };
}
