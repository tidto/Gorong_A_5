import {
  DEFAULT_ROOM_BACKGROUND,
  ROOM_BACKGROUND_BY_ID,
  type RoomBackgroundId,
} from "./catTowerRoomBackground";

export type CatTowerPageTheme = {
  pageBgClass: string;
  pageOrbClasses: [string, string, string];
  bannerClass: string;
  bannerBorderClass: string;
  shellClass: string;
  shellHeaderClass: string;
  shellTitleClass: string;
  profileCardClass: string;
  profileHeaderClass: string;
  profileStatsClass: string;
  profileLabelClass: string;
  sideMenuClass: string;
  sideMenuHeaderClass: string;
  sideMenuActiveClass: string;
  sideMenuIdleClass: string;
  sideMenuDividerClass: string;
  isDark: boolean;
};

const PAGE_THEMES: Record<RoomBackgroundId, CatTowerPageTheme> = {
  BASIC_ROOM: {
    pageBgClass: "bg-gradient-to-b from-rose-50 via-pink-50/95 to-amber-50",
    pageOrbClasses: [
      "bg-rose-200/25",
      "bg-pink-200/22",
      "bg-amber-100/30",
    ],
    bannerClass: "bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300",
    bannerBorderClass: "border-rose-200/70",
    shellClass:
      "border-rose-100/85 bg-gradient-to-b from-white/95 via-rose-50/25 to-pink-50/35 shadow-[0_12px_36px_rgba(244,114,182,0.12)]",
    shellHeaderClass: "border-rose-100/70 bg-gradient-to-r from-rose-50/95 to-pink-50/80",
    shellTitleClass: "text-rose-900/80",
    profileCardClass:
      "border-rose-100/90 bg-gradient-to-b from-rose-50/40 via-white to-pink-50/35 shadow-[0_4px_20px_rgba(244,114,182,0.12)]",
    profileHeaderClass: "border-rose-100/70 bg-gradient-to-r from-rose-400 to-pink-400",
    profileStatsClass: "border-rose-100/80 bg-rose-50/50",
    profileLabelClass: "text-rose-900/65",
    sideMenuClass:
      "border-rose-100/90 bg-white/92 shadow-[0_4px_16px_rgba(244,114,182,0.1)]",
    sideMenuHeaderClass: "border-rose-100/80 bg-gradient-to-r from-rose-400 to-pink-400",
    sideMenuActiveClass:
      "bg-gradient-to-r from-rose-100 to-pink-50 text-rose-900 shadow-sm ring-1 ring-rose-200/80",
    sideMenuIdleClass: "text-slate-700 hover:bg-rose-50/65",
    sideMenuDividerClass: "border-rose-100/70",
    isDark: false,
  },
  FOREST_ROOM: {
    pageBgClass: "bg-gradient-to-b from-emerald-50 via-green-50/95 to-lime-50",
    pageOrbClasses: [
      "bg-emerald-200/28",
      "bg-green-200/22",
      "bg-lime-100/28",
    ],
    bannerClass: "bg-gradient-to-r from-emerald-500 via-green-500 to-lime-400",
    bannerBorderClass: "border-emerald-200/70",
    shellClass:
      "border-emerald-100/85 bg-gradient-to-b from-white/95 via-emerald-50/25 to-lime-50/30 shadow-[0_12px_36px_rgba(16,185,129,0.12)]",
    shellHeaderClass: "border-emerald-100/70 bg-gradient-to-r from-emerald-50/95 to-lime-50/75",
    shellTitleClass: "text-emerald-900/80",
    profileCardClass:
      "border-emerald-100/90 bg-gradient-to-b from-emerald-50/45 via-white to-lime-50/30 shadow-[0_4px_20px_rgba(16,185,129,0.12)]",
    profileHeaderClass: "border-emerald-100/70 bg-gradient-to-r from-emerald-500 to-teal-500",
    profileStatsClass: "border-emerald-100/80 bg-emerald-50/50",
    profileLabelClass: "text-emerald-900/65",
    sideMenuClass:
      "border-emerald-100/90 bg-white/92 shadow-[0_4px_16px_rgba(16,185,129,0.1)]",
    sideMenuHeaderClass: "border-emerald-100/80 bg-gradient-to-r from-emerald-500 to-teal-500",
    sideMenuActiveClass:
      "bg-gradient-to-r from-emerald-100 to-lime-50 text-emerald-900 shadow-sm ring-1 ring-emerald-200/80",
    sideMenuIdleClass: "text-slate-700 hover:bg-emerald-50/65",
    sideMenuDividerClass: "border-emerald-100/70",
    isDark: false,
  },
  NIGHT_ROOM: {
    pageBgClass: "bg-gradient-to-b from-indigo-950 via-indigo-900 to-purple-950",
    pageOrbClasses: [
      "bg-indigo-500/15",
      "bg-violet-500/12",
      "bg-purple-600/10",
    ],
    bannerClass: "bg-gradient-to-r from-indigo-700 via-violet-700 to-purple-800",
    bannerBorderClass: "border-indigo-400/25",
    shellClass:
      "border-indigo-400/20 bg-gradient-to-b from-indigo-950/90 via-indigo-900/85 to-purple-950/90 shadow-[0_12px_36px_rgba(49,46,129,0.35)]",
    shellHeaderClass: "border-indigo-400/15 bg-indigo-950/55",
    shellTitleClass: "text-indigo-100/85",
    profileCardClass:
      "border-indigo-400/25 bg-gradient-to-b from-indigo-950/80 via-indigo-900/70 to-purple-950/75 shadow-[0_4px_20px_rgba(49,46,129,0.3)]",
    profileHeaderClass: "border-indigo-400/20 bg-gradient-to-r from-indigo-700 to-violet-700",
    profileStatsClass: "border-indigo-400/20 bg-indigo-950/45",
    profileLabelClass: "text-indigo-200/55",
    sideMenuClass:
      "border-indigo-400/25 bg-indigo-950/75 shadow-[0_4px_16px_rgba(30,27,75,0.4)]",
    sideMenuHeaderClass: "border-indigo-400/20 bg-gradient-to-r from-indigo-700 to-violet-700",
    sideMenuActiveClass:
      "bg-indigo-800/70 text-indigo-100 shadow-sm ring-1 ring-indigo-400/30",
    sideMenuIdleClass: "text-indigo-200/75 hover:bg-indigo-900/50",
    sideMenuDividerClass: "border-indigo-400/20",
    isDark: true,
  },
};

export function getCatTowerPageTheme(roomBackground: RoomBackgroundId): CatTowerPageTheme {
  return PAGE_THEMES[roomBackground] ?? PAGE_THEMES[DEFAULT_ROOM_BACKGROUND];
}

export function getCatTowerPageThemeFromOption(roomBackground: RoomBackgroundId) {
  const room = ROOM_BACKGROUND_BY_ID[roomBackground];
  return { page: getCatTowerPageTheme(roomBackground), room };
}
