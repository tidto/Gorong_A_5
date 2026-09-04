import { X } from "lucide-react";
import type { ReactNode } from "react";

type CatTowerViewAllModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  emoji?: string;
  onClose: () => void;
  children: ReactNode;
};

/** 전체보기 — 활동·방명록·갤러리 공통 모달 */
export default function CatTowerViewAllModal({
  open,
  title,
  subtitle,
  emoji,
  onClose,
  children,
}: CatTowerViewAllModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-orange-100/90 bg-gradient-to-b from-white to-orange-50/30 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cattower-viewall-title"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-orange-100/80 bg-gradient-to-r from-orange-400/90 to-rose-400/90 px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/85">
              {emoji ? `${emoji} ` : ""}전체보기
            </p>
            <h2 id="cattower-viewall-title" className="text-sm font-extrabold text-white sm:text-base">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 text-[10px] font-medium text-white/75">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/30 bg-white/15 p-2 text-white backdrop-blur-sm transition hover:bg-white/25"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}
