import { BookOpen, RefreshCw, Search, Sparkles } from "lucide-react";
import {
  CATTOWER_VIEW_PANELS,
  catTowerPanelLabel,
  type CatTowerCenterPanelId,
} from "./catTowerPanelTypes";
import CatTowerVisitorWidget from "./CatTowerVisitorWidget";

type CatTowerSideMenuProps = {
  busy?: boolean;
  loading?: boolean;
  readOnly?: boolean;
  canEdit?: boolean;
  activePanel: CatTowerCenterPanelId;
  onPanelChange: (panel: CatTowerCenterPanelId) => void;
  onRoomDecorate?: () => void;
  onCatDecorate: () => void;
  onBack: () => void;
  onEvents: () => void;
  onRefresh: () => void;
  visitorTodayCount?: number;
  visitorTotalCount?: number;
  visitorStatsLoading?: boolean;
};

const ICON_BOX = "flex h-7 w-7 shrink-0 items-center justify-center text-base";

function panelButtonClass(active: boolean, disabled?: boolean): string {
  const base =
    "mb-1 flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-xs font-bold transition";
  if (disabled) return `${base} cursor-not-allowed opacity-50`;
  if (active) {
    return `${base} translate-x-0.5 bg-gradient-to-r from-orange-100 to-amber-50 text-orange-900 shadow-sm ring-1 ring-orange-200/80`;
  }
  return `${base} text-slate-700 hover:translate-x-0.5 hover:bg-orange-50/60 hover:shadow-sm`;
}

export default function CatTowerSideMenu({
  busy,
  loading,
  readOnly = false,
  canEdit = true,
  activePanel,
  onPanelChange,
  onRoomDecorate,
  onCatDecorate,
  onBack,
  onEvents,
  onRefresh,
  visitorTodayCount = 0,
  visitorTotalCount = 0,
  visitorStatsLoading,
}: CatTowerSideMenuProps) {
  return (
    <nav className="sidebar-column">
      <div className="sidebar-card w-full max-w-full border-orange-100/90 bg-white/90">
        <div className="sidebar-card-header justify-center border-orange-100/80 bg-gradient-to-r from-orange-400 to-amber-400 lg:hidden">
          ⚡ 빠른 실행
        </div>
        <div
          className={`sidebar-card-header hidden justify-center sm:text-sm lg:flex ${
            readOnly
              ? "border-sky-100/80 bg-gradient-to-r from-sky-400 to-violet-400"
              : "border-orange-100/80 bg-gradient-to-r from-orange-400 to-amber-400"
          }`}
        >
          {readOnly ? "👀 둘러보기" : "📌 바로가기"}
        </div>
        <ul className="sidebar-card-body hidden lg:block">
          {CATTOWER_VIEW_PANELS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => onPanelChange(item.id)}
                className={panelButtonClass(activePanel === item.id, busy)}
                aria-current={activePanel === item.id ? "page" : undefined}
              >
                <span className={ICON_BOX}>{item.emoji}</span>
                {catTowerPanelLabel(item.id, { guestView: readOnly, variant: "nav" })}
              </button>
            </li>
          ))}
        </ul>

        {canEdit && !readOnly ? (
          <div className="sidebar-card-body border-t border-orange-100/70 lg:border-t">
            <p className="mb-1 hidden px-1 text-xs font-bold uppercase tracking-wide text-slate-400 lg:block">
              꾸미기
            </p>
            <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-1 lg:gap-0">
            {onRoomDecorate ? (
              <button
                type="button"
                disabled={busy}
                onClick={onRoomDecorate}
                className="mb-0 flex w-full items-center justify-center gap-1.5 rounded-2xl px-2 py-2.5 text-left text-xs font-bold text-slate-700 transition hover:bg-emerald-50/70 hover:shadow-sm lg:mb-1 lg:justify-start lg:gap-2 lg:px-3"
              >
                <span className={ICON_BOX}>🖼️</span>
                <span className="truncate">방 꾸미기</span>
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={onCatDecorate}
              className="flex w-full items-center justify-center gap-1.5 rounded-2xl px-2 py-2.5 text-left text-xs font-bold text-slate-700 transition hover:bg-orange-50/70 hover:shadow-sm lg:justify-start lg:gap-2 lg:px-3"
            >
              <span className={ICON_BOX}>👕</span>
              <span className="truncate">Go냥이 꾸미기</span>
            </button>
            </div>
          </div>
        ) : null}
      </div>

      <CatTowerVisitorWidget
        todayCount={visitorTodayCount}
        totalCount={visitorTotalCount}
        loading={visitorStatsLoading}
      />

      <div className="sidebar-card w-full max-w-full border-slate-200/80 bg-white/95">
        <div className="sidebar-card-body">
          <div className="sidebar-card-actions-grid">
            {readOnly ? (
              <button
                type="button"
                disabled={busy}
                onClick={onBack}
                className="sidebar-action-btn col-span-2 border-orange-200 text-orange-900/80 hover:bg-orange-50"
              >
                <BookOpen className="h-3.5 w-3.5" />
                내 CatTower로
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={onEvents}
              className="sidebar-action-btn border-emerald-200 text-emerald-900/80 hover:bg-emerald-50"
            >
              <Search className="h-3.5 w-3.5" />
              행사 찾기
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onRefresh}
              className="sidebar-action-btn border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              새로고침
            </button>
          </div>
          {!readOnly ? (
            <p className="flex items-center justify-center gap-1 py-0.5 text-xs font-medium text-slate-400">
              <Sparkles className="h-3 w-3" />
              미니홈피 감성
            </p>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
