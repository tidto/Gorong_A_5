import { GOCAT_OVERLAY_BASE } from "../../../data/minihome/gocatItems";
import type { GrowthStage } from "../growth/growth";
import { isSlotUnlockedByStage } from "../growth/growth";
import type { SlotType } from "./gocatSlots";
import type { ItemRarity } from "./itemRarity";
import type { UserItem } from "../../../types/minihome/item";
import { itemCodesMatch, normalizeItemCode } from "./decorItemCatalog";

export type UnlockType =
  | "DEFAULT"
  | "EVENT_COUNT"
  | "REVIEW_COUNT"
  | "GUESTBOOK_RECEIVED"
  | "GROWTH_STAGE"
  | "KEYWORD_EVENT";

export type GoCatCatalogItem = {
  id: string;
  name: string;
  slot: SlotType;
  imageUrl: string;
  isDefault: boolean;
  unlockType: UnlockType;
  requiredValue: number | GrowthStage | string;
  unlockCondition: string;
  rarity: ItemRarity;
};

/** 꾸미기 최종 카탈로그 — HEAD 3 · FACE 1 · NECK 1 */
export const GOCAT_ITEM_CATALOG: GoCatCatalogItem[] = [
  {
    id: "witch_hat",
    name: "마녀 모자",
    slot: "HEAD",
    imageUrl: `${GOCAT_OVERLAY_BASE}/witch_hat_aligned.png`,
    isDefault: true,
    unlockType: "DEFAULT",
    requiredValue: 0,
    unlockCondition: "처음부터 보유하는 기본 모자",
    rarity: "COMMON",
  },
  {
    id: "blue_cap",
    name: "파란 캡모자",
    slot: "HEAD",
    imageUrl: `${GOCAT_OVERLAY_BASE}/blue_cap_aligned.png`,
    isDefault: false,
    unlockType: "EVENT_COUNT",
    requiredValue: 1,
    unlockCondition: "행사 1회 참여 시 해금",
    rarity: "COMMON",
  },
  {
    id: "crown",
    name: "왕관",
    slot: "HEAD",
    imageUrl: `${GOCAT_OVERLAY_BASE}/crown_aligned.png`,
    isDefault: false,
    unlockType: "EVENT_COUNT",
    requiredValue: 3,
    unlockCondition: "행사 3회 참여 시 해금",
    rarity: "EPIC",
  },
  {
    id: "round_glasses",
    name: "동그란 안경",
    slot: "FACE",
    imageUrl: `${GOCAT_OVERLAY_BASE}/round_glasses_aligned.png`,
    isDefault: false,
    unlockType: "REVIEW_COUNT",
    requiredValue: 3,
    unlockCondition: "리뷰 3개 작성 시 해금",
    rarity: "COMMON",
  },
  {
    id: "pink_bow",
    name: "목 리본",
    slot: "NECK",
    imageUrl: `${GOCAT_OVERLAY_BASE}/pink_bow_neck_aligned.png`,
    isDefault: true,
    unlockType: "DEFAULT",
    requiredValue: 0,
    unlockCondition: "처음부터 보유하는 기본 액세서리",
    rarity: "COMMON",
  },
];

export const DEFAULT_ITEM_IDS = GOCAT_ITEM_CATALOG.filter((i) => i.isDefault).map((i) => i.id);

/** 실서비스: false 유지. true면 전 아이템 해금(개발용) */
export const GOCAT_DEBUG_UNLOCK_ALL = false;

/** @deprecated GOCAT_DEBUG_UNLOCK_ALL 사용 */
export const GOCAT_DEFAULT_ONLY_UNLOCK = false;

/** @deprecated GOCAT_DEFAULT_ONLY_UNLOCK 사용 */
export const GOCAT_STRICT_LOCK_TEST = GOCAT_DEFAULT_ONLY_UNLOCK;

const CATALOG_ID_SET = new Set(GOCAT_ITEM_CATALOG.map((i) => i.id));

const ITEM_CODE_ALIASES: Record<string, string> = {
  glasses: "round_glasses",
  round_glasses: "round_glasses",
  starter_hat: "witch_hat",
  starter_acc: "pink_bow",
  starter_body: "pink_bow",
};

const LEGACY_ITEM_CODES_BLOCKLIST = new Set([
  "cherry_hat",
  "neon_glasses",
  "event_ribbon",
  "star_necklace",
  "visitor_ribbon",
  "sparkle_crown",
  "bungeoppang_badge",
  "review_star",
  "shell_accessory",
  "starter_hat",
  "starter_body",
  "starter_acc",
]);

export function resolveCatalogItemId(itemCode?: string | null): string {
  const key = (itemCode ?? "").trim().toLowerCase().replace(/-/g, "_");
  if (!key) return "";
  return ITEM_CODE_ALIASES[key] ?? key;
}

export function findCatalogItemById(itemCode?: string | null): GoCatCatalogItem | undefined {
  if (!itemCode?.trim()) return undefined;
  const key = resolveCatalogItemId(itemCode);
  return GOCAT_ITEM_CATALOG.find((e) => e.id === key);
}

export function catalogItemsForSlot(slot: SlotType): GoCatCatalogItem[] {
  return GOCAT_ITEM_CATALOG.filter((i) => i.slot === slot);
}

export function getDefaultCatalogItem(slot: SlotType): GoCatCatalogItem | undefined {
  return GOCAT_ITEM_CATALOG.find((i) => i.isDefault && i.slot === slot);
}

export function isCountableUserItem(itemCode?: string | null): boolean {
  const id = resolveCatalogItemId(itemCode);
  if (GOCAT_DEBUG_UNLOCK_ALL) return Boolean(id && findCatalogItemById(id));
  if (!id || LEGACY_ITEM_CODES_BLOCKLIST.has(id)) return false;
  const entry = findCatalogItemById(id);
  if (!entry) return false;
  return CATALOG_ID_SET.has(entry.id);
}

export function filterOwnedUserItems(ownedItems: UserItem[]): UserItem[] {
  return ownedItems.filter((o) => isCountableUserItem(o.itemCode));
}

/** 기본 아이템은 보유로 간주, 보상은 user_item 있을 때만 */
export function isCatalogItemOwned(item: GoCatCatalogItem, ownedItems: UserItem[]): boolean {
  if (GOCAT_DEBUG_UNLOCK_ALL) return true;
  if (item.isDefault) return true;
  const filtered = filterOwnedUserItems(ownedItems);
  return filtered.some((o) => itemCodesMatch(o.itemCode, item.id));
}

export function isItemEquippableInUI(
  entry: GoCatCatalogItem | undefined,
  growthStage: GrowthStage,
  ownedItems: UserItem[] = []
): boolean {
  if (!entry) return false;
  if (GOCAT_DEBUG_UNLOCK_ALL) return true;
  if (!isSlotUnlockedByStage(entry.slot, growthStage)) return false;
  return isCatalogItemOwned(entry, ownedItems);
}

export function lockedItemToastMessage(item: GoCatCatalogItem): string {
  if (item.isDefault) return "기본 아이템이에요.";
  return `${item.unlockCondition} — 아직 획득하지 않았어요.`;
}
