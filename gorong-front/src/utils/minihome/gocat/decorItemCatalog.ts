import type { DecorItem, SlotType } from "../../../components/minihome/mini-home/DecorationModal";
import {
  GOCAT_ITEMS,
  type GoCatItem,
  type GoCatItemCategory,
  getGoCatItemsByCategory,
  findGoCatItem,
  findGoCatItemByCode,
} from "../../../data/minihome/gocatItems";
import type { GrowthStage } from "../growth/growth";
import { isSlotUnlockedByStage, slotUnlockHint } from "../growth/growth";
import type { UserItem } from "../../../types/minihome/item";
import type { ItemRarity } from "./itemRarity";
import {
  GOCAT_DEBUG_UNLOCK_ALL,
  GOCAT_ITEM_CATALOG,
  filterOwnedUserItems,
  findCatalogItemById,
  isItemEquippableInUI,
  type GoCatCatalogItem,
  type UnlockType,
} from "./gocatItemCatalog";
import { resolveItemSlot } from "./gocatSlots";

export type { GoCatItem, GoCatItemCategory };
export { GOCAT_ITEMS, getGoCatItemsByCategory, findGoCatItem, findGoCatItemByCode };

export type DecorItemWithOwnership = DecorItem & {
  owned: boolean;
  isDefault?: boolean;
  isUnlocked?: boolean;
  locked?: boolean;
  slotLocked?: boolean;
  unlockHint?: string;
  unlockType?: UnlockType;
  rarity?: ItemRarity;
};

export function normalizeItemCode(code?: string | null): string {
  return (code ?? "").trim().toLowerCase().replace(/-/g, "_");
}

export function itemCodesMatch(a?: string | null, b?: string | null): boolean {
  return normalizeItemCode(a) === normalizeItemCode(b);
}

export function resolveOwnedItemId(
  decor: DecorItem | null,
  ownedItems: UserItem[]
): number | null {
  if (!decor) return null;
  const code = decor.itemCode?.trim();
  if (!code) return null;
  const owned = ownedItems.find((o) => itemCodesMatch(o.itemCode, code));
  if (owned?.itemId) return owned.itemId;
  if (GOCAT_DEBUG_UNLOCK_ALL && decor.itemId && decor.itemId > 0) return decor.itemId;
  return null;
}

export type DecorCatalogItem = {
  id: number;
  name: string;
  type: SlotType;
  imageUrl: string;
  itemCode?: string;
};

export function catalogEntryToDecorItem(entry: GoCatCatalogItem): DecorItem {
  const index = GOCAT_ITEM_CATALOG.findIndex((e) => e.id === entry.id);
  const itemId = index >= 0 ? index + 1 : 0;
  return {
    userItemId: itemId,
    itemId,
    itemCode: entry.id,
    itemName: entry.name,
    itemType: entry.slot,
    imageUrl: entry.imageUrl,
    acquiredAt: "",
    slotType: entry.slot,
  };
}

/** @deprecated catalogEntryToDecorItem */
export function rewardEntryToDecorItem(entry: GoCatCatalogItem): DecorItem {
  return catalogEntryToDecorItem(entry);
}

export function goCatItemToDecorItem(item: GoCatItem): DecorItem {
  const entry = findCatalogItemById(item.id);
  if (entry) return catalogEntryToDecorItem(entry);
  const index = GOCAT_ITEMS.findIndex((i) => i.id === item.id);
  const itemId = index >= 0 ? index + 1 : 0;
  return {
    userItemId: itemId,
    itemId,
    itemCode: item.id,
    itemName: item.name,
    itemType: item.category,
    imageUrl: item.imageUrl,
    acquiredAt: "",
    slotType: item.category,
  };
}

export function findCatalogItem(
  itemId?: number | null,
  itemCode?: string | null
): GoCatItem | undefined {
  const entry = findCatalogItemById(itemCode);
  if (entry) {
    return {
      id: entry.id,
      name: entry.name,
      category: entry.slot,
      imageUrl: entry.imageUrl,
    };
  }
  if (itemCode?.trim()) {
    const byCode = findGoCatItemByCode(itemCode);
    if (byCode) return byCode;
  }
  if (itemId != null && itemId > 0) {
    const byIndex = GOCAT_ITEMS[itemId - 1];
    if (byIndex) return byIndex;
    const cat = GOCAT_ITEM_CATALOG[itemId - 1];
    if (cat) {
      return { id: cat.id, name: cat.name, category: cat.slot, imageUrl: cat.imageUrl };
    }
  }
  return undefined;
}

function buildDecorOwnership(
  decor: DecorItem,
  entry: GoCatCatalogItem | undefined,
  growthStage: GrowthStage,
  ownedItems: UserItem[]
): DecorItemWithOwnership {
  const slot = decor.slotType;
  const slotLocked = slot ? !isSlotUnlockedByStage(slot, growthStage) : false;
  const filteredOwned = filterOwnedUserItems(ownedItems);
  const equippable = entry
    ? isItemEquippableInUI(entry, growthStage, filteredOwned)
    : filteredOwned.some((o) => itemCodesMatch(o.itemCode, decor.itemCode)) && !slotLocked;

  let unlockHint = entry?.unlockCondition ?? "조건 달성 후 획득";
  if (slotLocked && slot) {
    unlockHint = slotUnlockHint(slot, growthStage) ?? unlockHint;
  }

  return {
    ...decor,
    owned: equippable,
    isDefault: entry?.isDefault,
    isUnlocked: equippable,
    locked: !equippable,
    slotLocked,
    unlockHint,
    unlockType: entry?.unlockType,
    rarity: entry?.rarity,
  };
}

function dedupeDecorItems(items: DecorItem[]): DecorItem[] {
  const seen = new Set<string>();
  const out: DecorItem[] = [];
  for (const it of items) {
    const key = normalizeItemCode(it.itemCode) || String(it.itemId);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

export function listDecorItemsForSlot(
  targetSlot: SlotType,
  growthStage: GrowthStage,
  ownedItems: UserItem[] = []
): DecorItemWithOwnership[] {
  const filteredOwned = filterOwnedUserItems(ownedItems);
  return GOCAT_ITEM_CATALOG.filter((e) => e.slot === targetSlot)
    .map((entry) => catalogEntryToDecorItem(entry))
    .map((it) => buildDecorOwnership(it, findCatalogItemById(it.itemCode), growthStage, filteredOwned));
}

export function listCodexItems(
  growthStage: GrowthStage,
  ownedItems: UserItem[] = []
): DecorItemWithOwnership[] {
  const filteredOwned = filterOwnedUserItems(ownedItems);
  return GOCAT_ITEM_CATALOG.map((entry) =>
    buildDecorOwnership(catalogEntryToDecorItem(entry), entry, growthStage, filteredOwned)
  );
}
