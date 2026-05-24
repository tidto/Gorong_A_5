import type { GrowthState } from "../../utils/minihome/growth";

type GrowthProgressProps = {
  growth: GrowthState;
  /** hero: 미니홈 상단 그라데이션 / card: 흰·오렌지 카드 */
  tone?: "hero" | "card";
  compact?: boolean;
};

export default function GrowthProgress({
  growth,
  tone = "card",
  compact = false,
}: GrowthProgressProps) {
  const isHero = tone === "hero";

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div
            className={`text-xs font-bold uppercase tracking-wide ${
              isHero ? "text-white/80" : "text-orange-600"
            }`}
          >
            성장 단계
          </div>
          <div
            className={`font-extrabold ${compact ? "text-base" : "text-lg"} ${
              isHero ? "text-white" : "text-slate-900"
            }`}
          >
            {growth.stage} · {growth.stageLabel}
          </div>
        </div>
        {!growth.isMax && growth.nextStageLabel ? (
          <div className={`text-xs font-semibold ${isHero ? "text-white/90" : "text-slate-600"}`}>
            다음: {growth.nextStage} ({growth.nextStageLabel})
          </div>
        ) : (
          <div className={`text-xs font-semibold ${isHero ? "text-white/90" : "text-orange-700"}`}>
            최고 단계 달성
          </div>
        )}
      </div>

      <div
        className={`h-2.5 w-full overflow-hidden rounded-full ${
          isHero ? "bg-white/25" : "bg-orange-100"
        }`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isHero ? "bg-white" : "bg-gradient-to-r from-orange-500 to-amber-400"
          }`}
          style={{ width: `${growth.progressPercent}%` }}
        />
      </div>

      <div
        className={`flex flex-wrap justify-between gap-2 text-xs ${
          isHero ? "text-white/85" : "text-slate-600"
        }`}
      >
        <span>활동 {growth.activityCount}회</span>
        <span>경험치 {growth.experience}</span>
        {growth.isMax ? (
          <span className="font-semibold">100%</span>
        ) : (
          <span className="font-semibold">다음 단계까지 활동 {growth.xpToNext}회</span>
        )}
      </div>
    </div>
  );
}
