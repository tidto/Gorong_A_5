import type { DecorItem, SlotType } from "../../../components/minihome/mini-home/DecorationModal";
import type { EquipItem } from "../../../types/minihome/minihome";
import type { UserItem } from "../../../types/minihome/item";
import type { GrowthStage } from "../growth/growth";
import { isSlotUnlockedByStage } from "../growth/growth";
import {
  catalogEntryToDecorItem,
  listDecorItemsForSlot,
  normalizeItemCode,
} from "./decorItemCatalog";
import { canEquipDecorItem } from "./gocatEquipRules";
import {
  DEFAULT_ITEM_IDS,
  filterOwnedUserItems,
  findCatalogItemById,
  GOCAT_ITEM_CATALOG,
  GOCAT_DEBUG_UNLOCK_ALL,
  GOCAT_DEFAULT_ONLY_UNLOCK,
  isCatalogItemOwned,
  isCountableUserItem,
} from "./gocatItemCatalog";
import { GOCAT_SLOTS } from "./gocatSlots";

const LOG_PREFIX = "[GoCat Lock Debug]";

export function isGoCatLockDebugEnabled(): boolean {
  return import.meta.env.DEV;
}

export type CatalogLockRow = {
  itemId: number | null;
  itemCode: string;
  slot: SlotType;
  isDefault: boolean;
  owned: boolean;
  isUnlocked: boolean;
  canEquip: boolean;
  unlockCondition: string;
  inRawUserItem: boolean;
  ui_locked: boolean;
  ui_slotLocked: boolean;
};

export function buildCatalogLockRows(
  growthStage: GrowthStage,
  rawUserItems: UserItem[]
): CatalogLockRow[] {
  const filteredOwned = filterOwnedUserItems(rawUserItems);

  return GOCAT_ITEM_CATALOG.map((entry) => {
    const rawMatch = rawUserItems.find((o) =>
      normalizeItemCode(o.itemCode) === entry.id
    );
    const decor = catalogEntryToDecorItem(entry);
    const uiList = listDecorItemsForSlot(entry.slot, growthStage, filteredOwned);
    const ui = uiList.find((i) => normalizeItemCode(i.itemCode) === entry.id);
    const owned = isCatalogItemOwned(entry, filteredOwned);
    const slotLocked = !isSlotUnlockedByStage(entry.slot, growthStage);
    const canEquip = canEquipDecorItem(decor, filteredOwned, growthStage);

    return {
      itemId: rawMatch?.itemId ?? ui?.itemId ?? null,
      itemCode: entry.id,
      slot: entry.slot,
      isDefault: entry.isDefault,
      owned: ui?.owned ?? owned,
      isUnlocked: ui?.isUnlocked ?? (owned && !slotLocked),
      canEquip,
      unlockCondition: entry.unlockCondition,
      inRawUserItem: Boolean(rawMatch),
      ui_locked: ui?.locked ?? !owned,
      ui_slotLocked: ui?.slotLocked ?? slotLocked,
    };
  });
}

function printRootCauseHints(
  rawUserItems: UserItem[],
  rows: CatalogLockRow[],
  equipDraft?: Record<SlotType, DecorItem | null> | null
): void {
  const wronglyEquippable = rows.filter((r) => !r.isDefault && r.canEquip);
  const inDbNotDefault = rows.filter((r) => r.inRawUserItem && !r.isDefault);
  const draftNonDefault = GOCAT_SLOTS.flatMap((slot) => {
    const it = equipDraft?.[slot];
    if (!it?.itemCode) return [];
    const entry = findCatalogItemById(it.itemCode);
    if (entry?.isDefault) return [];
    return [{ slot, code: it.itemCode }];
  });

  const hints: string[] = [];

  if (!GOCAT_DEFAULT_ONLY_UNLOCK) {
    hints.push("GOCAT_DEFAULT_ONLY_UNLOCK=false → API user_item이 그대로 owned로 반영됩니다.");
  }
  if (inDbNotDefault.length > 0) {
    hints.push(
      `DB user_item에 비기본 아이템 ${inDbNotDefault.length}개 존재 → strict OFF면 UI 해금. codes: ${inDbNotDefault.map((r) => r.itemCode).join(", ")}`
    );
  }
  if (wronglyEquippable.length > 0) {
    hints.push(
      `canEquip=true인 비기본 아이템: ${wronglyEquippable.map((r) => r.itemCode).join(", ")}`
    );
  }
  if (draftNonDefault.length > 0) {
    hints.push(
      `equipDraft에 비기본 장착 잔존: ${draftNonDefault.map((d) => `${d.slot}:${d.code}`).join(", ")} → reset 필요`
    );
  }
  const legacyInRaw = rawUserItems
    .map((o) => normalizeItemCode(o.itemCode))
    .filter((c) => c && !isCountableUserItem(c));
  if (legacyInRaw.length > 0) {
    hints.push(`레거시/비카탈로그 user_item: ${legacyInRaw.join(", ")}`);
  }
  if (hints.length === 0) {
    hints.push("비기본 아이템은 잠금·기본 2개만 장착 가능 상태로 보입니다.");
  }

  console.log("▶ 잠금 미반영 원인 추정:", hints);
}

type LockAuditInput = {
  source: string;
  growthStage: GrowthStage;
  rawUserItems: UserItem[];
  pageEquips?: EquipItem[] | null;
  appearanceState?: Record<string, unknown> | null;
  equipDraft?: Record<SlotType, DecorItem | null>;
  localStorageEquipped?: unknown;
};

export function logGoCatLockAudit(input: LockAuditInput): void {
  if (!isGoCatLockDebugEnabled()) return;

  const rows = buildCatalogLockRows(input.growthStage, input.rawUserItems);

  console.group(`${LOG_PREFIX} ${input.source}`);

  console.log("── 설정 ──");
  console.log({
    debugUnlockAll: GOCAT_DEBUG_UNLOCK_ALL,
    defaultOnlyUnlock: GOCAT_DEFAULT_ONLY_UNLOCK,
    growthStage: input.growthStage,
    defaultItemIds: DEFAULT_ITEM_IDS,
  });

  console.log("── 1) user_item (API 전체) ──");
  console.table(
    input.rawUserItems.map((o) => ({
      itemId: o.itemId,
      itemCode: o.itemCode,
      itemName: o.itemName,
      itemType: o.itemType,
      countable: isCountableUserItem(o.itemCode),
    }))
  );

  console.log("── 2) activeEquips (페이지) ──");
  console.log(input.pageEquips ?? []);

  console.log("── 3) appearanceState ──");
  console.log(input.appearanceState ?? null);

  if (input.localStorageEquipped != null) {
    console.log("── localStorage gocat_equipped_items ──");
    console.log(input.localStorageEquipped);
  }

  console.log("── equipDraft (현재 장착 draft) ──");
  console.log(input.equipDraft ?? null);

  console.log("── 4) 카탈로그별 잠금 상태 ──");
  console.table(
    rows.map((r) => ({
      itemId: r.itemId,
      itemCode: r.itemCode,
      slot: r.slot,
      isDefault: r.isDefault,
      owned: r.owned,
      isUnlocked: r.isUnlocked,
      canEquip: r.canEquip,
      unlockCondition: r.unlockCondition,
      inRawUserItem: r.inRawUserItem,
    }))
  );

  printRootCauseHints(input.rawUserItems, rows, input.equipDraft);
  console.groupEnd();
}

export function readLocalStorageEquippedRaw(): unknown {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("gocat_equipped_items");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
