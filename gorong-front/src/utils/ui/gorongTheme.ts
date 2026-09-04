/** 고롱 공통 UI — 메인(Layout)·CatTower·챗봇 등 페이지 톤 통일 */

export const GORONG_PAGE = "mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8";

export const GORONG_CARD =
  "rounded-2xl border border-slate-200/90 bg-white shadow-sm";

export const GORONG_PAGE_HEADER =
  "rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5";

export const GORONG_BADGE =
  "rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700";

export const GORONG_BADGE_ACCENT =
  "rounded-full border border-primary-200 bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700";

export function gorongCardHeader(guestView = false): string {
  if (guestView) {
    return "flex items-center justify-center gap-2 border-b border-slate-200/80 bg-slate-700 px-3 py-2.5 text-center text-xs font-extrabold tracking-wide text-white sm:text-sm";
  }
  return "flex items-center justify-center gap-2 border-b border-primary-600/20 bg-gradient-to-r from-primary-500 to-primary-600 px-3 py-2.5 text-center text-xs font-extrabold tracking-wide text-white sm:text-sm";
}
