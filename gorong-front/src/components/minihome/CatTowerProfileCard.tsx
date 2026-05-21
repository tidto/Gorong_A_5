import type { GrowthState } from "../../utils/minihome/growth";

type Props = {
  nickname: string;
  catName: string;
  growth: GrowthState;
  level: number;
  isPublic: boolean;
  loading?: boolean;
};

export default function CatTowerProfileCard({
  nickname,
  catName,
  growth,
  level,
  isPublic,
  loading,
}: Props) {
  return (
    <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
      <div className="text-xs font-bold text-white/80">PROFILE</div>
      <div className="mt-2 text-2xl font-extrabold">
        {loading ? "불러오는 중..." : `${nickname} · ${catName}`}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-sm font-semibold text-white/90">
        <span>
          {growth.stage} · {growth.stageLabel}
        </span>
        <span>· Lv.{level}</span>
        <span>· {isPublic ? "공개" : "비공개"}</span>
      </div>
    </div>
  );
}
