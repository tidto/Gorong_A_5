import type { ReactNode } from "react";
import type { EquipPreview } from "../../../utils/minihome/gocat/items";
import type { GrowthStage } from "../../../utils/minihome/growth/growth";
import CatEquipOverlays from "./CatEquipOverlays";
import GoCatAnimatedBody from "./GoCatAnimatedBody";
import RiveCatPlayer from "./RiveCatPlayer";

type GoCatBodyStageProps = {
  boxPx: number;
  growthStage: GrowthStage;
  equipped?: EquipPreview | null;
  interactive?: boolean;
  showCrown?: boolean;
  onTap?: () => void;
  /** 배경 글로우 */
  showGlow?: boolean;
  /** false면 둥실거림 끔 (카드 정적 썸네일 등) */
  animateFloat?: boolean;
  /** false면 로드 실패 PNG 숨김 */
  suppressFallback?: boolean;
  playbackActive?: boolean;
  riveClassName?: string;
};

/**
 * Rive → HEAD/ACCESSORY
 * GoCatAnimatedBody 안에서 함께 움직임
 */
export default function GoCatBodyStage({
  boxPx,
  growthStage,
  equipped,
  interactive = false,
  showCrown = false,
  onTap,
  showGlow = true,
  animateFloat = true,
  suppressFallback = false,
  playbackActive = true,
  riveClassName = "riveLayer relative z-[1]",
}: GoCatBodyStageProps) {
  return (
    <GoCatAnimatedBody interactive={interactive} animateFloat={animateFloat}>
      {showGlow ? (
        <div
          className="pointer-events-none absolute left-1/2 top-[52%] z-0 h-[58%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-b from-amber-50/50 via-orange-50/30 to-transparent blur-md"
          aria-hidden
        />
      ) : null}
      <RiveCatPlayer
        growthStage={growthStage}
        interactive={interactive}
        onTap={onTap}
        enableIdleLife={animateFloat}
        suppressFallback={suppressFallback}
        playbackActive={playbackActive}
        className={riveClassName}
      />
      <CatEquipOverlays
        equipped={equipped}
        layer="front"
        boxPx={boxPx}
        showCrown={showCrown}
        className="z-[2]"
      />
    </GoCatAnimatedBody>
  );
}
