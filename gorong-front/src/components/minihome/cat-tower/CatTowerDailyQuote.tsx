import { motion } from "framer-motion";
import { pickDailyQuote } from "../../../utils/minihome/cat-tower/catTowerPresentation";

type CatTowerDailyQuoteProps = {
  catName: string;
  guestView?: boolean;
};

/** 오늘의 한마디 — 프로필 하단 카드 */
export default function CatTowerDailyQuote({ catName, guestView = false }: CatTowerDailyQuoteProps) {
  const quote = pickDailyQuote(catName);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.4 }}
      className="sidebar-card w-full max-w-full border-amber-100/90 bg-gradient-to-br from-amber-50/90 via-[#fffaf5] to-rose-50/60"
    >
      <div className="sidebar-card-header justify-center border-amber-100/70 bg-gradient-to-r from-amber-400 to-orange-400">
        <p>💬 {guestView ? `${catName}의 한마디` : "오늘의 한마디"}</p>
      </div>
      <div className="sidebar-card-body !space-y-0">
        <p className="text-xs font-semibold leading-relaxed text-slate-700">{quote}</p>
      </div>
    </motion.div>
  );
}
