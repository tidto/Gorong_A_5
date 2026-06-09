import { memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useCatTowerParticipatingEvents, type ParticipatingEventItem } from "../../../pages/minihome/hooks/useCatTowerParticipatingEvents";

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
      className="w-full rounded-xl border border-rose-100/90 bg-white/95 px-3 py-2.5 text-left shadow-sm transition hover:border-rose-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-[11px] font-extrabold leading-snug text-slate-800">
          {item.title}
        </p>
        <span
          className={`shrink-0 rounded-lg px-1.5 py-0.5 text-[9px] font-bold ${
            isSolo ? "bg-sky-50 text-sky-600" : "bg-emerald-50 text-emerald-600"
          }`}
        >
          {isSolo ? "혼자가기" : "참여중"}
        </span>
      </div>

      {item.eventName && !isSolo ? (
        <p className="mt-1.5 truncate text-[10px] font-semibold text-slate-600">
          🎟️ {item.eventName}
        </p>
      ) : null}

      <p className={`mt-1 text-[10px] font-medium ${passed ? "text-slate-400" : "text-slate-600"}`}>
        📅 {formatSchedule(item)}
        {passed ? " · 종료" : ""}
      </p>

      {isSolo ? (
        <p className="mt-1 text-[10px] font-bold text-sky-600/90">1인 방문 예정</p>
      ) : (
        getCapacityLabel(item) ? (
          <p className="mt-1 text-[10px] font-bold text-orange-600/90">{getCapacityLabel(item)}</p>
        ) : null
      )}

      {item.location ? (
        <p className="mt-1 line-clamp-2 text-[9px] font-medium leading-relaxed text-slate-500">
          📍 {item.location}
        </p>
      ) : null}
    </button>
  );
}

function CatTowerParticipatingEvents({ enabled = true, refreshToken = 0 }: Props) {
  const { items, loading } = useCatTowerParticipatingEvents(enabled, refreshToken);

  if (!enabled) return null;

  return (
    <section className="sidebar-card w-full max-w-full border-rose-100/90 bg-gradient-to-b from-rose-50/95 via-white to-orange-50/30">
      <div className="sidebar-card-header justify-center border-rose-100/70 bg-gradient-to-r from-rose-400 to-orange-400">
        🌸 참여 중인 이벤트
      </div>

      <div className="sidebar-card-body">
        <p className="text-center text-[9px] font-bold text-rose-700/70">
          {loading ? "불러오는 중…" : `${items.length}개 참여 중 · 만남 날짜 순`}
        </p>

        {loading ? (
          <div className="flex min-h-[80px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-rose-400" />
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-rose-100 bg-white/70 px-3 py-5 text-center text-[10px] font-medium leading-relaxed text-slate-500">
            참여 중인 모임·행사가 없어요.
            <br />
            혼자 가기 또는 모임에 참여해 보세요!
          </p>
        ) : (
          <div className="max-h-[340px] space-y-2 overflow-y-auto pr-0.5">
            {items.map((item) => (
              <ParticipatingEventCard key={item.key} item={item} />
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Link
            to="/events"
            className="block rounded-xl border border-sky-100 bg-white/80 py-2 text-center text-[10px] font-bold text-sky-600 transition hover:border-sky-200 hover:bg-white"
          >
            행사 찾기 →
          </Link>
          <Link
            to="/group"
            className="block rounded-xl border border-rose-100 bg-white/80 py-2 text-center text-[10px] font-bold text-rose-600 transition hover:border-rose-200 hover:bg-white"
          >
            모집게시판 →
          </Link>
        </div>
      </div>
    </section>
  );
}

export default memo(CatTowerParticipatingEvents);
