import type { MiniHomePage } from "../../../types/minihome/minihome";
import { GOCAT_DEBUG_UNLOCK_ALL } from "../gocat/gocatItemCatalog";
import type { SlotType } from "../gocat/gocatSlots";

/** 성장 단계 — 활동·경험치 기준 */
export type GrowthStage = "BASIC" | "TEEN" | "ADULT" | "MASTER";

/** @deprecated SlotType는 gocatSlots에서 import */
export type { SlotType };

const LEGACY_STAGE_MAP: Record<string, GrowthStage> = {
  BASIC: "BASIC",
  TEEN: "TEEN",
  ADULT: "ADULT",
  MASTER: "MASTER",
  BRONZE: "TEEN",
  SILVER: "ADULT",
  GOLD: "ADULT",
  LEGEND: "MASTER",
};

export function normalizeGrowthStage(raw?: string | null): GrowthStage {
  if (!raw?.trim()) return "BASIC";
  const key = raw.trim().toUpperCase();
  return LEGACY_STAGE_MAP[key] ?? "BASIC";
}

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

const NEXT_STAGE: Record<GrowthStage, GrowthStage | null> = {
  BASIC: "TEEN",
  TEEN: "ADULT",
  ADULT: "MASTER",
  MASTER: null,
};

const STAGE_LABELS: Record<GrowthStage, string> = {
  BASIC: "기본",
  TEEN: "성장1",
  ADULT: "성장2",
  MASTER: "마스터",
};

const STAGE_ACTIVITY_MIN: Record<GrowthStage, number> = {
  BASIC: 0,
  TEEN: 10,
  ADULT: 30,
  MASTER: 60,
};

const STAGE_ORDER: GrowthStage[] = ["BASIC", "TEEN", "ADULT", "MASTER"];

export function stageFromActivityCount(count: number): GrowthStage {
  const n = Math.max(0, Math.floor(count));
  if (n >= 60) return "MASTER";
  if (n >= 30) return "ADULT";
  if (n >= 10) return "TEEN";
  return "BASIC";
}

export function stageFromExperience(exp: number): GrowthStage {
  if (exp >= 600) return "MASTER";
  if (exp >= 300) return "ADULT";
  if (exp >= 100) return "TEEN";
  return "BASIC";
}

export function formatGrowthStageLabel(stage?: string | null): string {
  if (!stage) return STAGE_LABELS.BASIC;
  return STAGE_LABELS[normalizeGrowthStage(stage)];
}

export function compareGrowthStage(a: GrowthStage, b: GrowthStage): number {
  return STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(b);
}

export function resolveActivityCount(page: MiniHomePage | null | undefined): number {
  if (!page) return 0;
  const fromStats = page.stats?.activityCount;
  const fromList = page.activities?.length ?? 0;
  if (typeof fromStats === "number" && fromStats >= 0) {
    return Math.max(fromStats, fromList);
  }
  return fromList;
}

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

export function resolveGrowthStage(page: MiniHomePage | null | undefined): GrowthStage {
  const apiStage = page?.miniHome?.cat?.appearanceState?.growthStage;
  if (typeof apiStage === "string" && apiStage.trim()) {
    return normalizeGrowthStage(apiStage);
  }
  const activityCount = resolveActivityCount(page);
  const fromActivity = stageFromActivityCount(activityCount);
  const fromExp = stageFromExperience(resolveExperience(page));
  return compareGrowthStage(fromActivity, fromExp) >= 0 ? fromActivity : fromExp;
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
  BASIC: ["HEAD", "FACE", "NECK"],
  TEEN: ["HEAD", "FACE", "NECK"],
  ADULT: ["HEAD", "FACE", "NECK"],
  MASTER: ["HEAD", "FACE", "NECK"],
};

export function isSlotUnlockedByStage(slotType: SlotType, currentStage: GrowthStage): boolean {
  if (GOCAT_DEBUG_UNLOCK_ALL) return true;
  return STAGE_SLOTS[currentStage].includes(slotType);
}

export function isItemUnlockedByStage(
  requiredStage: GrowthStage | undefined,
  currentStage: GrowthStage
): boolean {
  if (!requiredStage) return true;
  return compareGrowthStage(currentStage, requiredStage) >= 0;
}

export function isItemSlotCompatible(
  itemSlotType: SlotType | null | undefined,
  currentStage: GrowthStage
): boolean {
  if (!itemSlotType) return false;
  return isSlotUnlockedByStage(itemSlotType, currentStage);
}

export function slotUnlockHint(slotType: SlotType, currentStage: GrowthStage): string | null {
  if (isSlotUnlockedByStage(slotType, currentStage)) return null;
  const required =
    STAGE_ORDER.find((s) => STAGE_SLOTS[s].includes(slotType)) ?? "TEEN";
  return `${formatGrowthStageLabel(required)} 단계에서 ${slotLabel(slotType)} 슬롯이 열려요`;
}

function slotLabel(slot: SlotType): string {
  if (slot === "HEAD") return "머리";
  if (slot === "FACE") return "얼굴";
  if (slot === "NECK") return "목";
  return "장식";
}
