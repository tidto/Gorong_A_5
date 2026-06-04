import { BookOpen, RefreshCw, Search, Sparkles } from "lucide-react";
import CatTowerVisitorWidget from "./CatTowerVisitorWidget";

type CatTowerSideMenuProps = {
  busy?: boolean;
  loading?: boolean;
  readOnly?: boolean;
  canEdit?: boolean;
  onRoomDecorate?: () => void;
  onCatDecorate: () => void;
  onBack: () => void;
  onEvents: () => void;
  onRefresh: () => void;
  onScrollToGuestbook?: () => void;
  visitorTodayCount?: number;
  visitorTotalCount?: number;
  visitorStatsLoading?: boolean;
};

const ICON_BOX = "flex h-7 w-7 shrink-0 items-center justify-center text-base";

export default function CatTowerSideMenu({
  busy,
  loading,
  readOnly = false,
  canEdit = true,
  onRoomDecorate,
  onCatDecorate,
  onBack,
  onEvents,
  onRefresh,
  onScrollToGuestbook,
  visitorTodayCount = 0,
  visitorTotalCount = 0,
  visitorStatsLoading,
}: CatTowerSideMenuProps) {
  return (
    <nav className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-3xl border border-orange-100/90 bg-white/90 shadow-[0_4px_16px_rgba(255,140,80,0.08)] backdrop-blur-sm">
        <div className="border-b border-orange-100/80 bg-gradient-to-r from-orange-400 to-amber-400 px-3 py-2.5 text-center text-[11px] font-extrabold text-white">
          📌 바로가기
        </div>
        <ul className="p-2">
          {canEdit && !readOnly && onRoomDecorate ? (
            <li>
              <button
                type="button"
                disabled={busy}
                onClick={onRoomDecorate}
                className="mb-1 flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-xs font-bold text-slate-700 transition hover:translate-x-0.5 hover:bg-emerald-50/70 hover:shadow-sm"
              >
                <span className={ICON_BOX}>🖼️</span>
                내 방 꾸미기
              </button>
            </li>
          ) : null}
          {canEdit && !readOnly ? (
            <li>
              <button
                type="button"
                disabled={busy}
                onClick={onCatDecorate}
                className="mb-1 flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-xs font-bold text-slate-700 transition hover:translate-x-0.5 hover:bg-orange-50/70 hover:shadow-sm"
              >
                <span className={ICON_BOX}>👕</span>
                Go냥이 꾸미기
              </button>
            </li>
          ) : null}
          <li>
            <button
              type="button"
              disabled={busy}
              onClick={onScrollToGuestbook}
              className="mb-1 flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-xs font-bold text-slate-700 transition hover:translate-x-0.5 hover:bg-rose-50/70 hover:shadow-sm"
            >
              <span className={ICON_BOX}>✉️</span>
              방명록 보기
            </button>
          </li>
        </ul>
      </div>

      <CatTowerVisitorWidget
        todayCount={visitorTodayCount}
        totalCount={visitorTotalCount}
        loading={visitorStatsLoading}
      />

      <div className="flex flex-col gap-1.5">
        {readOnly ? (
          <button
            type="button"
            disabled={busy}
            onClick={onBack}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-orange-200 bg-white py-2 text-[11px] font-bold text-orange-900/80 shadow-sm transition hover:bg-orange-50 hover:shadow-md"
          >
            <BookOpen className="h-3.5 w-3.5" />
            내 CatTower로
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={onEvents}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-white py-2 text-[11px] font-bold text-emerald-900/80 shadow-sm transition hover:bg-emerald-50 hover:shadow-md"
        >
          <Search className="h-3.5 w-3.5" />
          행사 찾기
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onRefresh}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-[11px] font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:shadow-md"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </button>
        {!readOnly ? (
          <p className="flex items-center justify-center gap-1 py-1 text-[9px] font-medium text-slate-400">
            <Sparkles className="h-3 w-3" />
            미니홈피 감성
          </p>
        ) : null}
      </div>
    </nav>
  );
}
