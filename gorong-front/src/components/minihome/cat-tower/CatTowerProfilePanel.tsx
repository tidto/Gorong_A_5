import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import type { GrowthState } from "../../../utils/minihome/growth/growth";
import GrowthStageBadge from "../growth/GrowthStageBadge";
import CatTowerDailyQuote from "./CatTowerDailyQuote";
const CatTowerParticipatingEvents = lazy(() => import("./CatTowerParticipatingEvents"));

type CatTowerProfilePanelProps = {
  nickname: string;
  catName: string;
  growth: GrowthState;
  isPublic: boolean;
  galleryCount?: number;
  loading?: boolean;
  showParticipatingEvents?: boolean;
  guestView?: boolean;
  refreshToken?: number;
};

/** 왼쪽 — 싸이월드/동물농장 스타일 프로필 카드 */
export default function CatTowerProfilePanel({
  nickname,
  catName,
  growth,
  isPublic,
  galleryCount = 0,
  loading,
  showParticipatingEvents = false,
  guestView = false,
  refreshToken = 0,
}: CatTowerProfilePanelProps) {
  return (
    <aside className="flex flex-col gap-3">
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className={`overflow-hidden rounded-3xl border bg-gradient-to-b via-white to-rose-50/30 shadow-[0_4px_20px_rgba(16,185,129,0.1)] transition-shadow duration-300 hover:shadow-[0_8px_28px_rgba(16,185,129,0.14)] ${
          guestView
            ? "border-sky-100/90 from-sky-50/95 hover:shadow-[0_8px_28px_rgba(56,189,248,0.14)]"
            : "border-emerald-100/90 from-emerald-50/95 hover:shadow-[0_8px_28px_rgba(16,185,129,0.14)]"
        }`}
      >
        <div
          className={`border-b px-3 py-2.5 text-center text-xs font-extrabold tracking-wide text-white sm:text-sm ${
            guestView
              ? "border-sky-100/70 bg-gradient-to-r from-sky-500 to-violet-500"
              : "border-emerald-100/70 bg-gradient-to-r from-emerald-500 to-teal-500"
          }`}
        >
          {guestView ? `👀 ${catName} 프로필` : "🌿 MY Go냥이 프로필"}
        </div>

        <div className="space-y-4 p-4">
          <div className="text-center">
            <div className="relative mx-auto flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border-[3px] border-white bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 text-4xl shadow-[0_6px_18px_rgba(255,140,80,0.22)] ring-2 ring-orange-200/60">
              🐱
              <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-400 text-[9px] shadow-sm">
                ★
              </span>
            </div>
            <p className="mt-2 text-xs font-bold text-emerald-800/70">{nickname || "주인"}</p>
            <h2 className="mt-0.5 text-lg font-extrabold text-slate-900">
              {loading ? "…" : catName}
            </h2>
            {guestView ? (
              <span className="mt-1.5 inline-block rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold text-sky-800">
                방문 중
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap justify-center gap-1.5">
            <GrowthStageBadge
              stage={growth.stage}
              activityCount={growth.activityCount}
              compact
              glow
            />
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                isPublic ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
              }`}
            >
              {isPublic ? "🌍 공개" : "🔒 비공개"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-emerald-100/80 bg-white/90 px-2 py-2.5 text-center shadow-sm">
              <p className="text-sm font-extrabold text-slate-800">{growth.stageLabel}</p>
              <p className="mt-0.5 text-[10px] font-semibold text-emerald-700/70">성장</p>
            </div>
            <div className="rounded-xl border border-orange-100/80 bg-white/90 px-2 py-2.5 text-center shadow-sm">
              <p className="text-sm font-extrabold text-orange-700">{growth.activityCount}</p>
              <p className="mt-0.5 text-[10px] font-semibold text-orange-800/60">활동</p>
            </div>
            <div className="rounded-xl border border-sky-100/80 bg-white/90 px-2 py-2.5 text-center shadow-sm">
              <p className="text-sm font-extrabold text-sky-800">{galleryCount}</p>
              <p className="mt-0.5 text-[10px] font-semibold text-sky-700/60">갤러리</p>
            </div>
          </div>

          {!growth.isMax ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-emerald-800/60">다음 성장까지</p>
                <p className="text-xs font-bold text-orange-700/80">{Math.round(growth.progressPercent)}%</p>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-orange-100/90 shadow-inner">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-orange-400 via-amber-400 to-orange-300"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(growth.progressPercent)}%` }}
                  transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
                />
              </div>
              <p className="text-xs font-medium text-slate-500/90">
                {growth.xpToNext}회 더 참여하면 성장!
              </p>
            </div>
          ) : null}
        </div>
      </motion.div>

      <CatTowerDailyQuote catName={catName} guestView={guestView} />

      {showParticipatingEvents ? (
        <Suspense fallback={null}>
          <CatTowerParticipatingEvents enabled refreshToken={refreshToken} />
        </Suspense>
      ) : null}
    </aside>
  );
}
