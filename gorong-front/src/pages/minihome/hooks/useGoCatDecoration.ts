import { useCallback, useEffect, useMemo, useState } from "react";
import type { DecorItem, SlotType } from "../../../components/minihome/mini-home/DecorationModal";
import type { UserItem } from "../../../types/minihome/item";
import type { EquipItem } from "../../../types/minihome/minihome";
import { useNotification } from "../../../contexts/NotificationContext";
import { updateMyCatAppearance } from "../../../api/minihome/miniHomeApi";
import { buildEquipmentsPayload, getMyUserItems, saveMyEquipments } from "../../../api/minihome/itemApi";
import { emptySlotRecord, GOCAT_SLOTS } from "../../../utils/minihome/gocat/gocatSlots";
import { equipPreviewFromDraft } from "../../../utils/minihome/gocat/items";
import {
  listDecorItemsForSlot,
  resolveOwnedItemId,
  type DecorItemWithOwnership,
} from "../../../utils/minihome/gocat/decorItemCatalog";
import { saveStoredEquipped, sanitizeEquipDraft } from "../../../utils/minihome/gocat/gocatEquippedStorage";
import {
  loadNormalizedEquipDraft,
  normalizeEquipDraft,
  persistMigratedEquipDraft,
  runEquipStorageMigrationIfNeeded,
} from "../../../utils/minihome/gocat/gocatEquipMigration";
import { filterOwnedUserItems } from "../../../utils/minihome/gocat/gocatItemCatalog";
import {
  buildCatalogLockRows,
  logGoCatLockAudit,
  readLocalStorageEquippedRaw,
} from "../../../utils/minihome/gocat/gocatLockDebug";
import { resetGoCatDecorationForLockTest } from "../../../utils/minihome/gocat/gocatLockTestReset";
import { toPresentationAppearancePayload } from "../../../utils/minihome/cat-tower/catTowerPresentation";
import type { GrowthStage } from "../../../utils/minihome/growth/growth";
import { mapMiniHomeApiError } from "../../../utils/minihome/core/minihomeApiError";
import { findCatalogItemById, lockedItemToastMessage } from "../../../utils/minihome/gocat/gocatItemCatalog";
import { canEquipDecorItem } from "../../../utils/minihome/gocat/gocatEquipRules";

type UseGoCatDecorationOptions = {
  pageEquips?: EquipItem[] | null;
  appearanceState?: Record<string, unknown> | null;
  goCatId?: number | null;
  canEdit?: boolean;
  activityCount?: number;
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
  const [rawUserItems, setRawUserItems] = useState<UserItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsLoadError, setItemsLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveInfo, setSaveInfo] = useState<string | null>(null);
  const [decorationErr, setDecorationErr] = useState<string | null>(null);

  const activityCount = options.activityCount ?? 0;

  const loadDraft = useCallback(
    (items: UserItem[]) => {
      const filtered = filterOwnedUserItems(items);
      return loadNormalizedEquipDraft(options.pageEquips, options.appearanceState, {
        useLocalStorage: options.canEdit !== false,
        growthStage,
        ownedItems: filtered,
      });
    },
    [options.pageEquips, options.appearanceState, options.canEdit, growthStage]
  );

  const [selectedEquipment, setSelectedEquipment] = useState<Record<SlotType, DecorItem | null>>(
    () => emptySlotRecord<DecorItem>()
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

    runEquipStorageMigrationIfNeeded();

    void getMyUserItems()
      .then((items) => {
        if (cancelled) return;
        const filtered = filterOwnedUserItems(items);
        setRawUserItems(items);
        setOwnedItems(filtered);
        const rawDraft = loadDraft(filtered);
        const draft = persistMigratedEquipDraft(rawDraft, filtered, growthStage);
        setSelectedEquipment(draft);

        logGoCatLockAudit({
          source: "useGoCatDecoration (decorate modal open)",
          growthStage,
          rawUserItems: items,
          pageEquips: options.pageEquips,
          appearanceState: options.appearanceState,
          equipDraft: draft,
          localStorageEquipped: readLocalStorageEquippedRaw(),
        });
      })
      .catch((e) => {
        if (cancelled) return;
        setItemsLoadError(mapMiniHomeApiError(e, "아이템 목록을 불러오지 못했습니다."));
        setRawUserItems([]);
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
    (targetSlot: SlotType) =>
      listDecorItemsForSlot(targetSlot, growthStage, ownedItems),
    [ownedItems, growthStage]
  );

  const itemsForSlot = useMemo(
    () => (decorateOpen ? filterItemsForSlot(slot) : []),
    [decorateOpen, filterItemsForSlot, slot]
  );

  const emptySlotFlags = useMemo(
    () => ({
      HEAD: !itemsLoading && !itemsLoadError,
      FACE: !itemsLoading && !itemsLoadError,
      NECK: !itemsLoading && !itemsLoadError,
    }),
    [itemsLoading, itemsLoadError]
  );

  const itemsBySlot = useMemo(() => {
    if (!decorateOpen) {
      return { HEAD: [], FACE: [], NECK: [] } as const;
    }
    return {
      HEAD: filterItemsForSlot("HEAD"),
      FACE: filterItemsForSlot("FACE"),
      NECK: filterItemsForSlot("NECK"),
    };
  }, [decorateOpen, filterItemsForSlot]);

  const itemsEmptyBySlot = useMemo(
    () => ({
      HEAD: emptySlotFlags.HEAD && itemsBySlot.HEAD.length === 0,
      FACE: emptySlotFlags.FACE && itemsBySlot.FACE.length === 0,
      NECK: emptySlotFlags.NECK && itemsBySlot.NECK.length === 0,
    }),
    [emptySlotFlags, itemsBySlot]
  );

  const itemsEmptyForSlot =
    !decorateOpen || (!itemsLoading && !itemsLoadError && itemsForSlot.length === 0);

  const equipPreview = useMemo(
    () => equipPreviewFromDraft(selectedEquipment, ownedItems, growthStage),
    [selectedEquipment, ownedItems, growthStage]
  );

  const selectEquipment = useCallback((s: SlotType, item: DecorItem | null) => {
    setSelectedEquipment((prev) => ({ ...prev, [s]: item }));
  }, []);

  const toggleSlotItem = useCallback(
    (s: SlotType, item: DecorItemWithOwnership) => {
      if (item.slotLocked || item.locked || !item.owned || !item.isUnlocked) {
        const entry = findCatalogItemById(item.itemCode);
        toast(
          entry
            ? lockedItemToastMessage(entry)
            : (item.unlockHint ?? "행사 참여 후 획득할 수 있어요."),
          "info"
        );
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

    const before = selectedEquipment;
    const draft = normalizeEquipDraft(selectedEquipment, ownedItems, growthStage);
    setSelectedEquipment(draft);

    const strippedLocked = GOCAT_SLOTS.filter((slot) => {
      const b = before[slot];
      const a = draft[slot];
      return b?.itemCode && b.itemCode !== a?.itemCode && !canEquipDecorItem(b, ownedItems, growthStage);
    });
    if (strippedLocked.length > 0) {
      toast("잠긴 아이템은 저장할 수 없어요.", "info");
    }

    const localOk = saveStoredEquipped(draft);
    if (!localOk) {
      const msg = "장착 정보를 기기에 저장하지 못했습니다.";
      setDecorationErr(msg);
      toast(msg, "error");
      setSaving(false);
      return false;
    }

    try {
      const slotIds = Object.fromEntries(
        GOCAT_SLOTS.map((slot) => [slot, resolveOwnedItemId(draft[slot], rawUserItems)])
      ) as Record<typeof GOCAT_SLOTS[number], number | null>;
      await saveMyEquipments(buildEquipmentsPayload(slotIds));
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
  }, [selectedEquipment, ownedItems, rawUserItems, growthStage, canEdit, toast, options]);

  const logLockStateToConsole = useCallback(() => {
    logGoCatLockAudit({
      source: "manual logLockStateToConsole",
      growthStage,
      rawUserItems: rawUserItems.length ? rawUserItems : ownedItems,
      pageEquips: options.pageEquips,
      appearanceState: options.appearanceState,
      equipDraft: selectedEquipment,
      localStorageEquipped: readLocalStorageEquippedRaw(),
    });
    console.table(buildCatalogLockRows(growthStage, rawUserItems.length ? rawUserItems : ownedItems));
  }, [
    growthStage,
    rawUserItems,
    ownedItems,
    options.pageEquips,
    options.appearanceState,
    selectedEquipment,
  ]);

  const resetLockTestData = useCallback(async () => {
    if (!canEdit) {
      toast("본인 캣타워에서만 초기화할 수 있어요.", "warning");
      return;
    }
    setSaving(true);
    try {
      const { draft } = await resetGoCatDecorationForLockTest(growthStage, {
        pageEquips: options.pageEquips,
        appearanceState: options.appearanceState,
      });
      const items = await getMyUserItems();
      setRawUserItems(items);
      setOwnedItems(filterOwnedUserItems(items));
      setSelectedEquipment(draft);
      options.onEquippedSaved?.(draft);
      toast("꾸미기 데이터를 기본(마녀 모자·목 리본)만 남기고 초기화했어요.", "success");
    } catch (e) {
      toast(mapMiniHomeApiError(e, "초기화에 실패했습니다."), "error");
    } finally {
      setSaving(false);
    }
  }, [canEdit, growthStage, options, toast]);

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
    logLockStateToConsole,
    resetLockTestData,
    canEdit,
    goCatId: options.goCatId ?? null,
  };
}
