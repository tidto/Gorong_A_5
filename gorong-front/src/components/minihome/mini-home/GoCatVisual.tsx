import { memo, useMemo } from "react";
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
  variant?: "card" | "hero" | "room" | "room-preview" | "room-3d" | "customize";
  equipped?: EquipPreview | null;
  interactive?: boolean;
  activityCount?: number;
  /** room 계열 — 박스 안에서 수직 중앙 (미리보기 모달) */
  centerInBox?: boolean;
  playbackActive?: boolean;
};

function CompactCatRig({
  stage,
  equipped,
  variant,
  interactive,
  centerInBox,
  playbackActive = true,
}: {
  stage: GrowthStage;
  equipped?: EquipPreview | null;
  variant: "card" | "hero" | "room" | "room-preview" | "room-3d";
  interactive: boolean;
  centerInBox?: boolean;
  playbackActive?: boolean;
}) {
  const isMaster = stage === "MASTER";
  const isRoomLike = variant === "room" || variant === "room-preview" || variant === "room-3d";
  const isRoom3d = variant === "room-3d";
  const box =
    variant === "room-3d"
      ? 140
      : variant === "room"
        ? 420
        : variant === "room-preview"
          ? 260
          : variant === "hero"
            ? 200
            : 160;
  const safeEquipped = normalizeEquipPreview(equipped);

  const roomSizeStyle = isRoom3d
    ? { width: box, height: box }
    : isRoomLike
      ? {
          width: variant === "room-preview" ? "min(260px, 62vw)" : "min(420px, 78vw)",
          height: variant === "room-preview" ? "min(260px, 52vw)" : "min(420px, 78vw)",
        }
      : { width: box, height: box };

  return (
    <div
      className={`relative bg-transparent ${variant === "room" ? "group cursor-pointer overflow-visible" : ""} ${
        isRoom3d ? "gocat-room-3d-rig overflow-visible" : "overflow-hidden"
      }`}
      style={roomSizeStyle}
      data-gocat-wrapper
      data-box-px={isRoomLike ? box : box}
    >
      {isMaster && (variant === "hero" || variant === "room") ? (
        <div className="pointer-events-none absolute bottom-[6%] left-1/2 z-0 h-1/3 w-2/3 -translate-x-1/2 rounded-full bg-amber-200/15 blur-xl" />
      ) : null}
      {variant === "room" ? <CatSparkleRing /> : null}
      <div
        className={`relative h-full w-full bg-transparent ${
          isRoom3d
            ? "origin-bottom scale-100"
            : `transition-transform duration-500 ${growthStageScaleClass(stage)} ${
                centerInBox && isRoomLike ? "origin-center" : "origin-bottom"
              }`
        }`}
      >
        <GoCatBodyStage
          boxPx={box}
          growthStage={stage}
          equipped={safeEquipped}
          interactive={interactive}
          animateFloat={variant === "room" ? interactive : false}
          showCrown={isMaster && !safeEquipped.HEAD && !isRoom3d}
          showGlow={variant === "room"}
          suppressFallback={false}
          playbackActive={playbackActive}
          riveClassName="riveLayer relative z-[1] !bg-transparent"
        />
      </div>
    </div>
  );
}

function GoCatVisual({
  stage,
  className = "",
  variant = "card",
  equipped = null,
  interactive = false,
  activityCount,
  centerInBox = false,
  playbackActive = true,
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
      <div
        className={`relative flex justify-center overflow-visible bg-transparent ${
          variant === "room-3d"
            ? "items-end"
            : centerInBox && (variant === "room" || variant === "room-preview")
              ? "items-center"
              : "items-end"
        }`}
      >
        <CompactCatRig
          stage={stage}
          equipped={safeEquipped}
          variant={variant}
          interactive={interactive}
          centerInBox={centerInBox}
          playbackActive={playbackActive}
        />
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

export default memo(GoCatVisual);
