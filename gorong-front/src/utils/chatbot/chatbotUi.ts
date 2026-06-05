export type QuickReplyCategory = {
  id: string;
  label: string;
  emoji: string;
  replies: string[];
};

export const QUICK_REPLY_CATEGORIES: QuickReplyCategory[] = [
  {
    id: "events",
    label: "행사 추천",
    emoji: "🎪",
    replies: [
      "이번 주 갈 만한 행사 추천해줘",
      "인기 행사 추천해줘",
      "사진 찍기 좋은 전시 추천해줘",
    ],
  },
  {
    id: "nearby",
    label: "근처 행사",
    emoji: "📍",
    replies: ["내 근처 행사 추천해줘", "대구 근처 갈만한 행사 알려줘"],
  },
  {
    id: "groups",
    label: "그룹 참여",
    emoji: "👥",
    replies: ["그룹 참여 방법 알려줘", "동행 모집글 어떻게 찾아?"],
  },
  {
    id: "review",
    label: "리뷰 작성",
    emoji: "✍️",
    replies: ["리뷰 작성 방법 알려줘", "리뷰 쓰면 CatTower에 뭐가 쌓여?"],
  },
  {
    id: "cattower",
    label: "CatTower",
    emoji: "🏡",
    replies: ["CatTower 꾸미는 방법", "고냥이 아이템 해금 조건 알려줘"],
  },
  {
    id: "help",
    label: "이용 안내",
    emoji: "💡",
    replies: ["행사 찾는 방법", "다른 유저 CatTower 보는 방법"],
  },
];

const INTENT_LABELS: Record<string, string> = {
  EVENT_RECOMMENDATION: "행사 추천",
  LOCATION_RECOMMENDATION: "근처 행사",
  GROUP_GUIDE: "그룹 참여",
  REVIEW_GUIDE: "리뷰 작성",
  CATTOWER_GUIDE: "CatTower",
  SERVICE_GUIDE: "이용 안내",
  GREETING: "인사",
  GENERAL_QUESTION: "일반 질문",
  UNKNOWN: "일반 질문",
};

export function intentLabel(intent?: string): string | null {
  if (!intent?.trim()) return null;
  return INTENT_LABELS[intent] ?? null;
}

export function actionButtonClass(type?: string): string {
  const base =
    "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-bold transition shadow-sm";
  switch (type) {
    case "events":
      return `${base} border-orange-200 bg-orange-50 text-orange-900 hover:bg-orange-100`;
    case "groups":
      return `${base} border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100`;
    case "cattower":
      return `${base} border-violet-200 bg-violet-50 text-violet-900 hover:bg-violet-100`;
    case "review":
      return `${base} border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100`;
    case "map":
      return `${base} border-gray-200 bg-white text-gray-800 hover:bg-gray-50`;
    default:
      return `${base} border-primary-200 bg-primary-50 text-primary-900 hover:bg-primary-100`;
  }
}
