import type { GrowthStage } from "./growth";
import { formatGrowthStageLabel } from "./growth";
import { getRiveAnimationForStage } from "./riveGrowth";

export type CatVisual = {
  stage: GrowthStage;
  stageLabel: string;
  imageSrc: string;
  riveSrc: string;
  riveAnimation: string;
  /** 캐릭터 본체 scale */
  scale: number;
  /** 애니메이션 속도 배율 (1.0 = 기본) */
  animationSpeed: number;
  badgeEmoji: string | null;
  badgeLabel: string | null;
  showCornerBadge: boolean;
  showCrownOnHead: boolean;
  ringClass: string;
  /** 바깥 원형 카드 배경 */
  shellClass: string;
  /** 캐릭터가 들어가는 내부 영역 */
  innerClass: string;
  filterClass: string;
  emojiFallback: string;
  emojiSizeClass: string;
  hasAura: boolean;
  hasSparkle: boolean;
  /** 성장 단계별 glow 효과 클래스 */
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
    ringClass: "ring-orange-100",
    shellClass: "bg-[#FFF8F0]",
    innerClass: "bg-orange-50/90",
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
    ringClass: "ring-amber-300",
    shellClass: "bg-orange-100",
    innerClass: "bg-amber-50",
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
    ringClass: "ring-orange-400",
    shellClass: "bg-orange-200",
    innerClass: "bg-orange-100",
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
    ringClass: "ring-yellow-400",
    shellClass:
      "bg-gradient-to-br from-amber-200 via-yellow-100 to-orange-300 shadow-lg shadow-amber-300/50",
    innerClass: "bg-gradient-to-b from-yellow-50 to-amber-100",
    filterClass: "brightness-115 saturate-125 contrast-110",
    emojiFallback: "😻",
    emojiSizeClass: "text-6xl",
    hasAura: true,
    hasSparkle: true,
    glowClass: "shadow-[0_0_32px_12px_rgba(234,179,8,0.6)]",
  },
};

export function getCatVisualByStage(stage: GrowthStage): CatVisual {
  const meta = STAGE_VISUAL[stage];
  return {
    stage,
    stageLabel: formatGrowthStageLabel(stage),
    imageSrc: BASE_CAT_IMAGE,
    riveSrc: RIVE_SRC,
    riveAnimation: getRiveAnimationForStage(stage),
    ...meta,
  };
}
