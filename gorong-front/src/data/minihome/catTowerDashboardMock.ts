/** CatTower 대시보드 mock — 방명록·리뷰·성장 로그·방 꾸미기 (추후 API 연동) */

export type MockGuestbookEntry = {
  id: string;
  author: string;
  message: string;
  date: string;
};

export type MockReviewEntry = {
  id: string;
  eventTitle: string;
  excerpt: string;
  date: string;
  rating: number;
};

export type MockGrowthLogEntry = {
  id: string;
  label: string;
  detail: string;
  date: string;
};

export type MockRoomDecor = {
  id: string;
  emoji: string;
  label: string;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
};

export const MOCK_GUESTBOOK: MockGuestbookEntry[] = [
  { id: "g1", author: "냥이친구", message: "오늘도 귀여워요 🐾", date: "2026-05-20" },
  { id: "g2", author: "고롱이", message: "다음 행사 같이 가요!", date: "2026-05-18" },
  { id: "g3", author: "방문자", message: "미니홈피 분위기 좋네요~", date: "2026-05-15" },
];

export const MOCK_REVIEWS: MockReviewEntry[] = [
  {
    id: "r1",
    eventTitle: "벚꽃 축제 체험",
    excerpt: "Go냥이랑 같이 다녀왔어요. 사진도 예쁘게 나왔습니다.",
    date: "2026-05-12",
    rating: 5,
  },
  {
    id: "r2",
    eventTitle: "지역 박물관 투어",
    excerpt: "조용하고 좋았어요. 다음에도 참여할게요!",
    date: "2026-05-05",
    rating: 4,
  },
];

export const MOCK_ROOM_DECOR: MockRoomDecor[] = [
  { id: "d1", emoji: "🪴", label: "화분", position: "bottom-left" },
  { id: "d2", emoji: "🖼️", label: "액자", position: "top-left" },
  { id: "d3", emoji: "🛋️", label: "소파", position: "bottom-right" },
  { id: "d4", emoji: "💡", label: "조명", position: "top-right" },
];

export function buildMockGrowthLogs(activityCount: number, stageLabel: string): MockGrowthLogEntry[] {
  return [
    {
      id: "gl1",
      label: "현재 성장 단계",
      detail: `${stageLabel} · 활동 ${activityCount}회`,
      date: "오늘",
    },
    {
      id: "gl2",
      label: "활동 10회 달성",
      detail: "성장 1 단계로 성장했어요",
      date: "2026-04-28",
    },
    {
      id: "gl3",
      label: "Go냥이 입양",
      detail: "나만의 미니홈피를 열었어요",
      date: "2026-04-01",
    },
  ];
}

export const MOCK_VISITOR_COUNT = 128;
export const MOCK_TODAY_VISITORS = 7;
