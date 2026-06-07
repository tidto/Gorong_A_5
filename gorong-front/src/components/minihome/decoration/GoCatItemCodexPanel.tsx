import { Lock } from "lucide-react";
import type { GrowthStage } from "../../../utils/minihome/growth/growth";
import { listCodexItems } from "../../../utils/minihome/gocat/decorItemCatalog";
import { getRarityStyle } from "../../../utils/minihome/gocat/itemRarity";
import type { UserItem } from "../../../types/minihome/item";

type Props = {
  growthStage: GrowthStage;
  ownedItems?: UserItem[];
};

export default function GoCatItemCodexPanel({ growthStage, ownedItems = [] }: Props) {
  const items = listCodexItems(growthStage, ownedItems);
  const ownedCount = items.filter((i) => i.owned).length;

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-violet-50/80 px-3 py-2 text-center">
        <p className="text-[10px] font-extrabold text-violet-900/80">아이템 도감</p>
        <p className="mt-0.5 text-[9px] font-semibold text-violet-700/60">
          {ownedCount} / {items.length} 보유 · 행사·리뷰·방명록·성장 보상
        </p>
      </div>

      <div className="grid max-h-[280px] grid-cols-2 gap-2 overflow-y-auto pr-0.5">
        {items.map((item) => {
          const rarity = item.rarity ? getRarityStyle(item.rarity) : null;
          const acquired = item.owned;

          return (
            <div
              key={item.itemCode}
              className={`relative flex flex-col rounded-2xl border p-2 transition ${
                acquired
                  ? `${rarity?.border ?? "border-emerald-200"} ${rarity?.bg ?? "bg-white"}`
                  : "border-dashed border-slate-200 bg-slate-50/80 opacity-75"
              }`}
            >
              <div className="flex items-start gap-2">
                <div
                  className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-white ${
                    acquired ? rarity?.border ?? "border-amber-100" : "border-slate-200"
                  }`}
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className={`h-8 w-8 object-contain ${acquired ? "" : "grayscale"}`}
                      draggable={false}
                    />
                  ) : (
                    <span className="text-lg">🎁</span>
                  )}
                  {!acquired ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-500 text-white">
                      <Lock className="h-2.5 w-2.5" />
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] font-extrabold text-slate-800">
                    {item.itemName}
                    {item.isDefault ? (
                      <span className="ml-1 text-[8px] font-bold text-emerald-600">기본</span>
                    ) : null}
                  </p>
                  {rarity ? (
                    <span
                      className={`mt-0.5 inline-block rounded-full px-1.5 py-px text-[7px] font-bold ${rarity.badge}`}
                    >
                      {rarity.label}
                    </span>
                  ) : null}
                </div>
              </div>
              <p className="mt-1.5 line-clamp-2 text-[8px] leading-snug text-slate-500">
                {acquired ? "획득 완료 — 꾸미기에서 장착할 수 있어요" : item.unlockHint}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
