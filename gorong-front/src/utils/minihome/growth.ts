import type { MiniHomePage } from "../../types/minihome/minihome";

export type GrowthStage = "BASIC" | "TEEN" | "ADULT" | "MASTER";

export type SlotType = "HEAD" | "BODY" | "ACCESSORY";

export type GrowthState = {
  stage: GrowthStage;
  stageLabel: string;
  nextStage: GrowthStage | null;
  nextStageLabel: string | null;
  activityCount: number;
  experience: number;
  progressPercent: number;
  xpToNext: number;
  isMax: boolean;
};

const STAGE_EXP_MIN: Record<GrowthStage, number> = {
  BASIC: 0,
  TEEN: 100,
  ADULT: 300,
  MASTER: 600,
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

/** 누적 경험치(exp) 기준 성장 단계 (GR033) */
export function stageFromExperience(exp: number): GrowthStage {
  const e = Math.max(0, Math.floor(exp));
  if (e >= 600) return "MASTER";
  if (e >= 300) return "ADULT";
  if (e >= 100) return "TEEN";
  return "BASIC";
}

export function formatGrowthStageLabel(stage?: string | null): string {
  if (!stage) return STAGE_LABELS.BASIC;
  const key = stage.trim().toUpperCase() as GrowthStage;
  return STAGE_LABELS[key] ?? stage;
}

export function resolveActivityCount(page: MiniHomePage | null | undefined): number {
  if (!page) return 0;
  const total = page.stats?.activityCount;
  if (typeof total === "number" && total >= 0) return total;
  return page.activities?.length ?? 0;
}

/** 누적 경험치: API temperatureTotal / growthStage 우선 */
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
  if (sumDelta > 0) return sumDelta;

  return resolveActivityCount(page);
}

export function resolveGrowthStage(page: MiniHomePage | null | undefined): GrowthStage {
  const apiStage = page?.stats?.growthStage ?? page?.miniHome?.cat?.characterType;
  if (apiStage) {
    const normalized = apiStage.trim().toUpperCase() as GrowthStage;
    if (normalized in STAGE_LABELS) return normalized;
  }
  return stageFromExperience(resolveExperience(page));
}

export { getCatVisualByStage, type CatVisual } from "./catVisual";

const STAGE_SLOTS: Record<GrowthStage, SlotType[]> = {
  BASIC: ["HEAD"],
  TEEN: ["HEAD", "BODY"],
  ADULT: ["HEAD", "BODY", "ACCESSORY"],
  MASTER: ["HEAD", "BODY", "ACCESSORY"],
};

const STAGE_ORDER: GrowthStage[] = ["BASIC", "TEEN", "ADULT", "MASTER"];

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

export function computeGrowthState(page: MiniHomePage | null | undefined): GrowthState {
  const activityCount = resolveActivityCount(page);
  const experience = resolveExperience(page);
  const stage = resolveGrowthStage(page);
  const nextStage = NEXT_STAGE[stage];
  const stageMin = STAGE_EXP_MIN[stage];
  const nextMin = nextStage ? STAGE_EXP_MIN[nextStage] : null;
  const isMax = nextMin == null;

  const progressPercent = isMax
    ? 100
    : Math.min(
        100,
        Math.max(0, ((experience - stageMin) / (nextMin! - stageMin)) * 100)
      );

  const xpToNext = isMax ? 0 : Math.max(0, nextMin! - experience);

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
