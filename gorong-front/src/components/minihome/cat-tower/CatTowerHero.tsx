import { RefreshCw, Search, Shirt, Sparkles } from "lucide-react";
import type { GrowthState } from "../../../utils/minihome/growth/growth";
import { normalizeEquipPreview, type EquipPreview } from "../../../utils/minihome/gocat/items";
import GoCatVisual from "../mini-home/GoCatVisual";
import GrowthStageBadge from "../growth/GrowthStageBadge";

type CatTowerHeroProps = {
  nickname: string;
  catName: string;
  growth: GrowthState;
  isPublic: boolean;
  equipped?: EquipPreview | null;
  loading?: boolean;
  busy?: boolean;
  onDecorate: () => void;
  onMiniHome: () => void;
  onEvents: () => void;
  onRefresh: () => void;
};

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm shadow-orange-200/50 transition hover:bg-orange-700 disabled:opacity-50";
const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-orange-900/90 shadow-sm transition hover:border-orange-300 hover:bg-orange-50/80 disabled:opacity-50";

export default function CatTowerHero({
  nickname,
  catName,
  growth,
  isPublic,
  equipped,
  loading,
  busy,
  onDecorate,
  onMiniHome,
  onEvents,
  onRefresh,
}: CatTowerHeroProps) {
  const safeEquipped = normalizeEquipPreview(equipped);

  return (
    <section className="overflow-hidden rounded-[2rem] border border-orange-100/90 bg-gradient-to-br from-[#fffaf5] via-white to-orange-50/40 shadow-sm">
      <div className="flex flex-col gap-8 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1 space-y-5">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-100 bg-white/80 px-3 py-1 text-[11px] font-bold tracking-wide text-orange-700/80">
              <span aria-hidden>🐱</span>
              CatTower
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              {loading ? "불러오는 중…" : "CatTower Dashboard"}
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-slate-600">
              {nickname && catName ? (
                <>
                  <span className="font-semibold text-slate-800">{nickname}</span>
                  <span className="text-slate-400"> · </span>
                  <span className="font-semibold text-orange-800">{catName}</span>
                  <span className="mt-1 block text-slate-500">
                    활동과 갤러리로 Go냥이를 키우고, 꾸미기로 나만의 스타일을 완성해 보세요.
                  </span>
                </>
              ) : (
                "미니홈피, 활동, 갤러리를 한곳에서 관리하세요."
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <GrowthStageBadge stage={growth.stage} activityCount={growth.activityCount} compact />
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
              {isPublic ? "공개" : "비공개"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={onDecorate} disabled={busy} className={btnPrimary}>
              <Shirt className="h-4 w-4" />
              꾸미기 모드
            </button>
            <button type="button" onClick={onMiniHome} disabled={busy} className={btnSecondary}>
              미니홈 관리
            </button>
            <button type="button" onClick={onEvents} disabled={busy} className={btnSecondary}>
              <Search className="h-4 w-4" />
              다음 행사 찾기
            </button>
            <button type="button" onClick={onRefresh} disabled={busy} className={btnSecondary}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              새로고침
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 lg:shrink-0 lg:items-end">
          <div className="relative flex items-end justify-center">
            <GoCatVisual
              stage={growth.stage}
              variant="card"
              equipped={safeEquipped}
              activityCount={growth.activityCount}
              interactive
            />
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-800/50">
            <Sparkles className="h-3 w-3" />
            터치해 Go냥이와 놀아보세요
          </div>
        </div>
      </div>
    </section>
  );
}
