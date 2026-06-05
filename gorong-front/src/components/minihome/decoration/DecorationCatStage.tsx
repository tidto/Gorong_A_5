import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ROOM_BACKGROUND_BY_ID,
  type RoomBackgroundId,
} from "../../../utils/minihome/cat-tower/catTowerRoomBackground";
import CatTowerRoomAmbience from "../cat-tower/CatTowerRoomAmbience";
import CatTowerRoomPlacedItems from "../cat-tower/CatTowerRoomPlacedItems";
import type { RoomPlacement } from "../../../utils/minihome/cat-tower/catTowerRoomCatalog";

type DecorationCatStageProps = {
  children: ReactNode;
  hint?: string;
  roomBackground?: RoomBackgroundId;
  roomItems?: RoomPlacement[];
};

/** 꾸미기 모달 — 저장된 방 배경·소품과 동일한 스테이지 */
export default function DecorationCatStage({
  children,
  hint = "냥이를 터치해 보세요",
  roomBackground = "BASIC_ROOM",
  roomItems = [],
}: DecorationCatStageProps) {
  const bg = ROOM_BACKGROUND_BY_ID[roomBackground] ?? ROOM_BACKGROUND_BY_ID.BASIC_ROOM;
  const isDark = bg.isDark ?? false;

  return (
    <div
      className={`relative flex min-h-[300px] flex-1 flex-col items-center justify-center overflow-hidden sm:min-h-[360px] lg:min-h-[400px] ${bg.stageClass}`}
    >
      <CatTowerRoomAmbience theme={bg.theme} isDark={isDark} />
      <CatTowerRoomPlacedItems items={roomItems} isDark={isDark} />
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${bg.glowClass}`} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-[22%] bg-gradient-to-t ${bg.floorClass} to-transparent`}
      />

      {/* 발 밑 부드러운 하이라이트 (Rive 박스 밖, 노란 사각형 느낌 방지) */}
      <motion.div
        className={`pointer-events-none absolute bottom-[8%] left-1/2 h-[18%] w-[42%] max-w-[200px] -translate-x-1/2 rounded-[100%] blur-xl ${
          isDark ? "bg-indigo-400/12" : "bg-white/35"
        }`}
        animate={{ opacity: [0.5, 0.75, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />

      <div
        className={`pointer-events-none absolute bottom-[10%] h-4 w-[36%] max-w-[180px] rounded-[100%] blur-md sm:h-5 ${
          isDark ? "bg-indigo-950/35" : "bg-amber-900/20"
        }`}
        aria-hidden
      />

      {/* 캐릭터 영역 */}
      <motion.div
        className="relative z-10 flex w-full max-w-[min(100%,560px)] items-end justify-center overflow-visible px-1 pb-2"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        {children}
      </motion.div>

      <motion.p
        className={`pointer-events-none absolute bottom-3 z-20 text-center text-[11px] font-bold tracking-wide ${
          isDark ? "text-indigo-200/45" : "text-amber-900/45"
        }`}
        animate={{ opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      >
        {hint} 🐾
      </motion.p>
    </div>
  );
}
