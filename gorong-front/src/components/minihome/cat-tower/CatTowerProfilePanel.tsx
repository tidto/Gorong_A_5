import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import type { GrowthState } from "../../../utils/minihome/growth/growth";
import GrowthStageBadge from "../growth/GrowthStageBadge";
import CatTowerProfileAvatar from "./CatTowerProfileAvatar";
import { pickDailyQuote } from "../../../utils/minihome/cat-tower/catTowerPresentation";
import { CATTOWER_CARD, cattowerCardHeader } from "../../../utils/minihome/cat-tower/catTowerTheme";
const CatTowerParticipatingEvents = lazy(() => import("./CatTowerParticipatingEvents"));

type CatTowerProfilePanelProps = {
  nickname: string;
  catName: string;
  growth: GrowthState;
  galleryCount?: number;
  loading?: boolean;
  showParticipatingEvents?: boolean;
  guestView?: boolean;
  refreshToken?: number;
};

/** 왼쪽 — Go냥이 프로필 카드 + 오늘의 한마디 */
export default function CatTowerProfilePanel({
  nickname,
  catName,
  growth,
  galleryCount = 0,
  loading,
  showParticipatingEvents = false,
  guestView = false,
  refreshToken = 0,
}: CatTowerProfilePanelProps) {
  const dailyQuote = pickDailyQuote(catName);

  return (
    <aside className="sidebar-column sidebar-column-compact">
      <motion.div transition={{ type: "spring", stiffness: 300, damping: 24 }} className={CATTOWER_CARD}>
        <div className={cattowerCardHeader(guestView)}>
          {guestView ? `👀 ${catName} 프로필` : "MY Go냥이 프로필"}
        </div>

        <div className="sidebar-card-body !space-y-2.5 !p-2.5">
          <div className="flex items-center gap-2.5">
            <CatTowerProfileAvatar loading={loading} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-bold text-slate-500">{nickname || "주인"}</p>
              <h2 className="truncate text-base font-extrabold text-slate-900">
                {loading ? "…" : catName}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <GrowthStageBadge
                  stage={growth.stage}
                  activityCount={growth.activityCount}
                  compact
                  glow
                />
                {guestView ? (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-bold text-slate-600">
                    방문 중
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/80 py-2">
            <div className="text-center">
              <p className="text-base font-extrabold tabular-nums text-primary-600">
                {growth.stageLabel}
              </p>
              <p className="text-[10px] font-semibold text-slate-500">성장</p>
            </div>
            <div className="text-center">
              <p className="text-base font-extrabold tabular-nums text-slate-900">
                {growth.activityCount}
              </p>
              <p className="text-[10px] font-semibold text-slate-500">활동</p>
            </div>
            <div className="text-center">
              <p className="text-base font-extrabold tabular-nums text-slate-900">{galleryCount}</p>
              <p className="text-[10px] font-semibold text-slate-500">갤러리</p>
            </div>
          </div>

          {!growth.isMax ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-slate-500">다음 성장까지</span>
                <span className="text-primary-600">{Math.round(growth.progressPercent)}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-orange-100">
                <motion.div
                  className="h-full rounded-full bg-primary-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(growth.progressPercent)}%` }}
                  transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
                />
              </div>
            </div>
          ) : (
            <p className="rounded-lg bg-amber-50 px-2 py-1.5 text-center text-[10px] font-bold text-amber-800">
              🏆 최고 성장 단계
            </p>
          )}

          <div className="border-t border-slate-100 pt-2">
            <p className="text-[10px] font-bold text-slate-400">
              💬 {guestView ? `${catName}의 한마디` : "오늘의 한마디"}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-snug text-slate-600">
              {dailyQuote}
            </p>
          </div>
        </div>
      </motion.div>

      {showParticipatingEvents ? (
        <Suspense fallback={null}>
          <CatTowerParticipatingEvents enabled refreshToken={refreshToken} />
        </Suspense>
      ) : null}
    </aside>
  );
}
