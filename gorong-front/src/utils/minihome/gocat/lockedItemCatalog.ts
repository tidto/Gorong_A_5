import type { SlotType } from "./gocatSlots";
import type { GrowthStage } from "../growth/growth";
import { listDecorItemsForSlot, type DecorItemWithOwnership } from "./decorItemCatalog";
import type { UserItem } from "../../../types/minihome/item";

/** @deprecated listDecorItemsForSlot 사용 */
export function lockedItemsForSlot(
  slot: SlotType,
  growthStage: GrowthStage,
  ownedItems: UserItem[] = []
): DecorItemWithOwnership[] {
  return listDecorItemsForSlot(slot, growthStage, ownedItems).filter((i) => i.locked);
}
