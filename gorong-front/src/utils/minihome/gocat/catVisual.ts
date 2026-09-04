import type { GrowthStage } from "../growth/growth";
import { formatGrowthStageLabel, normalizeGrowthStage } from "../growth/growth";
import { getRiveAnimationForStage } from "../rive/riveGrowth";

export type CatVisual = {
  stage: GrowthStage;
  stageLabel: string;
  imageSrc: string;
  riveSrc: string;
  riveAnimation: string;
  scale: number;
  animationSpeed: number;
  badgeEmoji: string | null;
  badgeLabel: string | null;
  showCornerBadge: boolean;
  showCrownOnHead: boolean;
  ringClass: string;
  shellClass: string;
  innerClass: string;
  filterClass: string;
  emojiFallback: string;
  emojiSizeClass: string;
  hasAura: boolean;
  hasSparkle: boolean;
  glowClass: string;
};

const RIVE_SRC = "/rive/cat.riv";
const BASE_CAT_IMAGE = "/assets/cat/gocat-base.png";

type StageMeta = Omit<CatVisual, "stage" | "stageLabel" | "imageSrc" | "riveSrc" | "riveAnimation">;

const STAGE_VISUAL: Record<GrowthStage, StageMeta> = {
  BASIC: {
    scale: 0.75,
    animationSpeed: 0.8,
    badgeEmoji: null,
    badgeLabel: null,
    showCornerBadge: false,
    showCrownOnHead: false,
    ringClass: "",
    shellClass: "",
    innerClass: "",
    filterClass: "brightness-[0.97] saturate-[0.92]",
    emojiFallback: "😺",
    emojiSizeClass: "text-3xl",
    hasAura: false,
    hasSparkle: false,
    glowClass: "",
  },
  TEEN: {
    scale: 0.9,
    animationSpeed: 1.0,
    badgeEmoji: "✨",
    badgeLabel: "성장1",
    showCornerBadge: true,
    showCrownOnHead: false,
    ringClass: "",
    shellClass: "",
    innerClass: "",
    filterClass: "brightness-105 saturate-105",
    emojiFallback: "😺",
    emojiSizeClass: "text-4xl",
    hasAura: false,
    hasSparkle: false,
    glowClass: "shadow-[0_0_20px_8px_rgba(251,146,60,0.4)]",
  },
  ADULT: {
    scale: 1.05,
    animationSpeed: 1.2,
    badgeEmoji: "⭐",
    badgeLabel: "성장2",
    showCornerBadge: true,
    showCrownOnHead: false,
    ringClass: "",
    shellClass: "",
    innerClass: "",
    filterClass: "brightness-110 saturate-110 contrast-105",
    emojiFallback: "😸",
    emojiSizeClass: "text-5xl",
    hasAura: false,
    hasSparkle: false,
    glowClass: "shadow-[0_0_24px_10px_rgba(249,115,22,0.5)]",
  },
  MASTER: {
    scale: 1.2,
    animationSpeed: 1.5,
    badgeEmoji: null,
    badgeLabel: "마스터",
    showCornerBadge: false,
    showCrownOnHead: true,
    ringClass: "",
    shellClass: "",
    innerClass: "",
    filterClass: "brightness-115 saturate-125 contrast-110",
    emojiFallback: "😻",
    emojiSizeClass: "text-6xl",
    hasAura: true,
    hasSparkle: true,
    glowClass: "shadow-[0_0_32px_12px_rgba(234,179,8,0.6)]",
  },
};

export function getCatVisualByStage(stage: GrowthStage | string | null | undefined): CatVisual {
  const key = normalizeGrowthStage(stage);
  const meta = STAGE_VISUAL[key];
  return {
    stage: key,
    stageLabel: formatGrowthStageLabel(key),
    imageSrc: BASE_CAT_IMAGE,
    riveSrc: RIVE_SRC,
    riveAnimation: getRiveAnimationForStage(key),
    ...meta,
  };
}
