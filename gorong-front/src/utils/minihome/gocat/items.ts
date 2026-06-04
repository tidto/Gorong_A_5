import type { DecorItem } from "../../../components/minihome/mini-home/DecorationModal";
import type { Equipment, UserItem } from "../../../types/minihome/item";
import type { EquipItem, MiniHomePage } from "../../../types/minihome/minihome";
import { findCatalogItem } from "./decorItemCatalog";
import { normalizeEquipDraft } from "./gocatEquipMigration";
import { sanitizeEquipDraft } from "./gocatMvp";
import type { GrowthStage } from "../growth/growth";
import type { SlotType } from "./gocatSlots";
import { GOCAT_SLOTS, emptySlotRecord, resolveItemSlot } from "./gocatSlots";

export type { SlotType };
export { GOCAT_SLOTS, emptySlotRecord };

export type EquipPreviewItem = {
  itemId?: number | null;
  itemName?: string | null;
  imageUrl?: string | null;
  itemType?: string | null;
  itemCode?: string | null;
};

export type EquipPreview = Record<SlotType, EquipPreviewItem | null>;

export function emptyEquipBySlot(): Record<SlotType, Equipment | null> {
  return emptySlotRecord<Equipment>();
}

export function emptyDraft(): Record<SlotType, DecorItem | null> {
  return emptySlotRecord<DecorItem>();
}

export function equipItemToEquipment(e: EquipItem): Equipment {
  const slot = resolveItemSlot(e.itemCode, e.slotType) ?? normalizeSlot(e.slotType);
  return enrichEquipmentFields({
    catEquipId: e.catEquipId,
    goCatId: 0,
    slotType: slot ?? e.slotType,
    itemId: e.itemId,
    itemCode: e.itemCode,
    itemName: e.itemName,
    itemType: e.itemType,
    imageUrl: e.imageUrl,
    isActive: true,
    equippedAt: e.equippedAt,
  });
}

export function enrichEquipmentFields<T extends EquipPreviewItem>(item: T): T {
  const catalog = findCatalogItem(item.itemId, item.itemCode);
  const code = item.itemCode?.trim().toUpperCase();
  const mappedUrl = code ? STARTER_ITEM_IMAGE_URLS[code] : undefined;
  return {
    ...item,
    itemName: item.itemName?.trim() || catalog?.name || item.itemName,
    imageUrl: item.imageUrl?.trim() || catalog?.imageUrl || mappedUrl || item.imageUrl,
    itemCode: item.itemCode ?? catalog?.id ?? item.itemCode,
  };
}

export function enrichEquipItems(equips: EquipItem[]): EquipItem[] {
  return equips.map((e) => enrichEquipmentFields(e));
}

export function equipItemsFromDraft(draft: Record<SlotType, DecorItem | null>): EquipItem[] {
  const safe = sanitizeEquipDraft(draft);
  const out: EquipItem[] = [];
  let seq = 1;
  for (const slot of GOCAT_SLOTS) {
    const item = safe[slot];
    if (!item) continue;
    const enriched = enrichEquipmentFields(item);
    out.push({
      catEquipId: seq++,
      slotType: slot,
      equippedAt: new Date().toISOString(),
      itemId: enriched.itemId ?? item.itemId,
      itemCode: enriched.itemCode ?? item.itemCode,
      itemName: enriched.itemName ?? item.itemName,
      itemType: enriched.itemType ?? item.itemType ?? slot,
      imageUrl: enriched.imageUrl ?? item.imageUrl,
    });
  }
  return out;
}

export function applyEquipDraftToPage(
  page: MiniHomePage,
  draft: Record<SlotType, DecorItem | null>
): MiniHomePage {
  return { ...page, activeEquips: equipItemsFromDraft(draft) };
}

export function resolveEquipSlotLabel(
  slot: SlotType,
  equipBySlot: Record<SlotType, Equipment | null>
): string {
  const eq = equipBySlot[slot];
  if (!eq) return "-";
  const name = enrichEquipmentFields(eq).itemName?.trim();
  return name || "-";
}

export function resolveSaveItemId(
  decor: DecorItem | null,
  ownedItems: UserItem[]
): number | null {
  if (!decor) return null;
  const code = decor.itemCode?.trim().toUpperCase();
  if (code) {
    const owned = ownedItems.find((o) => o.itemCode?.trim().toUpperCase() === code);
    if (owned) return owned.itemId;
  }
  return decor.itemId;
}

function normalizeSlot(slotType?: string | null): SlotType | null {
  return resolveItemSlot(undefined, slotType);
}

export function buildEquipBySlot(pageEquips?: EquipItem[] | null): Record<SlotType, Equipment | null> {
  const map = emptyEquipBySlot();
  for (const e of enrichEquipItems(pageEquips ?? [])) {
    const slot = resolveItemSlot(e.itemCode, e.slotType) ?? normalizeSlot(e.slotType);
    if (!slot) continue;
    map[slot] = equipItemToEquipment({ ...e, slotType: slot });
  }
  return map;
}

export function userItemToDecorItem(item: UserItem): DecorItem {
  const slot = resolveItemSlot(item.itemCode, item.itemType);
  return { ...item, slotType: slot ?? undefined };
}

export function draftFromEquips(pageEquips?: EquipItem[] | null): Record<SlotType, DecorItem | null> {
  const draft = emptyDraft();
  for (const e of pageEquips ?? []) {
    const slot = resolveItemSlot(e.itemCode, e.slotType) ?? normalizeSlot(e.slotType);
    if (!slot) continue;
    draft[slot] = {
      userItemId: e.itemId,
      itemId: e.itemId,
      itemCode: e.itemCode,
      itemName: e.itemName,
      itemType: e.itemType,
      imageUrl: e.imageUrl,
      acquiredAt: e.equippedAt,
      slotType: slot,
    };
  }
  return draft;
}

export const STARTER_ITEM_IMAGE_URLS: Record<string, string> = {
  STARTER_HAT: "/assets/cat/items/starter-hat.svg",
  STARTER_BODY: "/assets/cat/items/starter-body.svg",
  STARTER_ACC: "/assets/cat/items/starter-acc.svg",
  HANBOK: "/assets/cat/items/hanbok.svg",
  SHELL_ACCESSORY: "/assets/cat/items/shell-accessory.svg",
  VISITOR_RIBBON: "/assets/cat/items/starter-acc.svg",
  REVIEW_STAR: "/assets/cat/items/yellow-star-pendant.svg",
};

export function resolveEquipImageUrl(item: EquipPreviewItem): string | null {
  const url = item.imageUrl?.trim();
  if (url) return url;
  const code = item.itemCode?.trim().toUpperCase();
  if (code && STARTER_ITEM_IMAGE_URLS[code]) return STARTER_ITEM_IMAGE_URLS[code];
  const catalog = findCatalogItem(item.itemId, item.itemCode);
  if (catalog?.imageUrl?.trim()) return catalog.imageUrl.trim();
  return null;
}

function previewFromDecor(item: DecorItem | null): EquipPreviewItem | null {
  if (!item) return null;
  const preview: EquipPreviewItem = enrichEquipmentFields({
    itemName: item.itemName,
    imageUrl: item.imageUrl ?? null,
    itemType: item.itemType,
    itemCode: item.itemCode,
    itemId: item.itemId,
  });
  const resolved = resolveEquipImageUrl(preview);
  return resolved ? { ...preview, imageUrl: resolved } : preview;
}

function previewFromEquipment(item: Equipment | null): EquipPreviewItem | null {
  if (!item) return null;
  const preview = enrichEquipmentFields({
    itemId: item.itemId,
    itemName: item.itemName,
    imageUrl: item.imageUrl ?? null,
    itemType: item.itemType,
    itemCode: item.itemCode,
  });
  const resolved = resolveEquipImageUrl(preview);
  return resolved ? { ...preview, imageUrl: resolved } : preview;
}

/** 꾸미기 미리보기 — 기본 아이템은 owned 없어도 항상 표시 */
export function equipPreviewFromDraft(
  draft: Record<SlotType, DecorItem | null>,
  ownedItems: UserItem[] = [],
  growthStage: GrowthStage = "BASIC"
): EquipPreview {
  const safe = normalizeEquipDraft(draft, ownedItems, growthStage);
  return {
    HEAD: previewFromDecor(safe.HEAD),
    FACE: previewFromDecor(safe.FACE),
    NECK: previewFromDecor(safe.NECK),
  };
}

export function hasEquippedPreview(preview: EquipPreview): boolean {
  return GOCAT_SLOTS.some((s) => preview[s]);
}

export function equipPreviewFromEquipBySlot(
  equipBySlot: Record<SlotType, Equipment | null>
): EquipPreview | null {
  const hasAny = GOCAT_SLOTS.some((s) => equipBySlot[s]);
  if (!hasAny) return null;
  return normalizeEquipPreview({
    HEAD: previewFromEquipment(equipBySlot.HEAD),
    FACE: previewFromEquipment(equipBySlot.FACE),
    NECK: previewFromEquipment(equipBySlot.NECK),
  });
}

export function normalizeEquipPreview(preview?: EquipPreview | null): EquipPreview {
  return {
    HEAD: preview?.HEAD ?? null,
    FACE: preview?.FACE ?? null,
    NECK: preview?.NECK ?? null,
  };
}

export function buildEquipBySlotFromDraft(
  draft: Record<SlotType, DecorItem | null>
): Record<SlotType, Equipment | null> {
  const items = equipItemsFromDraft(draft);
  return buildEquipBySlot(items);
}

export function getItemDisplayEmoji(item: {
  itemType?: string | null;
  itemCode?: string | null;
  slotType?: string | null;
}): string {
  const slot = resolveItemSlot(item.itemCode, item.slotType ?? item.itemType);
  if (slot === "HEAD") return "🎩";
  if (slot === "FACE") return "👓";
  if (slot === "NECK") return "🎀";
  const t = (item.itemType ?? item.itemCode ?? "").toUpperCase();
  if (t.includes("HAT")) return "🎩";
  if (t.includes("GLASS")) return "👓";
  return "🎁";
}
