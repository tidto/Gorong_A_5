import { BookOpen, RefreshCw, Search, Sparkles } from "lucide-react";
import {
  CATTOWER_VIEW_PANELS,
  type CatTowerCenterPanelId,
} from "./catTowerPanelTypes";
import CatTowerVisitorWidget from "./CatTowerVisitorWidget";
import { useCatTowerPageTheme } from "../../../contexts/CatTowerRoomThemeContext";

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
  const theme = useCatTowerPageTheme();

  const panelButtonClass = (active: boolean, disabled?: boolean) => {
    const base =
      "mb-1 flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-xs font-bold transition";
    if (disabled) return `${base} cursor-not-allowed opacity-50`;
    if (active) return `${base} translate-x-0.5 ${theme.sideMenuActiveClass}`;
    return `${base} hover:translate-x-0.5 hover:shadow-sm ${theme.sideMenuIdleClass}`;
  };

  return (
    <nav className="flex flex-col gap-2">
      <div
        className={`overflow-hidden rounded-3xl border backdrop-blur-sm transition-colors duration-500 ${theme.sideMenuClass}`}
      >
        <div
          className={`border-b px-3 py-2.5 text-center text-[11px] font-extrabold text-white ${theme.sideMenuHeaderClass}`}
        >
          📌 바로가기
        </div>
        <ul className="p-2">
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
                {item.id === "gallery"
                  ? "갤러리 보기"
                  : item.id === "activity"
                    ? "히스토리 보기"
                    : item.id === "guestbook"
                      ? "방명록 보기"
                      : item.label}
              </button>
            </li>
          ))}
        </ul>

        {canEdit && !readOnly ? (
          <div className={`border-t p-2 pt-1 ${theme.sideMenuDividerClass}`}>
            <p
              className={`mb-1 px-1 text-[9px] font-bold uppercase tracking-wide ${theme.isDark ? "text-indigo-300/50" : "text-slate-400"}`}
            >
              꾸미기
            </p>
            {onRoomDecorate ? (
              <button
                type="button"
                disabled={busy}
                onClick={onRoomDecorate}
                className="mb-1 flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-xs font-bold text-slate-700 transition hover:translate-x-0.5 hover:bg-emerald-50/70 hover:shadow-sm"
              >
                <span className={ICON_BOX}>🖼️</span>
                내 방 꾸미기
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={onCatDecorate}
              className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-xs font-bold text-slate-700 transition hover:translate-x-0.5 hover:bg-orange-50/70 hover:shadow-sm"
            >
              <span className={ICON_BOX}>👕</span>
              Go냥이 꾸미기
            </button>
          </div>
        ) : null}
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
