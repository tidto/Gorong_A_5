import type { GrowthStage } from "../../../utils/minihome/growth";
import { formatGrowthStageLabel } from "../../../utils/minihome/growth";
import { GROWTH_STAGE_BADGE } from "../../../utils/minihome/growthStageVisual";

type GrowthStageBadgeProps = {
  stage: GrowthStage;
  activityCount?: number;
  compact?: boolean;
  /** CatTower 프로필 — soft glow */
  glow?: boolean;
};

export default function GrowthStageBadge({ stage, activityCount, compact, glow }: GrowthStageBadgeProps) {
  const meta = GROWTH_STAGE_BADGE[stage];
  const label = formatGrowthStageLabel(stage);
  const glowClass = glow ? "shadow-[0_0_12px_rgba(251,146,60,0.25)] animate-gentle-glow" : "shadow-sm";

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold ring-1 ${glowClass} ${meta.ring} ${meta.bg} ${meta.text}`}
      >
        <span>{meta.emoji}</span>
        {stage}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-extrabold shadow-sm ${meta.ring} ${meta.bg} ${meta.text}`}
      >
        <span className="text-sm">{meta.emoji}</span>
        <span>
          성장 단계: {stage}
          <span className="ml-1 font-bold opacity-70">({label})</span>
        </span>
      </span>
      {typeof activityCount === "number" ? (
        <p className="text-[10px] font-semibold text-amber-800/45">활동 {activityCount}회 참여</p>
      ) : null}
    </div>
  );
}
