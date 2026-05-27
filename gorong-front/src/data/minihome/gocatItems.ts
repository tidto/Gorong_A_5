/** 발표 MVP — 모자 3 · 악세 2 */
export const GOCAT_MVP_HEAD_IDS = ["witch_hat", "crown", "blue_cap"] as const;
export const GOCAT_MVP_ACCESSORY_IDS = ["pink_bow", "round_glasses"] as const;

export type GoCatItemCategory = "HEAD" | "BODY" | "ACCESSORY";

/** UI·저장·overlay에 노출하는 슬롯 (BODY는 에셋 정비 후 재활성화) */
export const GOCAT_ENABLED_CATEGORIES: GoCatItemCategory[] = ["HEAD", "ACCESSORY"];

export function isGoCatSlotEnabled(category: GoCatItemCategory): boolean {
  return GOCAT_ENABLED_CATEGORIES.includes(category);
}

export type GoCatItem = {
  id: string;
  name: string;
  category: GoCatItemCategory;
  imageUrl: string;
};

/** public/assets/cat/overlays/*_aligned.png — 420×420 정렬 overlay */
export const GOCAT_OVERLAY_BASE = "/assets/cat/overlays";

export const GOCAT_ITEMS: GoCatItem[] = [
  { id: "witch_hat", name: "마녀 모자", category: "HEAD", imageUrl: `${GOCAT_OVERLAY_BASE}/witch_hat_aligned.png` },
  { id: "crown", name: "왕관", category: "HEAD", imageUrl: `${GOCAT_OVERLAY_BASE}/crown_aligned.png` },
  { id: "blue_cap", name: "파란 캡모자", category: "HEAD", imageUrl: `${GOCAT_OVERLAY_BASE}/blue_cap_aligned.png` },
  { id: "pink_bow", name: "목 리본", category: "ACCESSORY", imageUrl: `${GOCAT_OVERLAY_BASE}/pink_bow_neck_aligned.png` },
  {
    id: "round_glasses",
    name: "동그란 안경",
    category: "ACCESSORY",
    imageUrl: `${GOCAT_OVERLAY_BASE}/round_glasses_aligned.png`,
  },
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
