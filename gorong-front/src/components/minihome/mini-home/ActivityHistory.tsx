import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { ActivityItem } from "../../../types/minihome/minihome";
import {
  formatActivityDate,
  formatActivityType,
  getRecentActivities,
} from "../../../utils/minihome/core/activity";

export type ActivityHistoryProps = {
  activities: ActivityItem[];
  limit?: number;
  variant?: "preview" | "full";
  emptyMessage?: string;
  getActivityLink?: (activity: ActivityItem) => string | null;
  activityLinkLabel?: string;
};

function ActivityEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-orange-100 bg-orange-50 px-6 py-10 text-center">
      <div className="text-3xl">📌</div>
      <p className="mt-3 text-sm font-semibold text-slate-600">{message}</p>
      <p className="mt-1 text-xs text-slate-500">행사 참여나 리뷰 작성 후 기록이 쌓입니다.</p>
    </div>
  );
}

function ActivityRow({
  activity,
  compact,
  getActivityLink,
  activityLinkLabel = "글 보기",
}: {
  activity: ActivityItem;
  compact?: boolean;
  getActivityLink?: (activity: ActivityItem) => string | null;
  activityLinkLabel?: string;
}) {
  const label = activity.title?.trim() || formatActivityType(activity.activityType);
  const activityLink = getActivityLink?.(activity) ?? null;

  return (
    <div
      className={`flex items-start justify-between gap-3 ${
        compact ? "py-3" : "bg-white p-4 hover:bg-orange-50"
      }`}
    >
      <div className="min-w-0">
        <div className={`truncate font-extrabold text-orange-700 ${compact ? "text-sm" : "text-xs"}`}>
          {label}
        </div>
        <div className={`mt-1 ${compact ? "text-xs text-slate-500" : "text-sm font-semibold text-slate-900"}`}>
          경험치 +{activity.temperatureChange ?? 0}
        </div>
        {activity.description ? (
          <div className="mt-1 line-clamp-2 text-xs text-slate-500">{activity.description}</div>
        ) : null}
        {!compact && activity.referenceId != null ? (
          <div className="text-xs text-slate-500">참조 ID: {activity.referenceId}</div>
        ) : null}
        {!compact && activityLink ? (
          <Link
            to={activityLink}
            className="mt-2 inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-700 transition hover:bg-orange-100"
          >
            {activityLinkLabel}
          </Link>
        ) : null}
      </div>
      <div className="shrink-0 text-xs text-slate-500">{formatActivityDate(activity.createAt)}</div>
    </div>
  );
}

export default function ActivityHistory({
  activities,
  limit,
  variant = "preview",
  emptyMessage = "활동 기록이 없습니다.",
  getActivityLink,
  activityLinkLabel,
}: ActivityHistoryProps) {
  const visible = useMemo(
    () => getRecentActivities(activities ?? [], limit),
    [activities, limit]
  );

  if (!visible.length) {
    return <ActivityEmpty message={emptyMessage} />;
  }

  if (variant === "full") {
    return (
      <div className="divide-y divide-orange-100 overflow-hidden rounded-2xl border border-orange-100">
        {visible.map((a) => (
          <ActivityRow
            key={a.activityId}
            activity={a}
            getActivityLink={getActivityLink}
            activityLinkLabel={activityLinkLabel}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="divide-y divide-orange-100">
      {visible.map((a) => (
        <ActivityRow key={a.activityId} activity={a} compact />
      ))}
    </div>
  );
}
