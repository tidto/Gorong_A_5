import { motion } from "framer-motion";
import { pickDailyQuote } from "../../../utils/minihome/cat-tower/catTowerPresentation";

type CatTowerDailyQuoteProps = {
  catName: string;
  guestView?: boolean;
};

/** 오늘의 한마디 — 싸이월드 감성 */
export default function CatTowerDailyQuote({ catName, guestView = false }: CatTowerDailyQuoteProps) {
  const quote = pickDailyQuote(catName);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-amber-100/90 bg-gradient-to-br from-amber-50 via-white to-rose-50/80 px-4 py-3 shadow-[0_2px_12px_rgba(251,191,36,0.12)]"
    >
      <span className="pointer-events-none absolute -right-1 -top-1 text-2xl opacity-20">💬</span>
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700/80">
        {guestView ? `${catName}의 한마디` : "오늘의 한마디"}
      </p>
      <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-700">{quote}</p>
    </motion.div>
  );
}
