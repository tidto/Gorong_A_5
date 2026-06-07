import { findRewardCatalogEntry } from "./gocatRewardCatalog";

/** 꾸미기 슬롯 — HEAD · FACE · NECK 만 사용 */
export type SlotType = "HEAD" | "FACE" | "NECK";

export const GOCAT_SLOTS: SlotType[] = ["HEAD", "FACE", "NECK"];

export const SLOT_UI: Record<SlotType, { label: string; emoji: string; hint: string }> = {
  HEAD: { label: "머리", emoji: "🎩", hint: "모자·왕관" },
  FACE: { label: "얼굴", emoji: "👓", hint: "안경" },
  NECK: { label: "목", emoji: "🎀", hint: "리본" },
};

export function emptySlotRecord<T>(): Record<SlotType, T | null> {
  return { HEAD: null, FACE: null, NECK: null };
}

/** 퇴역 슬롯·아이템 — 장착·저장에서 제외 */
const RETIRED_ITEM_CODES = new Set([
  "badge",
  "bungeoppang_badge",
  "review_star",
  "shell_accessory",
  "event_ribbon",
  "star_necklace",
  "visitor_ribbon",
  "sparkle_crown",
  "cherry_hat",
  "neon_glasses",
]);

/** DB/API 레거시 슬롯·아이템 타입 → 현재 슬롯 */
export function resolveItemSlot(itemCode?: string | null, legacySlot?: string | null): SlotType | null {
  const code = (itemCode ?? "").trim().toLowerCase().replace(/-/g, "_");
  if (code && RETIRED_ITEM_CODES.has(code)) return null;
  if (code.includes("badge")) return null;

  const entry = findRewardCatalogEntry(itemCode);
  if (entry) {
    const cat = entry.category as string;
    if (cat === "BADGE" || cat === "ACCESSORY" || cat === "BODY") return null;
    if (cat === "HEAD" || cat === "FACE" || cat === "NECK") return cat as SlotType;
  }

  if (!code) return normalizeSlotType(legacySlot);

  if (
    code.includes("glass") ||
    code.includes("sunglass") ||
    code === "round_glasses"
  ) {
    return "FACE";
  }
  if (
    code.includes("bow") ||
    code.includes("neck") ||
    code === "pink_bow"
  ) {
    return "NECK";
  }
  if (code.includes("ribbon") && !code.includes("event") && !code.includes("visitor")) {
    return "NECK";
  }
  if (code.includes("hat") || code.includes("cap") || code.includes("crown")) {
    return "HEAD";
  }

  return normalizeSlotType(legacySlot);
}

export function normalizeSlotType(raw?: string | null): SlotType | null {
  const s = (raw ?? "").trim().toUpperCase();
  if (s === "HEAD" || s === "FACE" || s === "NECK") return s;
  if (s === "BADGE" || s === "ACCESSORY" || s === "BODY") return null;
  if (s.includes("HAT")) return "HEAD";
  if (s.includes("GLASS")) return "FACE";
  if (s.includes("NECK") || s.includes("ACC")) return "NECK";
  return null;
}
