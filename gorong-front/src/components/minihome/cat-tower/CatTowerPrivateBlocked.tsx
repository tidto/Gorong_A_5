import { Lock } from "lucide-react";

type CatTowerPrivateBlockedProps = {
  message?: string;
  onBack: () => void;
};

/** 비공개 CatTower 방문 차단 화면 */
export default function CatTowerPrivateBlocked({
  message = "비공개 미니홈입니다. 주인만 볼 수 있어요.",
  onBack,
}: CatTowerPrivateBlockedProps) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-b from-slate-50 via-white to-slate-100/80 shadow-[0_8px_32px_rgba(100,116,139,0.12)]">
        <div className="border-b border-slate-200/70 bg-gradient-to-r from-slate-500 to-slate-600 px-5 py-3 text-center text-sm font-extrabold text-white">
          🔒 비공개 CatTower
        </div>

        <div className="space-y-5 px-6 py-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200/80 shadow-inner">
            <Lock className="h-9 w-9 text-slate-500" strokeWidth={2.2} />
          </div>

          <div className="space-y-2">
            <h1 className="text-lg font-extrabold text-slate-800">들어갈 수 없어요</h1>
            <p className="text-sm font-medium leading-relaxed text-slate-600">{message}</p>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-sm font-extrabold text-white shadow-md transition hover:brightness-105"
          >
            내 CatTower로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
