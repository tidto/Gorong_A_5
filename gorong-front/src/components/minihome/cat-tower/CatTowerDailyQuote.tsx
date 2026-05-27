import { motion } from "framer-motion";
import { pickDailyQuote } from "../../../utils/minihome/cat-tower/catTowerPresentation";

type CatTowerDailyQuoteProps = {
  catName: string;
};

/** 오늘의 한마디 — 싸이월드 감성 */
export default function CatTowerDailyQuote({ catName }: CatTowerDailyQuoteProps) {
  const quote = pickDailyQuote(catName);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-amber-100/80 bg-gradient-to-r from-amber-50/90 via-white to-rose-50/70 px-3.5 py-2.5 shadow-sm"
    >
      <span className="pointer-events-none absolute -right-1 -top-1 text-lg opacity-25">💬</span>
      <p className="text-[9px] font-extrabold uppercase tracking-wider text-amber-700/70">
        오늘의 한마디
      </p>
      <p className="mt-0.5 text-[10px] font-semibold leading-relaxed text-slate-700/90">{quote}</p>
    </motion.div>
  );
}
