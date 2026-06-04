import { updateMyCatAppearance } from "../../../api/minihome/miniHomeApi";
import {
  buildEquipmentsPayload,
  getMyUserItems,
  saveMyEquipments,
} from "../../../api/minihome/itemApi";
import type { DecorItem, SlotType } from "../../../components/minihome/mini-home/DecorationModal";
import type { EquipItem } from "../../../types/minihome/minihome";
import type { UserItem } from "../../../types/minihome/item";
import { toPresentationAppearancePayload } from "../cat-tower/catTowerPresentation";
import type { GrowthStage } from "../growth/growth";
import { resolveOwnedItemId } from "./decorItemCatalog";
import { normalizeEquipDraft, persistMigratedEquipDraft } from "./gocatEquipMigration";
import { filterOwnedUserItems } from "./gocatItemCatalog";
import { logGoCatLockAudit, readLocalStorageEquippedRaw } from "./gocatLockDebug";
import { GOCAT_SLOTS } from "./gocatSlots";
import { emptyDraft } from "./items";

export type LockTestResetResult = {
  draft: Record<SlotType, DecorItem | null>;
  rawUserItems: UserItem[];
  filteredOwned: UserItem[];
};

/**
 * 임시 테스트: localStorage·장착 draft를 기본(witch_hat, pink_bow)만 남기고 서버에 저장.
 * user_item 행은 삭제하지 않음 — UI strict 모드로 비기본 보유는 무시.
 */
export async function resetGoCatDecorationForLockTest(
  growthStage: GrowthStage,
  context?: {
    pageEquips?: EquipItem[] | null;
    appearanceState?: Record<string, unknown> | null;
  }
): Promise<LockTestResetResult> {
  const rawUserItems = await getMyUserItems();
  const filteredOwned = filterOwnedUserItems(rawUserItems);

  const normalized = persistMigratedEquipDraft(
    normalizeEquipDraft(emptyDraft(), filteredOwned, growthStage),
    filteredOwned,
    growthStage
  );

  const slotIds = Object.fromEntries(
    GOCAT_SLOTS.map((slot) => [slot, resolveOwnedItemId(normalized[slot], rawUserItems)])
  ) as Record<(typeof GOCAT_SLOTS)[number], number | null>;

  await saveMyEquipments(buildEquipmentsPayload(slotIds));
  await updateMyCatAppearance(toPresentationAppearancePayload(normalized));

  const { saveStoredEquipped } = await import("./gocatEquippedStorage");
  saveStoredEquipped(normalized);

  logGoCatLockAudit({
    source: "resetGoCatDecorationForLockTest (after reset)",
    growthStage,
    rawUserItems,
    pageEquips: context?.pageEquips,
    appearanceState: context?.appearanceState,
    equipDraft: normalized,
    localStorageEquipped: readLocalStorageEquippedRaw(),
  });

  return { draft: normalized, rawUserItems, filteredOwned };
}
