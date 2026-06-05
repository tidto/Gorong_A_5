import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock } from "lucide-react";
import {
  ROOM_BACKGROUND_OPTIONS,
  type RoomBackgroundId,
} from "../../../utils/minihome/cat-tower/catTowerRoomBackground";
import {
  type RoomCatalogTab,
  type RoomPlacement,
  catalogForTab,
  isRoomItemOwned,
  roomUnlockHint,
  ROOM_CATALOG_BY_ID,
} from "../../../utils/minihome/cat-tower/catTowerRoomCatalog";
import { useNotification } from "../../../contexts/NotificationContext";
import CatTowerRoomPlacedItems from "./CatTowerRoomPlacedItems";
import {
  ROOM_BACKGROUND_BY_ID,
} from "../../../utils/minihome/cat-tower/catTowerRoomBackground";

type CatTowerRoomDecoratePanelProps = {
  selectedBg: RoomBackgroundId;
  savedBg: RoomBackgroundId;
  items: RoomPlacement[];
  ownedIds: Set<string>;
  isDirty: boolean;
  saving?: boolean;
  error?: string | null;
  onSelectBg: (id: RoomBackgroundId) => void;
  onToggleItem: (itemId: string) => void;
  onRemoveItem: (itemId: string) => void;
  onMoveItem: (itemId: string, x: number, y: number) => void;
  onSave: () => void;
  onCatDecorate?: () => void;
};

const TABS: { id: RoomCatalogTab | "cat"; label: string; emoji: string }[] = [
  { id: "background", label: "배경", emoji: "🖼️" },
  { id: "furniture", label: "가구", emoji: "🛋️" },
  { id: "decor", label: "장식", emoji: "✨" },
  { id: "cat", label: "Go냥이", emoji: "👕" },
];

export default function CatTowerRoomDecoratePanel({
  selectedBg,
  savedBg,
  items,
  ownedIds,
  isDirty,
  saving,
  error,
  onSelectBg,
  onToggleItem,
  onRemoveItem,
  onMoveItem,
  onSave,
  onCatDecorate,
}: CatTowerRoomDecoratePanelProps) {
  const [tab, setTab] = useState<RoomCatalogTab | "cat">("background");
  const { toast } = useNotification();
  const bg = ROOM_BACKGROUND_BY_ID[selectedBg] ?? ROOM_BACKGROUND_BY_ID.BASIC_ROOM;

  const handleLocked = (itemId: string) => {
    const entry = ROOM_CATALOG_BY_ID[itemId];
    toast(entry ? roomUnlockHint(entry) : "아직 해금되지 않았어요.", "info");
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-100/90 bg-gradient-to-b from-white via-white to-emerald-50/40 shadow-[0_4px_24px_rgba(16,185,129,0.1)]">
      <div className="border-b border-emerald-100/80 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 px-3 py-3 text-center">
        <p className="text-[11px] font-extrabold text-white">🏡 내 방 꾸미기</p>
        <p className="mt-0.5 text-[9px] font-medium text-white/80">
          배치 후 저장하면 방문자에게도 보여요
        </p>
      </div>

      <div
        className={`relative mx-3 mt-3 min-h-[140px] overflow-hidden rounded-2xl border shadow-inner ${bg.stageClass}`}
      >
        <CatTowerRoomPlacedItems
          items={items}
          isDark={bg.isDark}
          editable
          onMove={onMoveItem}
          onRemove={onRemoveItem}
        />
        <p
          className={`pointer-events-none absolute inset-x-0 bottom-2 text-center text-[8px] font-medium ${
            bg.isDark ? "text-indigo-200/50" : "text-slate-500/60"
          }`}
        >
          드래그로 위치 조절 · × 로 제거
        </p>
      </div>

      <div className="flex gap-1 border-b border-emerald-50/80 bg-white/70 p-2">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-0.5 rounded-xl py-2 text-[9px] font-bold transition ${
                active
                  ? "bg-gradient-to-r from-emerald-100 to-teal-50 text-emerald-900 shadow-sm ring-1 ring-emerald-200/80"
                  : "text-slate-600 hover:bg-emerald-50/60"
              }`}
            >
              <span className="text-xs">{t.emoji}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-3 p-3.5">
        <AnimatePresence mode="wait">
          {tab === "cat" ? (
            <motion.div
              key="cat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center rounded-2xl border border-dashed border-orange-200/80 bg-gradient-to-b from-orange-50/50 to-white px-4 py-6 text-center"
            >
              <span className="text-4xl">👕</span>
              <p className="mt-2 text-xs font-extrabold text-orange-900/85">Go냥이 꾸미기</p>
              <p className="mt-1 max-w-[220px] text-[10px] leading-relaxed text-slate-500">
                모자·안경·리본을 장착해 보세요.
              </p>
              {onCatDecorate ? (
                <button
                  type="button"
                  onClick={onCatDecorate}
                  className="mt-4 rounded-full border border-orange-300 bg-gradient-to-r from-orange-500 to-amber-400 px-5 py-2 text-[10px] font-bold text-white shadow-md"
                >
                  꾸미기 모드 열기 →
                </button>
              ) : null}
            </motion.div>
          ) : tab === "background" ? (
            <motion.div key="bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-3 gap-2.5">
                {ROOM_BACKGROUND_OPTIONS.map((option) => {
                  const catalog = ROOM_CATALOG_BY_ID[
                    option.id === "BASIC_ROOM"
                      ? "room_bg_basic"
                      : option.id === "FOREST_ROOM"
                        ? "room_bg_forest"
                        : "room_bg_night"
                  ];
                  const itemId = catalog?.id ?? "";
                  const unlocked = isRoomItemOwned(itemId, ownedIds);
                  const active = selectedBg === option.id;
                  const savedMark = savedBg === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        if (!unlocked) {
                          handleLocked(itemId);
                          return;
                        }
                        onSelectBg(option.id);
                      }}
                      className={`relative flex flex-col overflow-hidden rounded-2xl border-2 transition ${
                        !unlocked
                          ? "cursor-not-allowed border-dashed border-slate-200 opacity-55 grayscale"
                          : active
                            ? "border-orange-300 ring-2 ring-orange-200/90"
                            : "border-emerald-100/90 hover:border-emerald-200"
                      }`}
                    >
                      {!unlocked ? (
                        <span className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-slate-500 text-white">
                          <Lock className="h-3 w-3" />
                        </span>
                      ) : null}
                      <div className={`h-[4.5rem] ${option.previewClass}`}>
                        <span className="flex h-full items-center justify-center text-2xl">
                          {option.emoji}
                        </span>
                      </div>
                      <div className="px-2 py-2 text-center">
                        <span className="text-[9px] font-extrabold text-slate-700">{option.label}</span>
                        {savedMark ? (
                          <span className="mt-1 block text-[8px] font-bold text-emerald-600">✓ 저장됨</span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-3 gap-2">
                {catalogForTab(tab).map((entry) => {
                  const unlocked = isRoomItemOwned(entry.id, ownedIds);
                  const placed = items.some((i) => i.itemId === entry.id);
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => {
                        if (!unlocked) {
                          handleLocked(entry.id);
                          return;
                        }
                        onToggleItem(entry.id);
                      }}
                      className={`relative flex flex-col items-center rounded-2xl border-2 px-2 py-3 transition ${
                        !unlocked
                          ? "cursor-not-allowed border-dashed border-slate-200 opacity-55 grayscale"
                          : placed
                            ? "border-orange-300 bg-orange-50/80 ring-2 ring-orange-200/70"
                            : "border-emerald-100/90 bg-white hover:border-emerald-200"
                      }`}
                    >
                      {!unlocked ? (
                        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-500 text-[8px] text-white">
                          🔒
                        </span>
                      ) : null}
                      <span className="text-2xl">{entry.emoji}</span>
                      <span className="mt-1 text-[9px] font-extrabold text-slate-700">{entry.label}</span>
                      <span className="mt-0.5 text-[8px] font-medium text-slate-400">
                        {placed ? "배치됨 · 다시 누르면 제거" : unlocked ? "탭하여 배치" : "잠김"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-center text-[10px] font-semibold text-red-700">
            {error}
          </p>
        ) : null}

        <div className="flex justify-center gap-2 border-t border-emerald-50/80 pt-3">
          <button
            type="button"
            onClick={onSave}
            disabled={!isDirty || saving}
            className="rounded-full border border-emerald-300 bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2 text-[10px] font-bold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-45"
          >
            {saving ? "저장 중…" : "✨ 방 꾸미기 저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
