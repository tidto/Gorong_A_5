import { BookOpen, RefreshCw, Search } from "lucide-react";
import CatTowerVisitorWidget from "./CatTowerVisitorWidget";
import CatTowerGuestbookTeaser from "./CatTowerGuestbookTeaser";

export type CatTowerPanelId =
  | "room"
  | "room-decorate"
  | "items"
  | "activity"
  | "gallery"
  | "guestbook";

type CatTowerSideMenuProps = {
  activePanel: CatTowerPanelId;
  onSelectPanel: (id: CatTowerPanelId) => void;
  busy?: boolean;
  loading?: boolean;
  readOnly?: boolean;
  onCatDecorate: () => void;
  onBack: () => void;
  onEvents: () => void;
  onRefresh: () => void;
};

type MenuItem = {
  id: CatTowerPanelId | "cat-decorate" | "events" | "refresh";
  label: string;
  emoji: string;
  action?: "panel" | "cat-decorate" | "minihome" | "events" | "refresh";
};

const MENU_OWNER: MenuItem[] = [
  { id: "room", label: "내 방", emoji: "🏠", action: "panel" },
  { id: "room-decorate", label: "내 공간", emoji: "🖼️", action: "panel" },
  { id: "cat-decorate", label: "Go냥이 꾸미기", emoji: "👕", action: "cat-decorate" },
  { id: "items", label: "아이템함", emoji: "🎒", action: "panel" },
  { id: "activity", label: "활동 기록", emoji: "📋", action: "panel" },
  { id: "gallery", label: "갤러리", emoji: "🖼️", action: "panel" },
  { id: "guestbook", label: "방명록", emoji: "✉️", action: "panel" },
];

const MENU_GUEST: MenuItem[] = [
  { id: "room", label: "방 둘러보기", emoji: "🏠", action: "panel" },
  { id: "activity", label: "활동 기록", emoji: "📋", action: "panel" },
  { id: "gallery", label: "갤러리", emoji: "🖼️", action: "panel" },
  { id: "guestbook", label: "방명록", emoji: "✉️", action: "panel" },
];

const ICON_BOX = "flex h-7 w-7 shrink-0 items-center justify-center text-base";

export default function CatTowerSideMenu({
  activePanel,
  onSelectPanel,
  busy,
  loading,
  readOnly = false,
  onCatDecorate,
  onBack,
  onEvents,
  onRefresh,
}: CatTowerSideMenuProps) {
  const visibleMenu = readOnly ? MENU_GUEST : MENU_OWNER;

  function handleClick(item: MenuItem) {
    switch (item.action) {
      case "cat-decorate":
        onCatDecorate();
        break;
      case "minihome":
        onMiniHome();
        break;
      case "events":
        onEvents();
        break;
      case "refresh":
        onRefresh();
        break;
      case "panel":
        if (item.id !== "cat-decorate" && item.id !== "events" && item.id !== "refresh") {
          onSelectPanel(item.id as CatTowerPanelId);
        }
        break;
      default:
        break;
    }
  }

  return (
    <nav className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-3xl border border-orange-100/90 bg-white/90 shadow-[0_4px_16px_rgba(255,140,80,0.08)] backdrop-blur-sm">
        <div className="border-b border-orange-100/80 bg-gradient-to-r from-orange-400 to-amber-400 px-3 py-2.5 text-center text-[11px] font-extrabold text-white">
          📌 메뉴
        </div>
        <ul className="p-2">
          {visibleMenu.map((item) => {
            const isActive = item.action === "panel" && item.id === activePanel;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleClick(item)}
                  className={`mb-1 flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? "translate-x-0.5 bg-gradient-to-r from-emerald-100/90 to-orange-50 text-emerald-900 shadow-[0_0_14px_rgba(16,185,129,0.18)] ring-1 ring-emerald-200/80"
                      : "text-slate-700 hover:translate-x-1 hover:bg-orange-50/70 hover:shadow-sm"
                  }`}
                >
                  <span className={ICON_BOX}>{item.emoji}</span>
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <CatTowerVisitorWidget />
      <CatTowerGuestbookTeaser />

      <div className="flex flex-col gap-1.5">
        {readOnly ? (
          <button
            type="button"
            disabled={busy}
            onClick={onBack}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-orange-200 bg-white py-2 text-[11px] font-bold text-orange-900/80 shadow-sm transition hover:translate-x-0.5 hover:bg-orange-50 hover:shadow-md"
          >
            <BookOpen className="h-3.5 w-3.5" />
            내 CatTower로
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={onEvents}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-white py-2 text-[11px] font-bold text-emerald-900/80 shadow-sm transition hover:translate-x-0.5 hover:bg-emerald-50 hover:shadow-md"
        >
          <Search className="h-3.5 w-3.5" />
          행사 찾기
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onRefresh}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-[11px] font-bold text-slate-600 shadow-sm transition hover:translate-x-0.5 hover:bg-slate-50 hover:shadow-md"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </button>
      </div>
    </nav>
  );
}
