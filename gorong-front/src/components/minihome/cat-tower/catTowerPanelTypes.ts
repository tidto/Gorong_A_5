/** 캣타워 중앙 영역 탭 (페이지 이동 없음) */
export type CatTowerCenterPanelId = "room" | "gallery" | "activity" | "guestbook";

export const CATTOWER_VIEW_PANELS: {
  id: CatTowerCenterPanelId;
  label: string;
  emoji: string;
}[] = [
  { id: "room", label: "내 방", emoji: "🏡" },
  { id: "gallery", label: "갤러리", emoji: "📸" },
  { id: "activity", label: "히스토리", emoji: "📋" },
  { id: "guestbook", label: "방명록", emoji: "✉️" },
];

/** @deprecated */
export type CatTowerPanelId = CatTowerCenterPanelId | "room-decorate" | "items";
