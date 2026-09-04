import { CATTOWER_STAGE_MIN_H } from "./catTowerLayout";
import { CATTOWER_CARD } from "../../../utils/minihome/cat-tower/catTowerTheme";

type Props = {
  label?: string;
};

/** 3D/2D 방 로딩·일시정지 시 가벼운 플레이스홀더 */
export default function CatTowerRoomStageFallback({
  label = "방 불러오는 중…",
}: Props) {
  return (
    <div
      className={`${CATTOWER_CARD} flex ${CATTOWER_STAGE_MIN_H} w-full flex-col items-center justify-center`}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      <p className="mt-3 text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}
