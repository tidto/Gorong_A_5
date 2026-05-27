import { MOCK_ROOM_DECOR } from "../../../data/minihome/catTowerDashboardMock";

const POSITION_CLASS: Record<string, string> = {
  "top-left": "left-3 top-[5.5rem]",
  "top-right": "right-3 top-[5.5rem]",
  "bottom-left": "bottom-[4.5rem] left-3",
  "bottom-right": "bottom-[4.5rem] right-3",
};

type CatTowerRoomStickersProps = {
  isDark?: boolean;
};

/** 방 모서리 픽셀 감성 스티커 (mock 장식) */
export default function CatTowerRoomStickers({ isDark }: CatTowerRoomStickersProps) {
  return (
    <>
      {MOCK_ROOM_DECOR.map((decor, i) => (
        <div
          key={decor.id}
          className={`pointer-events-none absolute z-[15] ${POSITION_CLASS[decor.position]}`}
          style={{ animationDelay: `${i * 0.3}s` }}
        >
          <div
            className={`flex flex-col items-center rounded-xl border px-1.5 py-1 shadow-sm backdrop-blur-sm animate-float ${
              isDark
                ? "border-indigo-400/20 bg-indigo-950/50"
                : "border-white/70 bg-white/75"
            }`}
          >
            <span className="text-base leading-none">{decor.emoji}</span>
            <span
              className={`mt-0.5 text-[7px] font-bold ${isDark ? "text-indigo-200/60" : "text-slate-500/70"}`}
            >
              {decor.label}
            </span>
          </div>
        </div>
      ))}
    </>
  );
}
