import type { DecorItem, SlotType } from "../../components/minihome/DecorationModal";
import type { Equipment, UserItem } from "../../types/minihome/item";
import type { EquipItem } from "../../types/minihome/minihome";

export type EquipPreviewItem = {
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
  return {
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
  };
}

export function buildEquipBySlot(pageEquips?: EquipItem[] | null): Record<SlotType, Equipment | null> {
  const map = emptyEquipBySlot();
  for (const e of pageEquips ?? []) {
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

function previewFromDecor(item: DecorItem | null): EquipPreviewItem | null {
  if (!item) return null;
  return {
    itemName: item.itemName,
    imageUrl: item.imageUrl,
    itemType: item.itemType,
    itemCode: item.itemCode,
  };
}

function previewFromEquipment(item: Equipment | null): EquipPreviewItem | null {
  if (!item) return null;
  return {
    itemName: item.itemName,
    imageUrl: item.imageUrl,
    itemType: item.itemType,
    itemCode: item.itemCode,
  };
}

export function equipPreviewFromDraft(draft: Record<SlotType, DecorItem | null>): EquipPreview | null {
  const hasAny = SLOTS.some((s) => draft[s]);
  if (!hasAny) return null;
  return {
    HEAD: previewFromDecor(draft.HEAD),
    BODY: previewFromDecor(draft.BODY),
    ACCESSORY: previewFromDecor(draft.ACCESSORY),
  };
}

export function equipPreviewFromEquipBySlot(
  equipBySlot: Record<SlotType, Equipment | null>
): EquipPreview | null {
  const hasAny = SLOTS.some((s) => equipBySlot[s]);
  if (!hasAny) return null;
  return {
    HEAD: previewFromEquipment(equipBySlot.HEAD),
    BODY: previewFromEquipment(equipBySlot.BODY),
    ACCESSORY: previewFromEquipment(equipBySlot.ACCESSORY),
  };
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
