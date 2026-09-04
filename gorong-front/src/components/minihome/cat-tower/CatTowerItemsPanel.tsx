import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GOCAT_MVP_ITEMS,
  getGoCatItemsByCategory,
  type GoCatItemCategory,
} from "../../../data/minihome/gocatItems";
import type { EquipPreview } from "../../../utils/minihome/gocat/items";
import { normalizeEquipPreview } from "../../../utils/minihome/gocat/items";

type CatTowerItemsPanelProps = {
  equipped: EquipPreview;
  onDecorate: () => void;
  canEdit?: boolean;
  readOnly?: boolean;
};

const TABS: { id: GoCatItemCategory; label: string; emoji: string }[] = [
  { id: "HEAD", label: "머리", emoji: "🎩" },
  { id: "FACE", label: "얼굴", emoji: "👓" },
  { id: "NECK", label: "목", emoji: "🎀" },
];

/** 아이템함 — category tab + equipped highlight */
export default function CatTowerItemsPanel({
  equipped,
  onDecorate,
  canEdit = true,
  readOnly = false,
}: CatTowerItemsPanelProps) {
  const [tab, setTab] = useState<GoCatItemCategory>("HEAD");
  const safeEquipped = normalizeEquipPreview(equipped);

  const items = useMemo(() => getGoCatItemsByCategory(tab), [tab]);

  const equippedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const slot of ["HEAD", "FACE", "NECK"] as const) {
      const code = safeEquipped[slot]?.itemCode?.toLowerCase();
      if (code) ids.add(code);
    }
    return ids;
  }, [safeEquipped]);

  return (
    <div className="overflow-hidden rounded-2xl border border-orange-100/80 bg-gradient-to-b from-orange-50/40 via-white to-rose-50/30 shadow-[0_4px_20px_rgba(255,140,80,0.08)]">
      <div className="border-b border-orange-100/70 bg-gradient-to-r from-orange-400 to-amber-400 px-3 py-2.5 text-center">
        <p className="text-[11px] font-extrabold text-white">
          {readOnly ? "🎒 장착 아이템" : "🎒 Go냥이 꾸미기 아이템"}
        </p>
        <p className="mt-0.5 text-[9px] font-medium text-white/80">
          {readOnly ? "이 Go냥이가 착용 중인 아이템이에요" : "머리·얼굴·목 아이템을 장착해 보세요"}
        </p>
      </div>

      {/* category tabs */}
      <div className="flex gap-1 border-b border-orange-50/80 bg-white/60 p-2">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-bold transition duration-200 ${
                active
                  ? "bg-gradient-to-r from-orange-100 to-amber-50 text-orange-900 shadow-sm ring-1 ring-orange-200/80"
                  : "text-slate-600 hover:bg-orange-50/60"
              }`}
            >
              <span>{t.emoji}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="p-3.5">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-3 gap-2 sm:grid-cols-3"
          >
            {items.map((item) => {
              const isWorn = equippedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`group relative flex flex-col items-center rounded-2xl border p-2.5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                    isWorn
                      ? "border-orange-300 bg-orange-50/80 ring-2 ring-orange-200/70 shadow-[0_0_12px_rgba(251,146,60,0.2)]"
                      : "border-white/90 bg-white/90 hover:border-orange-100"
                  }`}
                  title={item.name}
                >
                  {isWorn ? (
                    <span className="absolute -right-1 -top-1 rounded-full bg-orange-500 px-1.5 py-px text-[7px] font-extrabold text-white shadow-sm">
                      착용
                    </span>
                  ) : null}
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="h-11 w-11 object-contain transition duration-300 group-hover:scale-110"
                    draggable={false}
                  />
                  <span className="mt-1.5 line-clamp-1 text-[9px] font-bold text-slate-600">
                    {item.name}
                  </span>
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        <p className="mt-3 text-center text-[10px] text-orange-800/50">
          {readOnly
            ? equippedIds.size > 0
              ? "둘러보기 전용 · 수정할 수 없어요"
              : "장착한 아이템이 없어요"
            : `총 ${GOCAT_MVP_ITEMS.length}종 · 꾸미기에서 장착할 수 있어요`}
        </p>

        {canEdit ? (
          <button
            type="button"
            onClick={onDecorate}
            className="mt-2.5 w-full rounded-xl border border-orange-200 bg-white py-2 text-[10px] font-bold text-orange-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-50 hover:shadow-md"
          >
            👕 Go냥이 꾸미기 열기
          </button>
        ) : null}
      </div>
    </div>
  );
}
