import { memo, useMemo } from "react";
import type { EquipPreview } from "../../../utils/minihome/gocat/items";
import { normalizeEquipPreview } from "../../../utils/minihome/gocat/items";
import type { GrowthStage } from "../../../utils/minihome/growth/growth";
import {
  ROOM_BACKGROUND_BY_ID,
  type RoomBackgroundId,
} from "../../../utils/minihome/cat-tower/catTowerRoomBackground";
import CatTowerRoomAmbience from "./CatTowerRoomAmbience";
import CatTowerRoomStickers from "./CatTowerRoomStickers";
import CatTowerSpeechBubble from "./CatTowerSpeechBubble";
import GoCatVisual from "../mini-home/GoCatVisual";

/** 미리보기 모달 전용 — CatTowerRoomStage와 분리된 고정 높이·중앙 스케일 레이아웃 */
const PREVIEW_STAGE_HEIGHT_PX = 380;
const PREVIEW_CAT_SCALE = 0.65;

type CatTowerPreviewStageProps = {
  growthStage: GrowthStage;
  activityCount: number;
  equipped?: EquipPreview | null;
  roomBackground?: RoomBackgroundId;
  catName?: string;
};

function CatTowerPreviewStage({
  growthStage,
  activityCount,
  equipped,
  roomBackground = "BASIC_ROOM",
  catName = "Go냥이",
}: CatTowerPreviewStageProps) {
  const safeEquipped = useMemo(() => normalizeEquipPreview(equipped), [equipped]);
  const bg = ROOM_BACKGROUND_BY_ID[roomBackground] ?? ROOM_BACKGROUND_BY_ID.BASIC_ROOM;
  const isDark = bg.isDark ?? false;

  return (
    <div
      className={`relative isolate overflow-hidden rounded-[1.75rem] shadow-[0_16px_40px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)] ${bg.stageClass}`}
      style={{ height: PREVIEW_STAGE_HEIGHT_PX }}
      data-cattower-preview-stage
    >
      <CatTowerRoomAmbience theme={bg.theme} isDark={isDark} />
      <CatTowerRoomStickers isDark={isDark} />

      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${bg.glowClass}`} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,rgba(255,255,255,0.35),transparent_62%)]" />
      <div
        className={`pointer-events-none absolute inset-x-[10%] bottom-[12%] h-[22%] rounded-[100%] blur-3xl ${
          isDark ? "bg-indigo-400/14" : "bg-amber-100/24"
        }`}
      />
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-[18%] bg-gradient-to-t ${bg.floorClass} to-transparent`}
      />

      {/* 헤더 — 고정 높이 */}
      <div
        className={`relative z-20 shrink-0 border-b px-3 py-2 text-center ${bg.headerBgClass}`}
      >
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[9px] font-extrabold ${
            isDark
              ? "border-indigo-400/25 bg-indigo-950/50 text-indigo-100/90"
              : "border-white/70 bg-white/60 text-slate-700/90"
          }`}
        >
          <span className="text-xs">{bg.emoji}</span>
          {bg.label}
        </span>
        <p className={`mt-0.5 text-[11px] font-extrabold ${bg.headerClass}`}>{catName}의 방</p>
      </div>

      {/* 말풍선 — 상단 좌측, 고양이와 겹치지 않게 */}
      <div className="pointer-events-none absolute left-2 top-[3.25rem] z-20 max-w-[130px] scale-90 origin-top-left">
        <CatTowerSpeechBubble catName={catName} isDark={isDark} animate={false} />
      </div>

      {/* 고양이 — 절대 중앙 + scale (flex/bottom 배치 없음) */}
      <div className="absolute inset-x-0 bottom-0 top-[3.25rem] z-10 overflow-visible">
        <div
          className="pointer-events-none absolute left-1/2 top-[55%] z-10 flex items-center justify-center overflow-visible"
          style={{
            transform: `translate(-50%, -50%) scale(${PREVIEW_CAT_SCALE})`,
            transformOrigin: "center center",
            width: 420,
            height: 420,
          }}
        >
          <GoCatVisual
            stage={growthStage}
            variant="room"
            equipped={safeEquipped}
            activityCount={activityCount}
            interactive={false}
            centerInBox
          />
        </div>

        {/* 바닥 그림자 — 고양이 발 아래 */}
        <div
          className={`pointer-events-none absolute left-1/2 top-[72%] z-[5] h-4 w-[42%] max-w-[200px] -translate-x-1/2 rounded-[100%] blur-xl ${
            isDark ? "bg-black/28" : "bg-emerald-900/12"
          }`}
        />
      </div>

      <p
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 border-t py-1.5 text-center text-[8px] font-medium ${
          isDark
            ? "border-indigo-400/12 bg-indigo-950/35 text-indigo-200/45"
            : "border-white/40 bg-white/35 text-slate-500/80"
        }`}
      >
        미리보기 · 장착 아이템 포함 🐾
      </p>
    </div>
  );
}

export default memo(CatTowerPreviewStage);
