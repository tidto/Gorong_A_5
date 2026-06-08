import type { EquipPreview } from "../../../../utils/minihome/gocat/items";
import type { GrowthStage } from "../../../../utils/minihome/growth/growth";
import GoCatVisual from "../../mini-home/GoCatVisual";

type Props = {
  growthStage: GrowthStage;
  activityCount: number;
  equipped?: EquipPreview | null;
  interactive?: boolean;
  playbackActive?: boolean;
};

/** 3D 캔버스 위 Go냥이 — 발 위치가 부모 anchor(바닥 중앙)에 맞춰짐 */
export default function GoCatRoomOverlay({
  growthStage,
  activityCount,
  equipped,
  interactive = true,
  playbackActive = true,
}: Props) {
  return (
    <div
      className={`relative bg-transparent ${
        interactive ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      <div className="gocat-room-overlay bg-transparent">
        <GoCatVisual
          stage={growthStage}
          variant="room-3d"
          equipped={equipped}
          activityCount={activityCount}
          interactive={interactive}
          playbackActive={playbackActive}
        />
      </div>
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 h-2.5 w-14 -translate-x-1/2 translate-y-2 rounded-[100%] bg-black/25 blur-sm"
        aria-hidden
      />
    </div>
  );
}
