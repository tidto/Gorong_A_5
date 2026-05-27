import type { DecorItem, SlotType } from "../../components/minihome/DecorationModal";
import {
  GOCAT_ITEMS,
  type GoCatItem,
  type GoCatItemCategory,
  getGoCatItemsByCategory,
  findGoCatItem,
  findGoCatItemByCode,
} from "../../data/gocatItems";
import type { GrowthStage } from "./growth";
import { isItemSlotCompatible, isItemUnlockedByStage } from "./growth";
import type { UserItem } from "../../types/minihome/item";

export type { GoCatItem, GoCatItemCategory };
export { GOCAT_ITEMS, getGoCatItemsByCategory, findGoCatItem, findGoCatItemByCode };

/** @deprecated GoCatItem 사용 */
export type DecorCatalogItem = {
  id: number;
  name: string;
  type: SlotType;
  imageUrl: string;
  itemCode?: string;
  requiredGrowthStage?: GrowthStage;
};

function goCatItemIndex(item: GoCatItem): number {
  return GOCAT_ITEMS.findIndex((i) => i.id === item.id);
}

export function goCatItemToDecorItem(item: GoCatItem): DecorItem {
  const index = goCatItemIndex(item);
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
  if (itemCode?.trim()) {
    const byCode = findGoCatItemByCode(itemCode);
    if (byCode) return byCode;
  }
  if (itemId != null && itemId > 0) {
    return GOCAT_ITEMS[itemId - 1];
  }
  return undefined;
}

/** @deprecated goCatItemToDecorItem 사용 */
export function catalogItemToDecorItem(item: DecorCatalogItem): DecorItem {
  const goCat = GOCAT_ITEMS.find((i) => i.id === item.itemCode?.toLowerCase()) ?? GOCAT_ITEMS[item.id - 1];
  if (goCat) return goCatItemToDecorItem(goCat);
  return {
    userItemId: item.id,
    itemId: item.id,
    itemCode: item.itemCode ?? `CATALOG_${item.id}`,
    itemName: item.name,
    itemType: item.type,
    imageUrl: item.imageUrl,
    acquiredAt: "",
    slotType: item.type,
    requiredGrowthStage: item.requiredGrowthStage,
  };
}

function inferSlotFromItemType(itemType?: string | null): SlotType | undefined {
  const t = (itemType ?? "").trim().toUpperCase();
  if (t.includes("HEAD") || t === "HAT") return "HEAD";
  if (t.includes("BODY") || t === "OUTFIT") return "BODY";
  if (t.includes("ACCESSORY") || t.includes("ACC")) return "ACCESSORY";
  return undefined;
}

function userItemToDecorItem(item: UserItem): DecorItem {
  const slot =
    inferSlotFromItemType(item.itemType) ??
    (item.itemType?.trim().toUpperCase() === "HEAD" ||
    item.itemType?.trim().toUpperCase() === "BODY" ||
    item.itemType?.trim().toUpperCase() === "ACCESSORY"
      ? (item.itemType.trim().toUpperCase() as SlotType)
      : undefined);
  return { ...item, slotType: slot };
}

function dedupeDecorItems(items: DecorItem[]): DecorItem[] {
  const seen = new Set<string>();
  const out: DecorItem[] = [];
  for (const it of items) {
    const key = it.itemCode ?? String(it.itemId);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

/** 정적 GOCAT_ITEMS 기반 — DB/API 보유 아이템은 MVP에서 제외 */
export function listDecorItemsForSlot(
  targetSlot: SlotType,
  growthStage: GrowthStage,
  _ownedItems: UserItem[] = []
): DecorItem[] {
  return dedupeDecorItems(
    getGoCatItemsByCategory(targetSlot)
      .map(goCatItemToDecorItem)
      .filter((it) => {
        const slot = it.slotType;
        if (!slot || slot !== targetSlot) return false;
        if (!isItemSlotCompatible(slot, growthStage)) return false;
        return isItemUnlockedByStage(it.requiredGrowthStage, growthStage);
      })
  );
}
