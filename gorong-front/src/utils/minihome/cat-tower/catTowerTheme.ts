import {
  GORONG_BADGE,
  GORONG_BADGE_ACCENT,
  GORONG_CARD,
  GORONG_PAGE,
  GORONG_PAGE_HEADER,
  gorongCardHeader,
} from "../../ui/gorongTheme";

/** CatTower — 고롱 공통 토큰 + 사이드바 카드 유틸 */

export const CATTOWER_PAGE = GORONG_PAGE;
export const CATTOWER_CARD = `sidebar-card w-full max-w-full ${GORONG_CARD}`;
export const cattowerCardHeader = (guestView = false) =>
  `${gorongCardHeader(guestView)} sidebar-card-header`;
export const CATTOWER_PAGE_HEADER = GORONG_PAGE_HEADER;
export const CATTOWER_BADGE = GORONG_BADGE;
export const CATTOWER_BADGE_ACCENT = GORONG_BADGE_ACCENT;

/** 카드 내부 소제목 (흰 배경 위) */
export const CATTOWER_SUB_HEADER =
  "border-b border-slate-100 bg-slate-50 px-3 py-2 text-center text-xs font-extrabold text-slate-600";
