import type { ActivityItem } from "../../../types/minihome/minihome";

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  EVENT_PARTICIPATED: "행사 참여",
  EVENT_PARTICIPATION: "행사 참여",
  REVIEW_CREATED: "리뷰 작성",
  REVIEW_WRITTEN: "리뷰 작성",
  REVIEW_WRITE: "리뷰 작성",
  GALLERY_UPLOADED: "갤러리 업로드",
  GALLERY_UPLOAD: "갤러리 업로드",
  ITEM_EQUIP: "아이템 장착",
};

export function formatActivityType(code?: string | null): string {
  if (!code?.trim()) return "-";
  const key = code.trim().toUpperCase();
  return ACTIVITY_TYPE_LABELS[key] ?? code;
}

export function formatActivityDate(iso?: string | null): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function countEventParticipations(activities: ActivityItem[]): number {
  return (activities ?? []).filter((a) => {
    const key = (a.activityType ?? "").trim().toUpperCase();
    return key.includes("EVENT");
  }).length;
}

/** API는 createAt 내림차순 — 최신 N개 활동 */
export function getRecentActivities(
  activities: ActivityItem[],
  limit?: number
): ActivityItem[] {
  const list = activities ?? [];
  if (limit == null || limit <= 0) return list;
  return list.slice(0, limit);
}
