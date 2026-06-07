import type { SlotType } from "../../utils/minihome/gocat/gocatSlots";

export type GoCatItemCategory = SlotType;

export const GOCAT_ENABLED_CATEGORIES: GoCatItemCategory[] = ["HEAD", "FACE", "NECK"];

export function isGoCatSlotEnabled(category: GoCatItemCategory): boolean {
  return GOCAT_ENABLED_CATEGORIES.includes(category);
}

export type GoCatItem = {
  id: string;
  name: string;
  category: GoCatItemCategory;
  imageUrl: string;
};

export const GOCAT_OVERLAY_BASE = "/assets/cat/overlays";

export const GOCAT_ITEMS: GoCatItem[] = [
  { id: "witch_hat", name: "마녀 모자", category: "HEAD", imageUrl: `${GOCAT_OVERLAY_BASE}/witch_hat_aligned.png` },
  { id: "crown", name: "왕관", category: "HEAD", imageUrl: `${GOCAT_OVERLAY_BASE}/crown_aligned.png` },
  { id: "blue_cap", name: "파란 캡모자", category: "HEAD", imageUrl: `${GOCAT_OVERLAY_BASE}/blue_cap_aligned.png` },
  { id: "round_glasses", name: "동그란 안경", category: "FACE", imageUrl: `${GOCAT_OVERLAY_BASE}/round_glasses_aligned.png` },
  { id: "pink_bow", name: "목 리본", category: "NECK", imageUrl: `${GOCAT_OVERLAY_BASE}/pink_bow_neck_aligned.png` },
];

export const GOCAT_MVP_ITEMS = GOCAT_ITEMS;

export function getGoCatItemsByCategory(category: GoCatItemCategory): GoCatItem[] {
  if (!isGoCatSlotEnabled(category)) return [];
  return GOCAT_ITEMS.filter((item) => item.category === category);
}

export function findGoCatItem(id?: string | null): GoCatItem | undefined {
  if (!id?.trim()) return undefined;
  const key = id.trim().toLowerCase();
  return GOCAT_ITEMS.find((item) => item.id === key);
}

export function findGoCatItemByCode(itemCode?: string | null): GoCatItem | undefined {
  if (!itemCode?.trim()) return undefined;
  return findGoCatItem(itemCode.trim().toLowerCase());
}
