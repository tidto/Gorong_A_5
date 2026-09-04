import type { DecorItem } from "../../../components/minihome/mini-home/DecorationModal";
import { isGoCatSlotEnabled } from "../../../data/minihome/gocatItems";
import type { UserItem } from "../../../types/minihome/item";
import type { GrowthStage } from "../growth/growth";
import { isSlotUnlockedByStage } from "../growth/growth";
import { findCatalogItem, itemCodesMatch } from "./decorItemCatalog";
import { normalizeEquipDraft } from "./gocatEquipMigration";
import {
  filterOwnedUserItems,
  findCatalogItemById,
  GOCAT_DEBUG_UNLOCK_ALL,
  isItemEquippableInUI,
} from "./gocatItemCatalog";
import type { SlotType } from "./gocatSlots";
import { emptySlotRecord, GOCAT_SLOTS, resolveItemSlot } from "./gocatSlots";

/** 장착·저장 가능 여부 (꾸미기 잠금 디버그·sanitize와 동일 규칙) */
export function canEquipDecorItem(
  item: DecorItem | null,
  ownedItems: UserItem[],
  growthStage: GrowthStage
): boolean {
  if (!item) return false;
  const slot = resolveItemSlot(item.itemCode, item.slotType) ?? item.slotType;
  if (!slot || !isGoCatSlotEnabled(slot)) return false;
  if (!isSlotUnlockedByStage(slot, growthStage)) return false;
  const entry = findCatalogItemById(item.itemCode);
  if (GOCAT_DEBUG_UNLOCK_ALL && entry) {
    return Boolean(findCatalogItem(item.itemId, item.itemCode));
  }
  if (entry) {
    return (
      isItemEquippableInUI(entry, growthStage, ownedItems) &&
      Boolean(findCatalogItem(item.itemId, item.itemCode))
    );
  }
  if (GOCAT_DEBUG_UNLOCK_ALL) return Boolean(findCatalogItem(item.itemId, item.itemCode));
  const filtered = filterOwnedUserItems(ownedItems);
  if (!filtered.some((o) => itemCodesMatch(o.itemCode, item.itemCode))) return false;
  return Boolean(findCatalogItem(item.itemId, item.itemCode));
}

export function sanitizeEquipDraftForDisplay(
  draft: Record<SlotType, DecorItem | null>,
  growthStage: GrowthStage = "BASIC"
): Record<SlotType, DecorItem | null> {
  return normalizeEquipDraft(draft, [], growthStage);
}

/** 보유(user_item + 기본) 아이템만 장착 유지 */
export function sanitizeEquipDraft(
  draft: Record<SlotType, DecorItem | null>,
  ownedItems: UserItem[] = [],
  growthStage: GrowthStage = "BASIC"
): Record<SlotType, DecorItem | null> {
  const out = emptySlotRecord<DecorItem>();
  for (const slot of GOCAT_SLOTS) {
    const item = draft[slot];
    out[slot] = canEquipDecorItem(item, ownedItems, growthStage)
      ? item
        ? { ...item, slotType: slot }
        : null
      : null;
  }
  return out;
}
