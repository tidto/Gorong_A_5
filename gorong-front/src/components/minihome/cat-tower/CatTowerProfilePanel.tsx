import { lazy, Suspense, useState } from "react";
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
  canEdit?: boolean;
  showParticipatingEvents?: boolean;
  guestView?: boolean;
  refreshToken?: number;
  onVisibilityChange?: (isPublic: boolean) => Promise<void>;
};

function VisibilityBadge({
  isPublic,
  canEdit,
  saving,
  onToggle,
}: {
  isPublic: boolean;
  canEdit: boolean;
  saving: boolean;
  onToggle: () => void;
}) {
  const className = `inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold transition ${
    isPublic
      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200/90"
      : "bg-slate-100 text-slate-600 hover:bg-slate-200/90"
  } ${canEdit ? "cursor-pointer ring-1 ring-transparent hover:ring-emerald-200/80" : ""} ${
    saving ? "opacity-60" : ""
  }`;

  const label = saving ? "저장 중…" : isPublic ? "🌍 공개" : "🔒 비공개";

  if (!canEdit) {
    return <span className={className.replace("cursor-pointer", "")}>{label}</span>;
  }

  return (
    <button
      type="button"
      disabled={saving}
      onClick={onToggle}
      className={className}
      title={isPublic ? "비공개로 전환" : "공개로 전환"}
      aria-label={isPublic ? "미니홈 비공개로 전환" : "미니홈 공개로 전환"}
    >
      {label}
    </button>
  );
}

/** 왼쪽 — Go냥이 프로필 카드 + 오늘의 한마디 */
export default function CatTowerProfilePanel({
  nickname,
  catName,
  growth,
  isPublic,
  galleryCount = 0,
  loading,
  canEdit = false,
  showParticipatingEvents = false,
  guestView = false,
  refreshToken = 0,
  onVisibilityChange,
}: CatTowerProfilePanelProps) {
  const [savingVisibility, setSavingVisibility] = useState(false);

  async function handleToggleVisibility() {
    if (!canEdit || !onVisibilityChange || savingVisibility) return;
    setSavingVisibility(true);
    try {
      await onVisibilityChange(!isPublic);
    } catch {
      /* CatTower에서 토스트 처리 */
    } finally {
      setSavingVisibility(false);
    }
  }

  return (
    <aside className="sidebar-column">
      <motion.div
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className={`sidebar-card w-full max-w-full bg-gradient-to-b via-white to-rose-50/30 ${
          guestView
            ? "border-sky-100/90 from-sky-50/95"
            : !isPublic
              ? "border-slate-200/90 from-slate-50/95"
              : "border-emerald-100/90 from-emerald-50/95"
        }`}
      >
        <div
          className={`sidebar-card-header justify-center sm:text-sm ${
            guestView
              ? "border-sky-100/70 bg-gradient-to-r from-sky-500 to-violet-500"
              : !isPublic
                ? "border-slate-200/70 bg-gradient-to-r from-slate-500 to-slate-600"
                : "border-emerald-100/70 bg-gradient-to-r from-[#5DB08E] to-teal-500"
          }`}
        >
          {guestView ? `👀 ${catName} 프로필` : !isPublic ? "🔒 MY Go냥이 프로필" : "🌿 MY Go냥이 프로필"}
        </div>

        <div className="sidebar-card-body space-y-4">
          <div className="text-center">
            <div className="relative mx-auto flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-full border-[3px] border-orange-200/80 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 text-5xl shadow-[0_6px_18px_rgba(255,140,80,0.22)]">
              🐱
              <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-400 text-[9px] text-white shadow-sm">
                ★
              </span>
            </div>
            <p className="mt-2 text-xs font-bold text-emerald-800/70">{nickname || "주인"}</p>
            <h2 className="mt-0.5 text-lg font-extrabold tracking-tight text-slate-900">
              {loading ? "…" : catName}
            </h2>
            {guestView ? (
              <span className="mt-1.5 inline-block rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold text-sky-800">
                방문 중
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <GrowthStageBadge
              stage={growth.stage}
              activityCount={growth.activityCount}
              compact
              glow
            />
            {!guestView ? (
              <VisibilityBadge
                isPublic={isPublic}
                canEdit={canEdit}
                saving={savingVisibility}
                onToggle={handleToggleVisibility}
              />
            ) : null}
          </div>

          {canEdit && !guestView ? (
            <p
              className={`rounded-xl px-3 py-2 text-center text-[11px] font-semibold leading-relaxed ${
                isPublic
                  ? "bg-emerald-50/80 text-emerald-800/70"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {isPublic
                ? "🌍 공개 중 — 다른 사람이 내 CatTower를 방문할 수 있어요."
                : "🔒 비공개 중 — 다른 사람은 내 CatTower에 들어올 수 없어요. 뱃지를 탭하면 공개로 바꿀 수 있어요."}
            </p>
          ) : null}

          <div className="sidebar-card border-emerald-100/90 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50">
            <div className="sidebar-card-header justify-center border-emerald-100/70 bg-gradient-to-r from-emerald-500 to-teal-500">
              <p>📊 Go냥이 현황</p>
            </div>
            <div className="sidebar-card-body !space-y-0 grid grid-cols-3 divide-x divide-emerald-100/70 !p-0 py-3">
              <div className="text-center">
                <p className="text-xl font-extrabold tabular-nums text-emerald-700">
                  {growth.stageLabel}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-emerald-800/60">성장</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-extrabold tabular-nums text-orange-600">
                  {growth.activityCount}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-emerald-800/60">활동</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-extrabold tabular-nums text-teal-700">{galleryCount}</p>
                <p className="mt-0.5 text-xs font-semibold text-emerald-800/60">갤러리</p>
              </div>
            </div>
          </div>

          {!growth.isMax ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-emerald-800/60">다음 성장까지</p>
                <p className="text-xs font-bold text-orange-600">
                  {Math.round(growth.progressPercent)}%
                </p>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-orange-100 shadow-inner">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-300"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(growth.progressPercent)}%` }}
                  transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
                />
              </div>
              <p className="text-xs font-medium text-slate-500">
                {growth.xpToNext}회 더 참여하면 성장!
              </p>
            </div>
          ) : (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-bold text-amber-800">
              🏆 최고 성장 단계 달성!
            </p>
          )}
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
