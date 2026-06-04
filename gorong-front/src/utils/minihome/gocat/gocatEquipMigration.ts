import type { DecorItem, SlotType } from "../../../components/minihome/mini-home/DecorationModal";
import type { EquipItem } from "../../../types/minihome/minihome";
import type { UserItem } from "../../../types/minihome/item";
import type { GrowthStage } from "../growth/growth";
import { sanitizeEquipDraft } from "./gocatEquipRules";
import { filterOwnedUserItems } from "./gocatItemCatalog";
import { GOCAT_SLOTS } from "./gocatSlots";
import {
  GOCAT_EQUIPPED_STORAGE_KEY,
  loadEquippedDecorDraft,
  saveStoredEquipped,
} from "./gocatEquippedStorage";

/** 버전 올리면 legacy localStorage 장착 초기화 */
export const GOCAT_EQUIP_STORAGE_VERSION = 6;
const VERSION_KEY = "gocat_equip_storage_version";

export function runEquipStorageMigrationIfNeeded(): void {
  if (typeof window === "undefined") return;
  try {
    const ver = Number(window.localStorage.getItem(VERSION_KEY) ?? "0");
    if (ver >= GOCAT_EQUIP_STORAGE_VERSION) return;
    window.localStorage.removeItem(GOCAT_EQUIPPED_STORAGE_KEY);
    window.localStorage.setItem(VERSION_KEY, String(GOCAT_EQUIP_STORAGE_VERSION));
  } catch {
    /* ignore */
  }
}

/** 빈 슬롯 유지 — 기본 아이템 자동 장착 없음 */
export function normalizeEquipDraft(
  draft: Record<SlotType, DecorItem | null>,
  ownedItems: UserItem[],
  growthStage: GrowthStage
): Record<SlotType, DecorItem | null> {
  const filtered = filterOwnedUserItems(ownedItems);
  return sanitizeEquipDraft(draft, filtered, growthStage);
}

/** @deprecated normalizeEquipDraft 사용 (기본 아이템 자동 채움 제거) */
export function normalizeEquipDraftWithDefaults(
  draft: Record<SlotType, DecorItem | null>,
  ownedItems: UserItem[],
  growthStage: GrowthStage
): Record<SlotType, DecorItem | null> {
  return normalizeEquipDraft(draft, ownedItems, growthStage);
}

export function loadNormalizedEquipDraft(
  pageEquips?: EquipItem[] | null,
  appearanceState?: Record<string, unknown> | null,
  options?: {
    useLocalStorage?: boolean;
    growthStage?: GrowthStage;
    ownedItems?: UserItem[];
  }
): Record<SlotType, DecorItem | null> {
  runEquipStorageMigrationIfNeeded();

  const growthStage = options?.growthStage ?? "BASIC";
  const filtered = filterOwnedUserItems(options?.ownedItems ?? []);

  const raw = loadEquippedDecorDraft(pageEquips, appearanceState, {
    useLocalStorage: options?.useLocalStorage !== false,
    growthStage,
    ownedItems: filtered,
  });

  return normalizeEquipDraft(raw, filtered, growthStage);
}

export function persistMigratedEquipDraft(
  draft: Record<SlotType, DecorItem | null>,
  ownedItems: UserItem[],
  growthStage: GrowthStage
): Record<SlotType, DecorItem | null> {
  const normalized = normalizeEquipDraft(draft, ownedItems, growthStage);
  saveStoredEquipped(normalized);
  return normalized;
}

/** @deprecated normalizeEquipDraft 사용 */
export function sanitizeEquipToDefaultsOnly(
  draft: Record<SlotType, DecorItem | null>,
  ownedItems: UserItem[],
  growthStage: GrowthStage,
  _options?: { clearLocalStorage?: boolean }
): Record<SlotType, DecorItem | null> {
  return normalizeEquipDraft(draft, ownedItems, growthStage);
}

/** @deprecated sanitizeEquipToDefaultsOnly */
export const resetLegacyEquipForLockTest = sanitizeEquipToDefaultsOnly;
