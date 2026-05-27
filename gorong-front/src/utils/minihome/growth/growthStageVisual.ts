import type { GrowthStage } from "./growth";

/** Rive 바깥 wrapper scale — origin-bottom */
export function growthStageScaleClass(stage: GrowthStage): string {
  switch (stage) {
    case "BASIC":
      return "scale-75";
    case "TEEN":
      return "scale-90";
    case "ADULT":
      return "scale-105";
    case "MASTER":
      return "scale-[1.15]";
    default:
      return "scale-90";
  }
}

export const GROWTH_STAGE_BADGE: Record<
  GrowthStage,
  { emoji: string; ring: string; bg: string; text: string }
> = {
  BASIC: {
    emoji: "🌱",
    ring: "ring-orange-200",
    bg: "bg-orange-50",
    text: "text-orange-900",
  },
  TEEN: {
    emoji: "✨",
    ring: "ring-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-900",
  },
  ADULT: {
    emoji: "⭐",
    ring: "ring-orange-300",
    bg: "bg-orange-100",
    text: "text-orange-950",
  },
  MASTER: {
    emoji: "👑",
    ring: "ring-yellow-300",
    bg: "bg-gradient-to-r from-amber-100 to-yellow-100",
    text: "text-amber-950",
  },
};
