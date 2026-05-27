import type { GrowthStage } from "./growth";

/** cat.riv에 애니메이션이 없을 때 시도할 이름 순서 */
export const RIVE_GROWTH_ANIMATION_FALLBACK = "idle_basic";

/** 파일마다 다를 수 있는 idle 후보 (첫 매칭 사용) */
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

/** 성장 단계 → Rive animation / state 이름 */
export function getRiveAnimationForStage(stage?: GrowthStage | string | null): string {
  if (!stage) return RIVE_GROWTH_ANIMATION_FALLBACK;
  const key = String(stage).trim().toUpperCase() as GrowthStage;
  return STAGE_TO_RIVE_ANIMATION[key] ?? RIVE_GROWTH_ANIMATION_FALLBACK;
}

/** 터치 시 시도할 원샷 애니메이션 이름 (타임라인 모드) */
export const RIVE_TAP_ANIMATION_CANDIDATES = ["tap", "interact", "jump", "happy", "poke"];

/** 파일에 실제 존재하는 애니메이션만 재생 (없으면 idle_basic → 첫 번째) */
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
  const key = stage ? (String(stage).trim().toUpperCase() as GrowthStage) : "BASIC";
  const candidates = RIVE_IDLE_ANIMATION_CANDIDATES[key] ?? RIVE_IDLE_ANIMATION_CANDIDATES.BASIC;
  const picked = pickFromList(candidates, availableNames);
  if (picked) return picked;
  const preferred = getRiveAnimationForStage(stage);
  if (availableNames?.includes(preferred)) return preferred;
  return availableNames?.[0] ?? RIVE_GROWTH_ANIMATION_FALLBACK;
}
