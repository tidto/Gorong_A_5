import { motion } from "framer-motion";
import {
  CATTOWER_VIEW_PANELS,
  catTowerPanelLabel,
  type CatTowerCenterPanelId,
} from "./catTowerPanelTypes";

type Props = {
  activePanel: CatTowerCenterPanelId;
  onPanelChange: (panel: CatTowerCenterPanelId) => void;
  disabled?: boolean;
  guestView?: boolean;
};

/** 모바일 — 중앙 패널 전환 탭 (lg 이상에서는 사이드 메뉴 사용) */
export default function CatTowerMobileTabs({
  activePanel,
  onPanelChange,
  disabled,
  guestView = false,
}: Props) {
  return (
    <div
      className={`sticky top-2 z-30 rounded-2xl border bg-white/95 p-1.5 shadow-[0_4px_18px_rgba(255,140,80,0.12)] backdrop-blur-md lg:hidden ${
        guestView ? "border-sky-100/90 shadow-[0_4px_18px_rgba(56,189,248,0.12)]" : "border-orange-100/90"
      }`}
      role="tablist"
      aria-label={guestView ? "방문 중 미니홈 메뉴" : "미니홈 메뉴"}
    >
      <div className="grid grid-cols-4 gap-1">
        {CATTOWER_VIEW_PANELS.map((item) => {
          const active = activePanel === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={disabled}
              onClick={() => onPanelChange(item.id)}
              className={`relative flex flex-col items-center gap-0.5 rounded-xl px-1 py-2.5 text-xs font-bold transition ${
                active ? "text-orange-900" : "text-slate-600 hover:bg-orange-50/70"
              }`}
            >
              {active ? (
                <motion.span
                  layoutId="cattower-mobile-tab"
                  className="absolute inset-0 rounded-xl bg-gradient-to-b from-orange-100 to-amber-50 shadow-sm ring-1 ring-orange-200/80"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              ) : null}
              <span className="relative text-lg leading-none">{item.emoji}</span>
              <span className="relative truncate">
                {catTowerPanelLabel(item.id, { guestView, variant: "tab" })}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
