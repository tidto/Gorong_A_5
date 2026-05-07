import React from "react";
import type { ActivityItem } from "../../types/minihome/minihome";

function fmt(iso?: string | null) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function ActivityHistory({ activities }: { activities: ActivityItem[] }) {
  if (!activities || activities.length === 0) {
    return <div className="py-6 text-center text-gray-500">활동 기록이 없습니다.</div>;
  }

  return (
    <div className="divide-y divide-gray-200">
      {activities.slice(0, 10).map((a) => (
        <div key={a.activityId} className="py-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">{a.activityType ?? "-"}</div>
            <div className="text-xs text-gray-500">
              변화량: {a.temperatureChange} | 참조 ID: {a.referenceId ?? "-"}
            </div>
          </div>
          <div className="text-xs text-gray-400">{fmt(a.createAt)}</div>
        </div>
      ))}
    </div>
  );
}

