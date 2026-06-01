import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ROOM_BACKGROUND_OPTIONS,
  type RoomBackgroundId,
} from "../../../utils/minihome/cat-tower/catTowerRoomBackground";

type DecorateTab = "background" | "cat";

type CatTowerRoomBackgroundPanelProps = {
  selected: RoomBackgroundId;
  saved: RoomBackgroundId;
  isDirty: boolean;
  saving?: boolean;
  error?: string | null;
  onSelect: (id: RoomBackgroundId) => void;
  onSave: () => void;
  onCatDecorate?: () => void;
};

/** 내 공간 — 배경 선택 + category tab */
export default function CatTowerRoomBackgroundPanel({
  selected,
  saved,
  isDirty,
  saving,
  error,
  onSelect,
  onSave,
  onCatDecorate,
}: CatTowerRoomBackgroundPanelProps) {
  const [tab, setTab] = useState<DecorateTab>("background");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="overflow-hidden rounded-2xl border border-emerald-100/90 bg-gradient-to-b from-white via-white to-emerald-50/40 shadow-[0_4px_24px_rgba(16,185,129,0.1)]"
    >
      <div className="border-b border-emerald-100/80 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 px-3 py-3 text-center">
        <p className="text-[11px] font-extrabold text-white">🏡 내 공간 꾸미기</p>
        <p className="mt-0.5 text-[9px] font-medium text-white/80">배경·Go냥이를 꾸며 나만의 방을 완성해요</p>
      </div>

      {/* category tabs */}
      <div className="flex gap-1 border-b border-emerald-50/80 bg-white/70 p-2">
        {(
          [
            { id: "background" as const, label: "배경", emoji: "🖼️" },
            { id: "cat" as const, label: "Go냥이", emoji: "👕" },
          ] as const
        ).map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-bold transition duration-200 ${
                active
                  ? "bg-gradient-to-r from-emerald-100 to-teal-50 text-emerald-900 shadow-sm ring-1 ring-emerald-200/80"
                  : "text-slate-600 hover:bg-emerald-50/60"
              }`}
            >
              <span>{t.emoji}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-3 p-3.5">
        <AnimatePresence mode="wait">
          {tab === "background" ? (
            <motion.div
              key="bg"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="grid grid-cols-3 gap-2.5">
                {ROOM_BACKGROUND_OPTIONS.map((option) => {
                  const active = selected === option.id;
                  const savedMark = saved === option.id;
                  return (
                    <motion.button
                      key={option.id}
                      type="button"
                      onClick={() => onSelect(option.id)}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.98 }}
                      className={`group relative flex flex-col overflow-hidden rounded-2xl border-2 transition-shadow duration-300 ${
                        active
                          ? "border-orange-300 shadow-[0_0_28px_rgba(251,146,60,0.45),0_6px_18px_rgba(251,146,60,0.18)] ring-2 ring-orange-200/90"
                          : "border-emerald-100/90 hover:border-emerald-200/90 hover:shadow-lg"
                      }`}
                      title={option.label}
                    >
                      {active ? (
                        <span className="absolute right-1.5 top-1.5 z-10 rounded-full bg-gradient-to-r from-orange-400 to-amber-400 px-2 py-0.5 text-[7px] font-extrabold text-white shadow-sm">
                          ✓ 선택
                        </span>
                      ) : null}

                      <div className={`relative h-[5rem] overflow-hidden ${option.previewClass}`}>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.45),transparent_55%)]" />
                        {option.isDark ? (
                          <>
                            <span className="absolute left-2 top-2 text-[6px] text-white/70 animate-twinkle">
                              ✦
                            </span>
                            <span className="absolute right-3 top-3 text-[8px] text-white/50 animate-twinkle">
                              ✦
                            </span>
                          </>
                        ) : null}
                        <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 text-2xl transition duration-300 group-hover:scale-110 group-hover:-translate-y-1">
                          {option.emoji}
                        </span>
                      </div>

                      <div
                        className={`flex flex-col items-center px-2 py-2.5 transition ${
                          active ? "bg-orange-50/85" : "bg-white/95 group-hover:bg-emerald-50/50"
                        }`}
                      >
                        <span
                          className={`text-[9px] font-extrabold ${active ? "text-orange-800" : "text-slate-700"}`}
                        >
                          {option.label}
                        </span>
                        {savedMark ? (
                          <span className="mt-1 rounded-full bg-emerald-100 px-2 py-px text-[8px] font-bold text-emerald-700">
                            ✓ 저장됨
                          </span>
                        ) : (
                          <span className="mt-1 text-[8px] font-medium text-slate-400">미리보기</span>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {error ? (
                <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-center text-[10px] font-semibold text-red-700">
                  {error}
                </p>
              ) : null}

              <div className="mt-3 flex justify-center border-t border-emerald-50/80 pt-3">
                <button
                  type="button"
                  onClick={onSave}
                  disabled={!isDirty || saving}
                  className="rounded-full border border-emerald-300 bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2 text-[10px] font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {saving ? "저장 중…" : "✨ 배경 저장하기"}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="cat"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center rounded-2xl border border-dashed border-orange-200/80 bg-gradient-to-b from-orange-50/50 to-white px-4 py-6 text-center"
            >
              <span className="text-4xl">👕</span>
              <p className="mt-2 text-xs font-extrabold text-orange-900/85">Go냥이 꾸미기</p>
              <p className="mt-1 max-w-[200px] text-[10px] leading-relaxed text-slate-500">
                모자·안경 등 아이템을 장착하고 Go냥이를 꾸며 보세요
              </p>
              {onCatDecorate ? (
                <button
                  type="button"
                  onClick={onCatDecorate}
                  className="mt-4 rounded-full border border-orange-300 bg-gradient-to-r from-orange-500 to-amber-400 px-5 py-2 text-[10px] font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  꾸미기 모드 열기 →
                </button>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
