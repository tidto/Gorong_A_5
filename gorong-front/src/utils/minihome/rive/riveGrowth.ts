import type { GrowthStage } from "../growth/growth";
import { normalizeGrowthStage } from "../growth/growth";

export const RIVE_GROWTH_ANIMATION_FALLBACK = "idle_basic";

export const RIVE_IDLE_ANIMATION_CANDIDATES: Record<GrowthStage, string[]> = {
  BASIC: ["idle_basic", "idle", "Idle", "Animation 1", "Timeline 1"],
  TEEN: ["idle_teen", "idle_basic", "idle", "Idle", "Animation 1"],
  ADULT: ["idle_adult", "idle_basic", "idle", "Idle", "Animation 1"],
  MASTER: ["idle_master", "idle_adult", "idle_basic", "idle", "Idle"],
};

const STAGE_TO_RIVE_ANIMATION: Record<GrowthStage, string> = {
  BASIC: "idle_basic",
  TEEN: "idle_teen",
  ADULT: "idle_adult",
  MASTER: "idle_master",
};

export function getRiveAnimationForStage(stage?: GrowthStage | string | null): string {
  if (!stage) return RIVE_GROWTH_ANIMATION_FALLBACK;
  const key = normalizeGrowthStage(stage);
  return STAGE_TO_RIVE_ANIMATION[key] ?? RIVE_GROWTH_ANIMATION_FALLBACK;
}

export const RIVE_TAP_ANIMATION_CANDIDATES = ["tap", "interact", "jump", "happy", "poke"];

function pickFromList(candidates: string[], available?: readonly string[] | null): string | null {
  if (!available?.length) return candidates[0] ?? null;
  for (const name of candidates) {
    if (available.includes(name)) return name;
  }
  return available[0] ?? null;
}

export function resolveRivePlaybackAnimation(
  stage: GrowthStage | string | null | undefined,
  availableNames?: readonly string[] | null
): string {
  const key = normalizeGrowthStage(stage);
  const candidates = RIVE_IDLE_ANIMATION_CANDIDATES[key] ?? RIVE_IDLE_ANIMATION_CANDIDATES.BASIC;
  const picked = pickFromList(candidates, availableNames);
  if (picked) return picked;
  const preferred = getRiveAnimationForStage(key);
  if (availableNames?.includes(preferred)) return preferred;
  return availableNames?.[0] ?? RIVE_GROWTH_ANIMATION_FALLBACK;
}
