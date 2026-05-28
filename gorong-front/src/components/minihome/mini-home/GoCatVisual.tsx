import { useMemo } from "react";
import type { GrowthStage } from "../../../utils/minihome/growth/growth";
import { getCatVisualByStage } from "../../../utils/minihome/gocat/catVisual";
import { normalizeEquipPreview, type EquipPreview } from "../../../utils/minihome/gocat/items";
import { growthStageScaleClass } from "../../../utils/minihome/growth/growthStageVisual";
import GrowthStageBadge from "../growth/GrowthStageBadge";
import GoCatBodyStage from "../rive/GoCatBodyStage";
import DecorateCatPreview from "../rive/DecorateCatPreview";
import CatSparkleRing from "../cat-tower/CatSparkleRing";

type GoCatVisualProps = {
  stage: GrowthStage;
  className?: string;
  variant?: "card" | "hero" | "room" | "customize";
  equipped?: EquipPreview | null;
  interactive?: boolean;
  activityCount?: number;
};

function CompactCatRig({
  stage,
  equipped,
  variant,
  interactive,
}: {
  stage: GrowthStage;
  equipped?: EquipPreview | null;
  variant: "card" | "hero" | "room";
  interactive: boolean;
}) {
  const isMaster = stage === "MASTER";
  const box = variant === "room" ? 420 : variant === "hero" ? 200 : 160;
  const safeEquipped = normalizeEquipPreview(equipped);

  const roomSizeStyle =
    variant === "room"
      ? { width: "min(420px, 78vw)", height: "min(420px, 78vw)" }
      : { width: box, height: box };

  return (
    <div
      className={`relative overflow-visible ${variant === "room" ? "group cursor-pointer" : ""}`}
      style={roomSizeStyle}
      data-gocat-wrapper
      data-box-px={variant === "room" ? 420 : box}
    >
      {isMaster && (variant === "hero" || variant === "room") ? (
        <div className="pointer-events-none absolute bottom-[6%] left-1/2 z-0 h-1/3 w-2/3 -translate-x-1/2 rounded-full bg-amber-200/15 blur-xl" />
      ) : null}
      {variant === "room" ? <CatSparkleRing /> : null}
      <div
        className={`relative h-full w-full origin-bottom transition-transform duration-500 ${growthStageScaleClass(stage)}`}
      >
        <GoCatBodyStage
          boxPx={variant === "room" ? 420 : box}
          growthStage={stage}
          equipped={safeEquipped}
          interactive={interactive}
          animateFloat={variant === "room" ? interactive : true}
          showCrown={isMaster && !safeEquipped.HEAD}
          showGlow={variant === "room"}
        />
      </div>
    </div>
  );
}

export default function GoCatVisual({
  stage,
  className = "",
  variant = "card",
  equipped = null,
  interactive = false,
  activityCount,
}: GoCatVisualProps) {
  const visual = useMemo(() => getCatVisualByStage(stage), [stage]);
  const safeEquipped = useMemo(() => normalizeEquipPreview(equipped), [equipped]);

  if (variant === "customize") {
    return (
      <DecorateCatPreview
        growthStage={stage}
        activityCount={activityCount}
        equipped={safeEquipped}
        interactive={interactive}
        className={className}
      />
    );
  }

  return (
    <div className={`flex flex-col items-center overflow-visible ${className}`}>
      <div className="relative flex items-end justify-center overflow-visible bg-transparent">
        <CompactCatRig stage={stage} equipped={safeEquipped} variant={variant} interactive={interactive} />
      </div>

      {variant === "hero" ? (
        <div className="mt-2 space-y-1">
          <GrowthStageBadge stage={stage} activityCount={activityCount} compact />
          <p className="text-center text-[10px] text-slate-500">{visual.stageLabel}</p>
        </div>
      ) : null}
    </div>
  );
}
