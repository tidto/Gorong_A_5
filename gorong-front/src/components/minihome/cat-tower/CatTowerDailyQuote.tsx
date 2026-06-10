import { motion } from "framer-motion";
import { pickDailyQuote } from "../../../utils/minihome/cat-tower/catTowerPresentation";
import { CATTOWER_CARD, cattowerCardHeader } from "../../../utils/minihome/cat-tower/catTowerTheme";

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
      className={CATTOWER_CARD}
    >
      <div className={cattowerCardHeader(guestView)}>
        <p>💬 {guestView ? `${catName}의 한마디` : "오늘의 한마디"}</p>
      </div>
      <div className="sidebar-card-body !space-y-0">
        <p className="text-xs font-semibold leading-relaxed text-slate-700">{quote}</p>
      </div>
    </motion.div>
  );
}
