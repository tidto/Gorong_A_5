import type { ReactNode } from "react";
import { BarChart3, ImageIcon, Sprout } from "lucide-react";
import type { GrowthState } from "../../../utils/minihome/growth/growth";

type CatTowerStatGridProps = {
  activityCount: number;
  growth: GrowthState;
  galleryCount: number;
};

function StatCard(props: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-orange-100/80 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-orange-600/90">
        {props.icon}
        {props.label}
      </div>
      <div className="mt-3 text-2xl font-extrabold text-slate-900">{props.value}</div>
      <p className="mt-1 text-sm text-slate-500">{props.hint}</p>
    </div>
  );
}

export default function CatTowerStatGrid({ activityCount, growth, galleryCount }: CatTowerStatGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard
        label="활동 기록"
        value={`${activityCount}회`}
        hint="참여한 행사·활동"
        icon={<BarChart3 className="h-4 w-4" />}
      />
      <StatCard
        label="성장 단계"
        value={`${growth.stage}`}
        hint={growth.stageLabel}
        icon={<Sprout className="h-4 w-4" />}
      />
      <StatCard
        label="갤러리"
        value={`${galleryCount}개`}
        hint="나만의 갤러리"
        icon={<ImageIcon className="h-4 w-4" />}
      />
    </div>
  );
}
