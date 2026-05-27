import type { DecorItem } from "../../components/minihome/DecorationModal";

export type ItemRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

export type RarityStyle = {
  label: string;
  border: string;
  bg: string;
  badge: string;
  glow: string;
  text: string;
};

const RARITY_STYLES: Record<ItemRarity, RarityStyle> = {
  COMMON: {
    label: "일반",
    border: "border-slate-200",
    bg: "bg-white",
    badge: "bg-slate-100 text-slate-600",
    glow: "",
    text: "text-slate-700",
  },
  RARE: {
    label: "레어",
    border: "border-sky-300",
    bg: "bg-gradient-to-br from-sky-50 to-white",
    badge: "bg-sky-500 text-white",
    glow: "shadow-[0_0_12px_rgba(56,189,248,0.35)]",
    text: "text-sky-800",
  },
  EPIC: {
    label: "에픽",
    border: "border-violet-300",
    bg: "bg-gradient-to-br from-violet-50 to-fuchsia-50",
    badge: "bg-violet-500 text-white",
    glow: "shadow-[0_0_14px_rgba(139,92,246,0.4)]",
    text: "text-violet-800",
  },
  LEGENDARY: {
    label: "전설",
    border: "border-amber-400",
    bg: "bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50",
    badge: "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
    glow: "shadow-[0_0_18px_rgba(251,191,36,0.55)]",
    text: "text-amber-900",
  },
};

/** API rarity 필드 없을 때 itemCode/itemType 기반 추론 (mock 구분용) */
export function resolveItemRarity(item: {
  itemCode?: string | null;
  itemType?: string | null;
  itemName?: string | null;
}): ItemRarity {
  const blob = `${item.itemCode ?? ""} ${item.itemType ?? ""} ${item.itemName ?? ""}`.toUpperCase();
  if (blob.includes("LEGEND") || blob.includes("LGD") || blob.includes("GOLD")) return "LEGENDARY";
  if (blob.includes("EPIC") || blob.includes("SSR")) return "EPIC";
  if (blob.includes("RARE") || blob.includes("SR")) return "RARE";
  return "COMMON";
}

export function getRarityStyle(rarity: ItemRarity): RarityStyle {
  return RARITY_STYLES[rarity];
}

export function rarityForDecorItem(item: DecorItem): ItemRarity {
  return resolveItemRarity(item);
}
