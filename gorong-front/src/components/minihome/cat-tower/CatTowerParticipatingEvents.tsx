import { memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useCatTowerParticipatingEvents, type ParticipatingEventItem } from "../../../pages/minihome/hooks/useCatTowerParticipatingEvents";
import { CATTOWER_CARD, cattowerCardHeader } from "../../../utils/minihome/cat-tower/catTowerTheme";

type Props = {
  enabled?: boolean;
  refreshToken?: number;
};

function isDatePassed(dateStr?: string): boolean {
  if (!dateStr) return false;
  try {
    const meeting = new Date(dateStr);
    meeting.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return meeting < today;
  } catch {
    return false;
  }
}

function getCapacityLabel(item: ParticipatingEventItem): string | null {
  if (item.kind !== "group") return null;
  const cur = item.currentCapacity ?? 0;
  const max = item.maxCapacity ?? 0;
  const passed = isDatePassed(item.date);
  const closed = item.status === "CLOSED" || passed;
  const full = max > 0 && cur >= max;
  const prefix = closed || full ? "마감" : "모집중";
  return `${prefix} ${cur}/${max || "?"}명`;
}

function formatSchedule(item: ParticipatingEventItem): string {
  const parts = [item.date, item.time].filter(Boolean);
  if (parts.length === 0) return "일정 미정";
  return parts.join(" ");
}

function ParticipatingEventCard({ item }: { item: ParticipatingEventItem }) {
  const navigate = useNavigate();
  const passed = isDatePassed(item.date);
  const isSolo = item.kind === "solo";

  const handleClick = () => {
    if (isSolo && item.eventContentId) {
      navigate(`/events/${item.eventContentId}`);
      return;
    }
    if (item.groupId) {
      navigate(`/groups/${item.groupId}`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-left shadow-sm transition hover:border-primary-200"
    >
      <div className="flex items-start justify-between gap-1.5">
        <p className="line-clamp-1 text-[10px] font-extrabold text-slate-800">{item.title}</p>
        <span
          className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-bold ${
            isSolo ? "bg-slate-100 text-slate-600" : "bg-primary-50 text-primary-700"
          }`}
        >
          {isSolo ? "혼자" : "참여"}
        </span>
      </div>
      <p className={`mt-0.5 truncate text-[9px] font-medium ${passed ? "text-slate-400" : "text-slate-500"}`}>
        {formatSchedule(item)}
        {passed ? " · 종료" : ""}
        {!isSolo && getCapacityLabel(item) ? ` · ${getCapacityLabel(item)}` : ""}
      </p>
    </button>
  );
}

function CatTowerParticipatingEvents({ enabled = true, refreshToken = 0 }: Props) {
  const { items, loading } = useCatTowerParticipatingEvents(enabled, refreshToken);

  if (!enabled) return null;

  return (
    <section className={CATTOWER_CARD}>
      <div className={cattowerCardHeader()}>참여 중인 이벤트</div>

      <div className="sidebar-card-body !space-y-2 !p-2.5">
        {loading ? (
          <div className="flex min-h-[52px] items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-2 py-3 text-center text-[10px] font-medium text-slate-500">
            참여 중인 모임·행사가 없어요.
          </p>
        ) : (
          <div className="max-h-[120px] space-y-1.5 overflow-y-auto pr-0.5">
            {items.map((item) => (
              <ParticipatingEventCard key={item.key} item={item} />
            ))}
          </div>
        )}

        {!loading && items.length > 0 ? (
          <p className="text-center text-[9px] font-semibold text-slate-400">
            {items.length}개 참여 중
          </p>
        ) : null}

        <Link
          to="/events"
          className="block rounded-lg border border-primary-200 bg-primary-50 py-1.5 text-center text-[10px] font-bold text-primary-700 transition hover:bg-primary-100"
        >
          행사·모임 더 보기 →
        </Link>
      </div>
    </section>
  );
}

export default memo(CatTowerParticipatingEvents);
