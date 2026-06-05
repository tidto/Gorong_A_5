import { motion } from "framer-motion";
import type { GrowthState } from "../../../utils/minihome/growth/growth";
import GrowthStageBadge from "../growth/GrowthStageBadge";
import CatTowerDailyQuote from "./CatTowerDailyQuote";
import CatTowerParticipatingEvents from "./CatTowerParticipatingEvents";
import { useCatTowerPageTheme } from "../../../contexts/CatTowerRoomThemeContext";

type CatTowerProfilePanelProps = {
  nickname: string;
  catName: string;
  growth: GrowthState;
  isPublic: boolean;
  galleryCount?: number;
  loading?: boolean;
  showParticipatingEvents?: boolean;
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
  refreshToken = 0,
}: CatTowerProfilePanelProps) {
  const theme = useCatTowerPageTheme();

  return (
    <aside className="flex flex-col gap-3">
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className={`overflow-hidden rounded-3xl border transition-shadow duration-500 hover:shadow-lg ${theme.profileCardClass}`}
      >
        <div
          className={`border-b px-3 py-2.5 text-center text-[11px] font-extrabold tracking-wide text-white ${theme.profileHeaderClass}`}
        >
          🌿 MY Go냥이 프로필
        </div>

        <div className="space-y-4 p-4">
          <div className="text-center">
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-orange-200/80 bg-gradient-to-br from-orange-50 to-amber-100 text-3xl shadow-[0_4px_14px_rgba(255,140,80,0.18)]">
              🐱
              <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-emerald-400 text-[8px] shadow-sm">
                ★
              </span>
            </div>
            <p className={`mt-2 text-[10px] font-bold ${theme.profileLabelClass}`}>
              {nickname || "주인"}
            </p>
            <h2
              className={`mt-0.5 text-lg font-extrabold ${theme.isDark ? "text-indigo-50" : "text-slate-900"}`}
            >
              {loading ? "…" : catName}
            </h2>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5">
            <GrowthStageBadge
              stage={growth.stage}
              activityCount={growth.activityCount}
              compact
              glow
            />
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                isPublic ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
              }`}
            >
              {isPublic ? "🌍 공개" : "🔒 비공개"}
            </span>
          </div>

          <dl
            className={`space-y-2 rounded-xl border border-dashed px-3 py-2.5 text-xs ${theme.profileStatsClass}`}
          >
            <div className="flex justify-between">
              <dt className={`font-semibold ${theme.profileLabelClass}`}>성장 단계</dt>
              <dd
                className={`font-extrabold ${theme.isDark ? "text-indigo-100" : "text-slate-800"}`}
              >
                {growth.stageLabel}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className={`font-semibold ${theme.profileLabelClass}`}>활동 횟수</dt>
              <dd className="font-extrabold text-orange-700">{growth.activityCount}회</dd>
            </div>
            <div className="flex justify-between">
              <dt className={`font-semibold ${theme.profileLabelClass}`}>갤러리</dt>
              <dd
                className={`font-extrabold ${theme.isDark ? "text-indigo-100" : "text-slate-800"}`}
              >
                {galleryCount}개
              </dd>
            </div>
          </dl>

          {!growth.isMax ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-emerald-800/50">다음 성장까지</p>
                <p className="text-[9px] font-bold text-orange-700/70">{growth.progressPercent}%</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-orange-100/80">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-orange-400 via-amber-400 to-orange-300"
                  initial={{ width: 0 }}
                  animate={{ width: `${growth.progressPercent}%` }}
                  transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
                />
              </div>
              <p className="text-[9px] font-medium text-slate-500/80">
                {growth.xpToNext}회 더 참여하면 성장!
              </p>
            </div>
          ) : null}
        </div>
      </motion.div>

      <CatTowerParticipatingEvents
        enabled={showParticipatingEvents}
        refreshToken={refreshToken}
      />

      <CatTowerDailyQuote catName={catName} />
    </aside>
  );
}
