import { motion } from "framer-motion";
import type { ActivityItem } from "../../../types/minihome/minihome";
import { getActivityDisplay } from "../../../utils/minihome/catTowerActivityDisplay";

type CatTowerRecentActivityCardsProps = {
  activities: ActivityItem[];
};

const MOCK_ACTIVITIES = [
  {
    emoji: "🌸",
    label: "벚꽃 축제 참여",
    sub: "2026.05.12 · mock",
    accent: "from-rose-50 to-pink-50 border-rose-100/80",
  },
  {
    emoji: "📸",
    label: "갤러리 사진 업로드",
    sub: "Go냥이와 함께한 추억",
    accent: "from-sky-50 to-blue-50 border-sky-100/80",
  },
  {
    emoji: "⭐",
    label: "Go냥이 성장!",
    sub: "TEEN 단계 달성",
    accent: "from-violet-50 to-purple-50 border-violet-100/80",
  },
];

/** 최근 활동 — 감성 카드 스타일 */
export default function CatTowerRecentActivityCards({ activities }: CatTowerRecentActivityCardsProps) {
  const isEmpty = activities.length === 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.35 }}
      className="overflow-hidden rounded-2xl border border-orange-100/70 bg-gradient-to-b from-white/90 to-orange-50/25 p-3.5 shadow-[0_2px_14px_rgba(255,140,80,0.07)] backdrop-blur-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-extrabold tracking-wide text-orange-900/80">✨ 최근 활동</p>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
            isEmpty ? "bg-slate-100 text-slate-500/80" : "bg-orange-100/80 text-orange-700/80"
          }`}
        >
          {isEmpty ? "demo" : `${activities.length}건`}
        </span>
      </div>

      {isEmpty ? (
        <ul className="space-y-2">
          {MOCK_ACTIVITIES.map((item, index) => (
            <motion.li
              key={item.label}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 0.72, x: 0 }}
              transition={{ delay: 0.15 + index * 0.08, duration: 0.3 }}
              className={`flex items-center gap-3 rounded-2xl border bg-gradient-to-r px-3.5 py-2.5 shadow-sm ${item.accent}`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/95 text-lg shadow-sm">
                {item.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold text-slate-600">{item.label}</p>
                <p className="mt-0.5 truncate text-[9px] text-slate-400">{item.sub}</p>
              </div>
            </motion.li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-2">
          {activities.map((activity, index) => {
            const display = getActivityDisplay(activity);
            return (
              <motion.li
                key={activity.activityId}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06, duration: 0.25 }}
                className={`group flex items-center gap-3 rounded-2xl border bg-gradient-to-r px-3.5 py-2.5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md ${display.accent}`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/95 text-lg shadow-[0_2px_6px_rgba(0,0,0,0.06)] ring-1 ring-white/80 transition duration-300 group-hover:scale-105">
                  {display.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-bold text-slate-700">{display.label}</p>
                  {activity.description ? (
                    <p className="mt-0.5 truncate text-[9px] font-medium text-slate-500/90">
                      {activity.description}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-[10px] opacity-0 transition group-hover:opacity-60">
                  →
                </span>
              </motion.li>
            );
          })}
        </ul>
      )}
    </motion.section>
  );
}
