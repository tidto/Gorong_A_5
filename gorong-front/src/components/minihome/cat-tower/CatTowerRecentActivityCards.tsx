import { motion } from "framer-motion";
import type { ActivityItem } from "../../../types/minihome/minihome";
import { getActivityDisplay } from "../../../utils/minihome/cat-tower/catTowerActivityDisplay";

type CatTowerRecentActivityCardsProps = {
  activities: ActivityItem[];
  totalCount?: number;
  onViewAll?: () => void;
  embedded?: boolean;
};

function ActivityList({ activities }: { activities: ActivityItem[] }) {
  if (activities.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-orange-200/70 bg-white/60 px-4 py-6 text-center">
        <p className="text-xl opacity-50">📋</p>
        <p className="mt-1.5 text-[11px] font-bold text-orange-900/60">아직 활동 기록이 없어요</p>
        <p className="mt-0.5 text-[10px] text-slate-500">행사에 참여하면 기록이 쌓여요</p>
      </div>
    );
  }

  return (
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
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/95 text-base shadow-[0_2px_6px_rgba(0,0,0,0.06)] ring-1 ring-white/80">
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
          </motion.li>
        );
      })}
    </ul>
  );
}

/** 최근 활동 — 미리보기 카드 */
export default function CatTowerRecentActivityCards({
  activities,
  totalCount,
  onViewAll,
  embedded = false,
}: CatTowerRecentActivityCardsProps) {
  const total = totalCount ?? activities.length;
  const hasMore = total > activities.length;

  const header = (
    <div className="mb-3 flex items-center justify-between gap-2">
      {!embedded ? (
        <p className="text-[11px] font-extrabold tracking-wide text-orange-900/80">✨ 최근 활동</p>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
            total === 0 ? "bg-slate-100 text-slate-500/80" : "bg-orange-100/80 text-orange-700/80"
          }`}
        >
          {total}건
        </span>
        {hasMore && onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="rounded-full border border-orange-200 bg-white px-2.5 py-0.5 text-[9px] font-bold text-orange-700 transition hover:bg-orange-50"
          >
            전체보기 →
          </button>
        ) : null}
      </div>
    </div>
  );

  if (embedded) {
    return (
      <section>
        {header}
        <ActivityList activities={activities} />
      </section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.35 }}
      className="overflow-hidden rounded-2xl border border-orange-100/70 bg-gradient-to-b from-white/90 to-orange-50/25 p-3.5 shadow-[0_2px_14px_rgba(255,140,80,0.07)] backdrop-blur-sm"
    >
      {header}
      <ActivityList activities={activities} />
    </motion.section>
  );
}
