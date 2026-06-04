type CatTowerGuestbookTeaserProps = {
  count?: number;
  onOpen?: () => void;
};

/** 사이드 메뉴 — 방명록 요약 */
export default function CatTowerGuestbookTeaser({
  count = 0,
  onOpen,
}: CatTowerGuestbookTeaserProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full overflow-hidden rounded-2xl border border-rose-200/80 bg-gradient-to-br from-rose-50/60 via-white to-orange-50/40 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="border-b border-rose-100/60 bg-rose-400/90 px-3 py-1.5 text-center">
        <p className="text-[10px] font-extrabold text-white">✉️ 방명록</p>
      </div>
      <div className="px-3 py-3 text-center">
        <p className="text-lg font-extrabold tabular-nums text-rose-600">{count}</p>
        <p className="text-[9px] font-bold text-rose-900/60">받은 방명록</p>
        <p className="mt-1 text-[9px] leading-relaxed text-slate-500/90">
          친구들의 따뜻한 한마디 💌
        </p>
      </div>
    </button>
  );
}
