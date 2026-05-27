import type { Dispatch, SetStateAction } from "react";
import type { CatAppearance } from "../../utils/minihome/catAppearance";
import { COLOR_OPTIONS } from "../../utils/minihome/catAppearance";
import { motion } from "framer-motion";

/** 온보딩 등 — 색상만 선택 */
export default function CatCustomizeSection(props: {
  draft: CatAppearance;
  setDraft: Dispatch<SetStateAction<CatAppearance>>;
  disabled?: boolean;
}) {
  const { draft, setDraft, disabled } = props;

  return (
    <div>
      <p className="mb-2 text-center text-xs font-extrabold text-amber-800/50">고냥이 색을 골라주세요</p>
      <div className="flex flex-wrap justify-center gap-3">
        {COLOR_OPTIONS.map((opt) => {
          const on = draft.color === opt.id;
          return (
            <motion.button
              key={opt.id}
              type="button"
              disabled={disabled}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => setDraft({ color: opt.id })}
              className={`flex h-14 w-14 flex-col items-center justify-center rounded-2xl border-2 text-2xl transition-shadow ${
                on
                  ? "border-amber-400 bg-white shadow-md"
                  : "border-amber-100 bg-amber-50/80 hover:border-amber-200"
              }`}
            >
              {opt.emoji}
              <span className="mt-0.5 text-[9px] font-bold text-amber-900">{opt.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
