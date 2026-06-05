import type { DecorItem, SlotType } from "../../../components/minihome/mini-home/DecorationModal";
import type { EquipItem } from "../../../types/minihome/minihome";
import {
  draftFromEquips,
  emptyDraft,
  equipItemsFromDraft,
  equipPreviewFromDraft,
  normalizeEquipPreview,
  type EquipPreview,
} from "./items";
import { isGoCatSlotEnabled } from "../../../data/minihome/gocatItems";
import type { GoCatItemCategory } from "../../../data/minihome/gocatItems";
import { findCatalogItem } from "./decorItemCatalog";
import { equipDraftFromAppearanceState } from "../cat-tower/catTowerPresentation";
import {
  sanitizeEquipDraft,
  sanitizeEquipDraftForDisplay,
} from "./gocatEquipRules";
import { draftFromEquips } from "./items";
import type { GrowthStage } from "../growth/growth";
import type { UserItem } from "../../../types/minihome/item";
import { GOCAT_SLOTS, resolveItemSlot } from "./gocatSlots";

export { sanitizeEquipDraft, stripDraftToMvpHead } from "./gocatMvp";
export { sanitizeEquipDraftForDisplay } from "./gocatEquipRules";

export const GOCAT_EQUIPPED_STORAGE_KEY = "gocat_equipped_items";

export type StoredEquippedSlotItem = {
  id: number;
  name: string;
  type: SlotType;
  imageUrl: string;
  itemCode?: string;
};

export type StoredEquippedItems = Record<SlotType, StoredEquippedSlotItem | null>;

function parseStoredSlot(raw: unknown): StoredEquippedSlotItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const legacyType = typeof o.type === "string" ? o.type : "";
  const itemCode = typeof o.itemCode === "string" ? o.itemCode : undefined;
  const slot = resolveItemSlot(itemCode, legacyType);
  if (!slot || !isGoCatSlotEnabled(slot as GoCatItemCategory)) return null;

  const catalog = findCatalogItem(
    typeof o.id === "number" ? o.id : Number(o.id),
    itemCode
  );
  if (!catalog) return null;

  return {
    id: typeof o.id === "number" ? o.id : Number(o.id) || 1,
    name: catalog.name,
    type: slot,
    imageUrl: catalog.imageUrl,
    itemCode: catalog.id,
  };
}

export function emptyStoredEquipped(): StoredEquippedItems {
  return { HEAD: null, FACE: null, NECK: null };
}

export function loadStoredEquipped(): StoredEquippedItems {
  if (typeof window === "undefined") return emptyStoredEquipped();
  try {
    const raw = window.localStorage.getItem(GOCAT_EQUIPPED_STORAGE_KEY);
    if (!raw) return emptyStoredEquipped();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out = emptyStoredEquipped();

    for (const key of Object.keys(parsed)) {
      const item = parseStoredSlot(parsed[key]);
      if (item) out[item.type] = item;
    }

    for (const slot of GOCAT_SLOTS) {
      if (!out[slot] && parsed[slot]) {
        out[slot] = parseStoredSlot(parsed[slot]);
      }
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
  for (const slot of GOCAT_SLOTS) {
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
      slotType: slot,
    };
  }
  return draft;
}

export function decorDraftToStored(draft: Record<SlotType, DecorItem | null>): StoredEquippedItems {
  const stored = emptyStoredEquipped();
  for (const slot of GOCAT_SLOTS) {
    const item = draft[slot];
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
  useLocalStorage?: boolean;
  growthStage?: GrowthStage;
  ownedItems?: UserItem[];
};

function draftHasAny(draft: Record<SlotType, DecorItem | null>): boolean {
  return GOCAT_SLOTS.some((s) => draft[s]);
}

function mergeEquipDraftFromDb(
  pageEquips?: EquipItem[] | null,
  appearanceState?: Record<string, unknown> | null
): Record<SlotType, DecorItem | null> {
  const fromEquips = draftFromEquips(pageEquips);
  const fromAppearance = equipDraftFromAppearanceState(appearanceState);
  const merged = emptyDraft();

  for (const slot of GOCAT_SLOTS) {
    merged[slot] = fromAppearance[slot] ?? fromEquips[slot] ?? null;
  }

  return merged;
}

function appearanceDefinesSlot(
  state: Record<string, unknown> | null | undefined,
  slot: SlotType
): boolean {
  if (!state) return false;
  if (slot === "HEAD") return "headItemCode" in state || "headItem" in state;
  if (slot === "FACE") return "faceItemCode" in state;
  if (slot === "NECK") return "neckItemCode" in state || "accessoryItemCode" in state || "accessoryItem" in state;
  return false;
}

function mergeEquipDraftFromDbRespectingAppearance(
  pageEquips?: EquipItem[] | null,
  appearanceState?: Record<string, unknown> | null
): Record<SlotType, DecorItem | null> {
  const fromEquips = draftFromEquips(pageEquips);
  const fromAppearance = equipDraftFromAppearanceState(appearanceState);
  const merged = emptyDraft();

  for (const slot of GOCAT_SLOTS) {
    if (appearanceDefinesSlot(appearanceState, slot)) {
      merged[slot] = fromAppearance[slot] ?? null;
    } else {
      merged[slot] = fromEquips[slot] ?? fromAppearance[slot] ?? null;
    }
  }

  return merged;
}

export function loadEquippedDecorDraft(
  pageEquips?: EquipItem[] | null,
  appearanceState?: Record<string, unknown> | null,
  options?: LoadEquippedDecorDraftOptions
): Record<SlotType, DecorItem | null> {
  const useLocalStorage = options?.useLocalStorage !== false;
  const growthStage = options?.growthStage ?? "BASIC";
  const ownedItems = options?.ownedItems ?? [];

  const finalizeForEdit = (draft: Record<SlotType, DecorItem | null>) =>
    sanitizeEquipDraft(draft, ownedItems, growthStage);

  const finalizeForDisplay = (draft: Record<SlotType, DecorItem | null>) =>
    sanitizeEquipDraftForDisplay(draft, growthStage);

  const finalize = useLocalStorage ? finalizeForEdit : finalizeForDisplay;

  const fromDb = mergeEquipDraftFromDbRespectingAppearance(pageEquips, appearanceState);
  if (draftHasAny(fromDb) || appearanceState != null) {
    return finalize(fromDb);
  }

  if (useLocalStorage && hasStoredEquippedState()) {
    return finalize(storedToDecorDraft(loadStoredEquipped()));
  }

  return finalize(mergeEquipDraftFromDb(pageEquips, appearanceState));
}

export function activeEquipsFromStoredOrDraft(
  draft: Record<SlotType, DecorItem | null>
): EquipItem[] {
  return equipItemsFromDraft(sanitizeEquipDraft(draft));
}

export function ownerEquipPreviewFromPage(
  pageEquips?: EquipItem[] | null,
  appearanceState?: Record<string, unknown> | null,
  growthStage: GrowthStage = "BASIC"
): EquipPreview {
  const draft = loadEquippedDecorDraft(pageEquips, appearanceState, {
    useLocalStorage: false,
    growthStage,
  });
  return normalizeEquipPreview(equipPreviewFromDraft(draft));
}
