import type { DecorItem, SlotType } from "../../components/minihome/DecorationModal";
import type { EquipItem } from "../../types/minihome/minihome";
import {
  draftFromEquips,
  emptyDraft,
  equipItemsFromDraft,
  equipPreviewFromDraft,
  normalizeEquipPreview,
  type EquipPreview,
} from "./items";
import { GOCAT_ITEMS, isGoCatSlotEnabled } from "../../data/gocatItems";
import type { GoCatItemCategory } from "../../data/gocatItems";
import { findCatalogItem } from "./decorItemCatalog";
import { equipDraftFromAppearanceState } from "./catTowerPresentation";
import { sanitizeEquipDraft } from "./gocatMvp";

export { sanitizeEquipDraft, stripDraftToMvpHead } from "./gocatMvp";

export const GOCAT_EQUIPPED_STORAGE_KEY = "gocat_equipped_items";

export type StoredEquippedSlotItem = {
  id: number;
  name: string;
  type: SlotType;
  imageUrl: string;
  itemCode?: string;
};

export type StoredEquippedItems = Record<SlotType, StoredEquippedSlotItem | null>;

const SLOTS: SlotType[] = ["HEAD", "BODY", "ACCESSORY"];

function isSlotType(v: unknown): v is SlotType {
  return v === "HEAD" || v === "BODY" || v === "ACCESSORY";
}

function parseStoredSlot(raw: unknown): StoredEquippedSlotItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const type = o.type;
  if (!isSlotType(type) || !isGoCatSlotEnabled(type as GoCatItemCategory)) return null;
  const catalog = findCatalogItem(
    typeof o.id === "number" ? o.id : Number(o.id),
    typeof o.itemCode === "string" ? o.itemCode : undefined
  );
  if (!catalog || catalog.category !== type) return null;

  return {
    id: GOCAT_ITEMS.findIndex((i) => i.id === catalog.id) + 1,
    name: catalog.name,
    type,
    imageUrl: catalog.imageUrl,
    itemCode: catalog.id,
  };
}

export function emptyStoredEquipped(): StoredEquippedItems {
  return { HEAD: null, BODY: null, ACCESSORY: null };
}

export function loadStoredEquipped(): StoredEquippedItems {
  if (typeof window === "undefined") return emptyStoredEquipped();
  try {
    const raw = window.localStorage.getItem(GOCAT_EQUIPPED_STORAGE_KEY);
    if (!raw) return emptyStoredEquipped();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out = emptyStoredEquipped();
    for (const slot of SLOTS) {
      out[slot] = parseStoredSlot(parsed[slot]);
    }
    return out;
  } catch (e) {
    console.warn("[GoCat] loadStoredEquipped failed", e);
    return emptyStoredEquipped();
  }
}

export function hasStoredEquippedState(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(GOCAT_EQUIPPED_STORAGE_KEY) != null;
}

export function storedToDecorDraft(stored: StoredEquippedItems): Record<SlotType, DecorItem | null> {
  const draft = emptyDraft();
  for (const slot of SLOTS) {
    const item = stored[slot];
    if (!item) continue;
    draft[slot] = {
      userItemId: item.id,
      itemId: item.id,
      itemCode: item.itemCode ?? `LOCAL_${item.id}`,
      itemName: item.name,
      itemType: item.type,
      imageUrl: item.imageUrl,
      acquiredAt: "",
      slotType: item.type,
    };
  }
  return draft;
}

export function decorDraftToStored(draft: Record<SlotType, DecorItem | null>): StoredEquippedItems {
  const stored = emptyStoredEquipped();
  const safe = sanitizeEquipDraft(draft);
  for (const slot of SLOTS) {
    const item = safe[slot];
    if (!item) continue;
    const catalog = findCatalogItem(item.itemId, item.itemCode);
    const imageUrl = item.imageUrl?.trim() || catalog?.imageUrl;
    if (!imageUrl) continue;
    stored[slot] = {
      id: item.itemId,
      name: item.itemName?.trim() || catalog?.name || "아이템",
      type: slot,
      imageUrl,
      itemCode: item.itemCode ?? catalog?.id ?? undefined,
    };
  }
  return stored;
}

export function saveStoredEquipped(draft: Record<SlotType, DecorItem | null>): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(GOCAT_EQUIPPED_STORAGE_KEY, JSON.stringify(decorDraftToStored(draft)));
    return true;
  } catch (e) {
    console.warn("[GoCat] saveStoredEquipped failed", e);
    return false;
  }
}

export type LoadEquippedDecorDraftOptions = {
  /** false — 다른 유저 CatTower: localStorage 미사용, API(appearance·activeEquips)만 */
  useLocalStorage?: boolean;
};

export function loadEquippedDecorDraft(
  pageEquips?: EquipItem[] | null,
  appearanceState?: Record<string, unknown> | null,
  options?: LoadEquippedDecorDraftOptions
): Record<SlotType, DecorItem | null> {
  const useLocalStorage = options?.useLocalStorage !== false;

  if (useLocalStorage && hasStoredEquippedState()) {
    return sanitizeEquipDraft(storedToDecorDraft(loadStoredEquipped()));
  }

  const fromAppearance = equipDraftFromAppearanceState(appearanceState);
  if (fromAppearance.HEAD || fromAppearance.ACCESSORY) {
    return sanitizeEquipDraft(fromAppearance);
  }

  return sanitizeEquipDraft(draftFromEquips(pageEquips));
}

export function activeEquipsFromStoredOrDraft(
  draft: Record<SlotType, DecorItem | null>
): EquipItem[] {
  return equipItemsFromDraft(sanitizeEquipDraft(draft));
}

/** 다른 유저 CatTower — API 장착·appearance만 (localStorage 미사용) */
export function ownerEquipPreviewFromPage(
  pageEquips?: EquipItem[] | null,
  appearanceState?: Record<string, unknown> | null
): EquipPreview {
  const draft = loadEquippedDecorDraft(pageEquips, appearanceState, {
    useLocalStorage: false,
  });
  return normalizeEquipPreview(equipPreviewFromDraft(draft));
}
