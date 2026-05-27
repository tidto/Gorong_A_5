import type { DecorItem, SlotType } from "../../components/minihome/DecorationModal";
import type { Equipment, UserItem } from "../../types/minihome/item";
import type { EquipItem, MiniHomePage } from "../../types/minihome/minihome";
import { findCatalogItem } from "./decorItemCatalog";
import { sanitizeEquipDraft } from "./gocatMvp";

export type EquipPreviewItem = {
  itemId?: number | null;
  itemName?: string | null;
  imageUrl?: string | null;
  itemType?: string | null;
  itemCode?: string | null;
};

export type EquipPreview = Record<SlotType, EquipPreviewItem | null>;

const SLOTS: SlotType[] = ["HEAD", "BODY", "ACCESSORY"];

export function emptyEquipBySlot(): Record<SlotType, Equipment | null> {
  return { HEAD: null, BODY: null, ACCESSORY: null };
}

export function emptyDraft(): Record<SlotType, DecorItem | null> {
  return { HEAD: null, BODY: null, ACCESSORY: null };
}

function normalizeSlot(slotType?: string | null): SlotType | null {
  const s = (slotType ?? "").trim().toUpperCase();
  if (s === "HEAD" || s === "BODY" || s === "ACCESSORY") return s;
  return null;
}

function inferSlotFromItemType(itemType?: string | null): SlotType | undefined {
  const t = (itemType ?? "").trim().toUpperCase();
  if (t.includes("HEAD") || t === "HAT") return "HEAD";
  if (t.includes("BODY") || t === "OUTFIT") return "BODY";
  if (t.includes("ACCESSORY") || t.includes("ACC")) return "ACCESSORY";
  return undefined;
}

export function equipItemToEquipment(e: EquipItem): Equipment {
  return enrichEquipmentFields({
    catEquipId: e.catEquipId,
    goCatId: 0,
    slotType: e.slotType,
    itemId: e.itemId,
    itemCode: e.itemCode,
    itemName: e.itemName,
    itemType: e.itemType,
    imageUrl: e.imageUrl,
    isActive: true,
    equippedAt: e.equippedAt,
  });
}

/** 카탈로그·imageUrl 맵으로 API 장착 정보 보강 */
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
  for (const slot of SLOTS) {
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
      itemType: enriched.itemType ?? item.itemType,
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

/** 카드 슬롯 라벨 — 미장착 시 "-" */
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

export function buildEquipBySlot(pageEquips?: EquipItem[] | null): Record<SlotType, Equipment | null> {
  const map = emptyEquipBySlot();
  for (const e of enrichEquipItems(pageEquips ?? [])) {
    const slot = normalizeSlot(e.slotType);
    if (slot) map[slot] = equipItemToEquipment(e);
  }
  return map;
}

export function userItemToDecorItem(item: UserItem): DecorItem {
  return {
    ...item,
    slotType: inferSlotFromItemType(item.itemType) ?? normalizeSlot(item.itemType) ?? undefined,
  };
}

export function draftFromEquips(pageEquips?: EquipItem[] | null): Record<SlotType, DecorItem | null> {
  const draft = emptyDraft();
  for (const e of pageEquips ?? []) {
    const slot = normalizeSlot(e.slotType);
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

/** 스타터·로컬 placeholder — imageUrl 없을 때 미리보기용 */
export const STARTER_ITEM_IMAGE_URLS: Record<string, string> = {
  STARTER_HAT: "/assets/cat/items/starter-hat.svg",
  STARTER_BODY: "/assets/cat/items/starter-body.svg",
  STARTER_ACC: "/assets/cat/items/starter-acc.svg",
  CHERRY_HAT: "/assets/cat/items/cherry-hat.svg",
  NEON_GLASSES: "/assets/cat/items/neon-glasses.svg",
  HANBOK: "/assets/cat/items/hanbok.svg",
  SHELL_ACCESSORY: "/assets/cat/items/shell-accessory.svg",
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
  const catalog = findCatalogItem(item.itemId, item.itemCode);
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

/** 꾸미기 미리보기 — aligned overlay 슬롯 전체 */
export function equipPreviewFromDraft(draft: Record<SlotType, DecorItem | null>): EquipPreview {
  const safe = sanitizeEquipDraft(draft);
  return {
    HEAD: previewFromDecor(safe.HEAD),
    BODY: previewFromDecor(safe.BODY),
    ACCESSORY: previewFromDecor(safe.ACCESSORY),
  };
}

export function hasEquippedPreview(preview: EquipPreview): boolean {
  return SLOTS.some((s) => preview[s]);
}

export function equipPreviewFromEquipBySlot(
  equipBySlot: Record<SlotType, Equipment | null>
): EquipPreview | null {
  const hasAny = SLOTS.some((s) => equipBySlot[s]);
  if (!hasAny) return null;
  return normalizeEquipPreview({
    HEAD: previewFromEquipment(equipBySlot.HEAD),
    BODY: previewFromEquipment(equipBySlot.BODY),
    ACCESSORY: previewFromEquipment(equipBySlot.ACCESSORY),
  });
}

/** undefined/null·불완전 객체를 슬롯 3개 구조로 정규화 */
export function normalizeEquipPreview(
  preview?: EquipPreview | null
): EquipPreview {
  return {
    HEAD: preview?.HEAD ?? null,
    BODY: preview?.BODY ?? null,
    ACCESSORY: preview?.ACCESSORY ?? null,
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
}): string {
  const t = (item.itemType ?? item.itemCode ?? "").toUpperCase();
  if (t.includes("HEAD") || t.includes("HAT")) return "🎩";
  if (t.includes("BODY") || t.includes("OUTFIT")) return "👕";
  if (t.includes("ACCESSORY") || t.includes("ACC")) return "✨";
  return "🎁";
}
