import { CATTOWER_STAGE_MIN_H } from "./catTowerLayout";

type Props = {
  label?: string;
};

/** 3D/2D 방 로딩·일시정지 시 가벼운 플레이스홀더 */
export default function CatTowerRoomStageFallback({
  label = "방 불러오는 중…",
}: Props) {
  return (
    <div
      className={`flex ${CATTOWER_STAGE_MIN_H} flex-col items-center justify-center rounded-[1.75rem] border border-orange-100/90 bg-gradient-to-b from-[#fffaf5] to-orange-50/50 shadow-[0_8px_32px_rgba(255,140,80,0.08)] ring-1 ring-orange-50`}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-300 border-t-transparent" />
      <p className="mt-3 text-xs font-semibold text-orange-800/70">{label}</p>
    </div>
  );
}
