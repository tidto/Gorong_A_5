import type { GrowthStage } from "./growth";

/** cat.riv에 애니메이션이 없을 때 사용 */
export const RIVE_GROWTH_ANIMATION_FALLBACK = "idle_basic";

const STAGE_TO_RIVE_ANIMATION: Record<GrowthStage, string> = {
  BASIC: "idle_basic",
  TEEN: "idle_teen",
  ADULT: "idle_adult",
  MASTER: "idle_master",
};

/** 성장 단계 → Rive animation / state 이름 */
export function getRiveAnimationForStage(stage?: GrowthStage | string | null): string {
  if (!stage) return RIVE_GROWTH_ANIMATION_FALLBACK;
  const key = String(stage).trim().toUpperCase() as GrowthStage;
  return STAGE_TO_RIVE_ANIMATION[key] ?? RIVE_GROWTH_ANIMATION_FALLBACK;
}

/** 파일에 실제 존재하는 애니메이션만 재생 (없으면 idle_basic → 첫 번째) */
export function resolveRivePlaybackAnimation(
  stage: GrowthStage | string | null | undefined,
  availableNames?: readonly string[] | null
): string {
  const preferred = getRiveAnimationForStage(stage);
  if (!availableNames?.length) return preferred;
  if (availableNames.includes(preferred)) return preferred;
  if (availableNames.includes(RIVE_GROWTH_ANIMATION_FALLBACK)) {
    return RIVE_GROWTH_ANIMATION_FALLBACK;
  }
  return availableNames[0] ?? RIVE_GROWTH_ANIMATION_FALLBACK;
}
