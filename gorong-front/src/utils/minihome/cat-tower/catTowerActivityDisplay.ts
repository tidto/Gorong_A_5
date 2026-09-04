import type { ActivityItem } from "../../../types/minihome/minihome";

export type ActivityDisplay = {
  emoji: string;
  label: string;
  accent: string;
};

function includesAny(text: string, tokens: string[]): boolean {
  const upper = text.toUpperCase();
  return tokens.some((t) => upper.includes(t));
}

/** 최근 활동 → 감성 카드 표시용 */
export function getActivityDisplay(activity: ActivityItem): ActivityDisplay {
  const type = activity.activityType ?? "";
  const title = activity.title?.trim() ?? "";
  const desc = activity.description?.trim() ?? "";
  const combined = `${type} ${title} ${desc}`;

  if (includesAny(combined, ["GALLERY", "UPLOAD", "사진", "PHOTO"])) {
    return {
      emoji: "📸",
      label: title || "사진 업로드",
      accent: "from-sky-50 to-blue-50 border-sky-100/80",
    };
  }
  if (includesAny(combined, ["REVIEW", "리뷰"])) {
    return {
      emoji: "⭐",
      label: title || "리뷰 작성",
      accent: "from-amber-50 to-orange-50 border-amber-100/80",
    };
  }
  if (includesAny(combined, ["EVENT", "행사", "벚꽃", "FESTIVAL"])) {
    return {
      emoji: "🌸",
      label: title || "행사 참여",
      accent: "from-rose-50 to-pink-50 border-rose-100/80",
    };
  }
  if (includesAny(combined, ["GROWTH", "LEVEL", "성장", "EXP"])) {
    return {
      emoji: "✨",
      label: title || "Go냥이 성장",
      accent: "from-violet-50 to-purple-50 border-violet-100/80",
    };
  }

  return {
    emoji: "🐾",
    label: title || type || "활동 기록",
    accent: "from-emerald-50 to-teal-50 border-emerald-100/80",
  };
}
