/** 방명록 coming soon — nostalgic 미니홈피 teaser */
export default function CatTowerGuestbookTeaser() {
  return (
    <div className="overflow-hidden rounded-2xl border border-dashed border-rose-200/80 bg-gradient-to-br from-rose-50/60 via-white to-orange-50/40 shadow-sm">
      <div className="border-b border-rose-100/60 bg-rose-400/90 px-3 py-1.5 text-center">
        <p className="text-[10px] font-extrabold text-white">✉️ 방명록</p>
      </div>
      <div className="px-3 py-3 text-center">
        <p className="text-[10px] font-bold text-rose-900/70">Coming Soon</p>
        <p className="mt-1 text-[9px] leading-relaxed text-slate-500/90">
          친구들이 남기는 따뜻한 한마디,
          <br />
          곧 이 공간에 모일 예정이에요 💌
        </p>
        <div className="mt-2 flex justify-center gap-1 opacity-40">
          <span className="text-sm">📝</span>
          <span className="text-sm">💕</span>
          <span className="text-sm">🐾</span>
        </div>
      </div>
    </div>
  );
}
