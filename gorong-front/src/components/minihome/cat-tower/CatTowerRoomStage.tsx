import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { EquipPreview } from "../../../utils/minihome/gocat/items";
import { normalizeEquipPreview, resolveEquipImageUrl } from "../../../utils/minihome/gocat/items";
import type { GrowthStage } from "../../../utils/minihome/growth/growth";
import {
  ROOM_BACKGROUND_BY_ID,
  type RoomBackgroundId,
} from "../../../utils/minihome/cat-tower/catTowerRoomBackground";
import {
  nextSpeechBubble,
  pickSpeechBubble,
  speechBubbleTilt,
} from "../../../utils/minihome/cat-tower/catTowerPresentation";
import CatTowerRoomAmbience from "./CatTowerRoomAmbience";
import CatTowerRoomStickers from "./CatTowerRoomStickers";
import GoCatVisual from "../mini-home/GoCatVisual";

type CatTowerRoomStageProps = {
  growthStage: GrowthStage;
  activityCount: number;
  equipped?: EquipPreview | null;
  roomBackground?: RoomBackgroundId;
  catName?: string;
  interactive?: boolean;
  readOnly?: boolean;
};

/** 중앙 — 방 배경 + Go냥이 (미니홈피 스테이지) */
export default function CatTowerRoomStage({
  growthStage,
  activityCount,
  equipped,
  roomBackground = "BASIC_ROOM",
  catName = "Go냥이",
  interactive = true,
  readOnly = false,
}: CatTowerRoomStageProps) {
  const safeEquipped = normalizeEquipPreview(equipped);
  const worn = (["HEAD", "ACCESSORY"] as const)
    .map((slot) => safeEquipped[slot])
    .filter(Boolean);
  const bg = ROOM_BACKGROUND_BY_ID[roomBackground] ?? ROOM_BACKGROUND_BY_ID.BASIC_ROOM;

  const [speech, setSpeech] = useState(() => pickSpeechBubble(catName));
  const speechTilt = speechBubbleTilt(speech);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSpeech((prev) => nextSpeechBubble(prev));
    }, 7000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={`relative flex min-h-[400px] flex-col overflow-hidden rounded-[1.75rem] shadow-[0_20px_50px_rgba(0,0,0,0.06),0_6px_20px_rgba(255,140,80,0.1),inset_0_1px_0_rgba(255,255,255,0.45)] sm:min-h-[500px] ${bg.stageClass}`}
    >
      <CatTowerRoomAmbience theme={bg.theme} isDark={bg.isDark} />
      <CatTowerRoomStickers isDark={bg.isDark} />

      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${bg.glowClass}`} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_58%,rgba(255,255,255,0.38),transparent_60%)]" />
      <div
        className={`pointer-events-none absolute inset-x-[12%] bottom-[18%] h-[26%] rounded-[100%] blur-3xl ${
          bg.isDark ? "bg-indigo-400/12" : "bg-amber-100/22"
        }`}
      />

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-[22%] bg-gradient-to-t ${bg.floorClass} to-transparent`}
      />

      {/* room title */}
      <div className={`relative z-20 border-b px-4 py-3 text-center ${bg.headerBgClass}`}>
        <div className="flex flex-col items-center gap-1">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-[10px] font-extrabold tracking-wide shadow-[0_2px_8px_rgba(0,0,0,0.06)] ${
              bg.isDark
                ? "border-indigo-400/20 bg-indigo-950/45 text-indigo-100/90"
                : "border-white/75 bg-white/65 text-slate-700/90"
            }`}
          >
            <span className="text-sm">{bg.emoji}</span>
            {bg.label}
          </span>
          <p className={`text-[12px] font-extrabold tracking-wide ${bg.headerClass}`}>
            {catName}의 방
          </p>
          <p
            className={`text-[9px] font-medium ${bg.isDark ? "text-indigo-200/50" : "text-slate-500/70"}`}
          >
            나만의 감성 미니홈피 🏠
          </p>
        </div>
      </div>

      {/* 말풍선 — rotate + fade */}
      <div className="pointer-events-none absolute left-3 top-[5.75rem] z-20 max-w-[152px] sm:left-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={speech}
            initial={{ opacity: 0, y: 8, scale: 0.92, rotate: speechTilt - 2 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: speechTilt }}
            exit={{ opacity: 0, y: -6, scale: 0.94, rotate: speechTilt + 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`rounded-2xl rounded-bl-sm border px-3 py-2 text-[9px] font-bold leading-snug shadow-[0_4px_12px_rgba(0,0,0,0.08)] ${
              bg.isDark
                ? "border-indigo-300/25 bg-indigo-950/70 text-indigo-100/90 backdrop-blur-md"
                : "border-white/85 bg-white/90 text-rose-800/85 backdrop-blur-md"
            }`}
          >
            {speech}
          </motion.div>
        </AnimatePresence>
      </div>

      <span className="pointer-events-none absolute right-5 top-[4.75rem] z-20 animate-sparkle text-sm opacity-60">
        ✨
      </span>
      <span
        className="pointer-events-none absolute right-14 top-[5.75rem] z-20 animate-twinkle text-[10px] opacity-45"
        style={{ animationDelay: "1.2s" }}
      >
        ✦
      </span>

      {/* Go냥이 */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-2 py-4 sm:px-4 sm:py-5">
        <div className="group relative flex flex-col items-center">
          {worn.length > 0 ? (
            <div className="absolute -top-2 z-20 flex flex-wrap justify-center gap-1">
              {worn.map((item) => (
                <motion.span
                  key={`badge-${item!.itemCode}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`rounded-full border px-2 py-0.5 text-[8px] font-extrabold shadow-sm backdrop-blur-sm ${
                    bg.isDark
                      ? "border-indigo-300/25 bg-indigo-900/65 text-indigo-100/90"
                      : "border-orange-200/70 bg-white/88 text-orange-800/85"
                  }`}
                >
                  ✓ {item!.itemName ?? item!.itemCode}
                </motion.span>
              ))}
            </div>
          ) : null}

          <GoCatVisual
            stage={growthStage}
            variant="room"
            equipped={safeEquipped}
            activityCount={activityCount}
            interactive={interactive && !readOnly}
          />

          {/* 바닥 그림자 — hover 시 살짝 축소 */}
          <div
            className={`pointer-events-none -mt-5 h-6 w-[min(280px,72%)] rounded-[100%] blur-2xl transition-all duration-500 group-hover:h-5 group-hover:opacity-80 ${
              bg.isDark ? "bg-black/32" : "bg-emerald-900/14"
            }`}
          />
          <div
            className={`pointer-events-none absolute bottom-0 left-1/2 h-3.5 w-[min(220px,58%)] -translate-x-1/2 rounded-[100%] blur-xl transition-all duration-500 group-hover:scale-95 ${
              bg.isDark ? "bg-indigo-950/45" : "bg-amber-900/12"
            }`}
          />
        </div>

        {!readOnly ? (
          <p
            className={`mt-2.5 text-[10px] font-medium tracking-wide ${
              bg.isDark ? "text-indigo-200/40" : "text-emerald-800/35"
            }`}
          >
            ✨ 터치하면 Go냥이와 놀 수 있어요
          </p>
        ) : null}
      </div>

      {worn.length > 0 ? (
        <div
          className={`relative z-20 border-t px-3 py-3 sm:px-4 ${
            bg.isDark
              ? "border-indigo-400/12 bg-indigo-950/40 backdrop-blur-md"
              : "border-white/45 bg-white/50 backdrop-blur-md"
          }`}
        >
          <p
            className={`text-center text-[9px] font-bold tracking-wider ${
              bg.isDark ? "text-indigo-200/50" : "text-emerald-800/45"
            }`}
          >
            💫 장착 중
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {worn.map((item) => {
              const imageUrl = resolveEquipImageUrl(item!);
              return (
                <motion.span
                  key={item!.itemCode ?? item!.itemName}
                  whileHover={{ y: -2, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.06)] ${
                    bg.isDark
                      ? "border-indigo-300/25 bg-indigo-900/60 text-indigo-100/90 ring-1 ring-indigo-400/20"
                      : "border-orange-200/70 bg-white/92 text-orange-900/85 ring-1 ring-orange-100/60"
                  }`}
                >
                  {imageUrl ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/85 shadow-inner">
                      <img
                        src={imageUrl}
                        alt=""
                        className="h-3.5 w-3.5 object-contain transition duration-300 group-hover:scale-110"
                        draggable={false}
                      />
                    </span>
                  ) : (
                    <span className="text-sm">🎀</span>
                  )}
                  {item!.itemName ?? item!.itemCode}
                </motion.span>
              );
            })}
          </div>
        </div>
      ) : (
        <p
          className={`relative z-20 border-t py-3 text-center text-[10px] font-medium ${
            bg.isDark
              ? "border-indigo-400/12 bg-indigo-950/28 text-indigo-200/45"
              : "border-white/45 bg-white/30 text-slate-500/85"
          }`}
        >
          {readOnly
            ? `${catName}의 Go냥이를 둘러보고 있어요 🐾`
            : "Go냥이 꾸미기 · 내 공간에서 나만의 방을 꾸며 보세요 ✨"}
        </p>
      )}
    </motion.div>
  );
}
