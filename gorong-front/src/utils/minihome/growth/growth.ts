import type { MiniHomePage } from "../../../types/minihome/minihome";

export type GrowthStage = "BASIC" | "TEEN" | "ADULT" | "MASTER";

export type SlotType = "HEAD" | "BODY" | "ACCESSORY";

export type GrowthState = {
  stage: GrowthStage;
  stageLabel: string;
  nextStage: GrowthStage | null;
  nextStageLabel: string | null;
  activityCount: number;
  /** 누적 온도(temperatureTotal) — 표시용 */
  experience: number;
  progressPercent: number;
  /** 다음 단계까지 필요한 활동 횟수 */
  xpToNext: number;
  isMax: boolean;
};

const NEXT_STAGE: Record<GrowthStage, GrowthStage | null> = {
  BASIC: "TEEN",
  TEEN: "ADULT",
  ADULT: "MASTER",
  MASTER: null,
};

const STAGE_LABELS: Record<GrowthStage, string> = {
  BASIC: "기본",
  TEEN: "성장 1",
  ADULT: "성장 2",
  MASTER: "마스터",
};

/** 현재 단계 구간 시작 활동 횟수 (포함) */
const STAGE_ACTIVITY_MIN: Record<GrowthStage, number> = {
  BASIC: 0,
  TEEN: 10,
  ADULT: 30,
  MASTER: 60,
};

const STAGE_ORDER: GrowthStage[] = ["BASIC", "TEEN", "ADULT", "MASTER"];

/** 행사·활동 참여 횟수 기준 성장 단계 */
export function stageFromActivityCount(count: number): GrowthStage {
  const n = Math.max(0, Math.floor(count));
  if (n >= 60) return "MASTER";
  if (n >= 30) return "ADULT";
  if (n >= 10) return "TEEN";
  return "BASIC";
}

/** @deprecated 활동 기준으로 통일 — 레거시 호환 */
export function stageFromExperience(exp: number): GrowthStage {
  return stageFromActivityCount(exp);
}

export function formatGrowthStageLabel(stage?: string | null): string {
  if (!stage) return STAGE_LABELS.BASIC;
  const key = stage.trim().toUpperCase() as GrowthStage;
  return STAGE_LABELS[key] ?? stage;
}

/** stats.activityCount 우선, 없으면 activities 목록 길이 */
export function resolveActivityCount(page: MiniHomePage | null | undefined): number {
  if (!page) return 0;
  const fromStats = page.stats?.activityCount;
  const fromList = page.activities?.length ?? 0;
  if (typeof fromStats === "number" && fromStats >= 0) {
    return Math.max(fromStats, fromList);
  }
  return fromList;
}

/** 누적 온도 — 표시용 (성장 단계와 분리) */
export function resolveExperience(page: MiniHomePage | null | undefined): number {
  if (!page) return 0;

  const fromStats = page.stats?.temperatureTotal;
  if (typeof fromStats === "number" && fromStats >= 0) return fromStats;

  const fromCat = page.miniHome?.cat?.temperatureTotal;
  if (typeof fromCat === "number" && fromCat >= 0) return fromCat;

  const sumDelta = (page.activities ?? []).reduce(
    (acc, a) => acc + (a.temperatureChange ?? 0),
    0
  );
  return Math.max(0, sumDelta);
}

/**
 * 성장 단계 — 활동 횟수가 기준 (API growthStage/characterType 과 불일치 시 활동 수 우선)
 */
export function resolveGrowthStage(page: MiniHomePage | null | undefined): GrowthStage {
  const activityCount = resolveActivityCount(page);
  const fromActivity = stageFromActivityCount(activityCount);

  const apiRaw = page?.stats?.growthStage ?? page?.miniHome?.cat?.characterType;
  if (apiRaw) {
    const normalized = apiRaw.trim().toUpperCase() as GrowthStage;
    if (normalized in STAGE_LABELS && normalized !== fromActivity) {
      if (import.meta.env.DEV) {
        console.warn(
          `[growth] API stage "${normalized}" != activity-based "${fromActivity}" (count=${activityCount}) — using activity`
        );
      }
    }
  }

  return fromActivity;
}

function activityProgress(stage: GrowthStage, activityCount: number) {
  const nextStage = NEXT_STAGE[stage];
  if (!nextStage) {
    return { progressPercent: 100, xpToNext: 0, isMax: true as const };
  }

  const min = STAGE_ACTIVITY_MIN[stage];
  const nextMin = STAGE_ACTIVITY_MIN[nextStage];
  const span = nextMin - min;
  const progressPercent =
    span <= 0
      ? 100
      : Math.min(100, Math.max(0, ((activityCount - min) / span) * 100));
  const xpToNext = Math.max(0, nextMin - activityCount);

  return { progressPercent, xpToNext, isMax: false as const };
}

export function computeGrowthState(page: MiniHomePage | null | undefined): GrowthState {
  const activityCount = resolveActivityCount(page);
  const experience = resolveExperience(page);
  const stage = resolveGrowthStage(page);
  const nextStage = NEXT_STAGE[stage];
  const { progressPercent, xpToNext, isMax } = activityProgress(stage, activityCount);

  return {
    stage,
    stageLabel: formatGrowthStageLabel(stage),
    nextStage,
    nextStageLabel: nextStage ? formatGrowthStageLabel(nextStage) : null,
    activityCount,
    experience,
    progressPercent,
    xpToNext,
    isMax,
  };
}

export { getCatVisualByStage, type CatVisual } from "../gocat/catVisual";

const STAGE_SLOTS: Record<GrowthStage, SlotType[]> = {
  BASIC: ["HEAD", "ACCESSORY"],
  TEEN: ["HEAD", "BODY", "ACCESSORY"],
  ADULT: ["HEAD", "BODY", "ACCESSORY"],
  MASTER: ["HEAD", "BODY", "ACCESSORY"],
};

export function isSlotUnlockedByStage(slotType: SlotType, currentStage: GrowthStage): boolean {
  return STAGE_SLOTS[currentStage].includes(slotType);
}

export function isItemUnlockedByStage(
  requiredStage: GrowthStage | undefined,
  currentStage: GrowthStage
): boolean {
  if (!requiredStage) return true;
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  const requiredIndex = STAGE_ORDER.indexOf(requiredStage);
  return currentIndex >= requiredIndex;
}

export function isItemSlotCompatible(
  itemSlotType: SlotType | null | undefined,
  currentStage: GrowthStage
): boolean {
  if (!itemSlotType) return false;
  return isSlotUnlockedByStage(itemSlotType, currentStage);
}
