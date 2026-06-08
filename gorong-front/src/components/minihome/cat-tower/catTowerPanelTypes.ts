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

export type CatTowerPanelLabelVariant = "tab" | "nav";

/** 본인 / 방문(게스트) 모드에 맞는 패널 라벨 */
export function catTowerPanelLabel(
  id: CatTowerCenterPanelId,
  opts?: { guestView?: boolean; variant?: CatTowerPanelLabelVariant }
): string {
  const guestView = opts?.guestView ?? false;
  const variant = opts?.variant ?? "tab";

  if (guestView) {
    switch (id) {
      case "room":
        return variant === "nav" ? "방 구경하기" : "방 구경";
      case "gallery":
        return variant === "nav" ? "갤러리 보기" : "갤러리";
      case "activity":
        return variant === "nav" ? "히스토리 보기" : "히스토리";
      case "guestbook":
        return variant === "nav" ? "방명록 보기" : "방명록";
    }
  }

  if (variant === "nav") {
    switch (id) {
      case "gallery":
        return "갤러리 보기";
      case "activity":
        return "히스토리 보기";
      case "guestbook":
        return "방명록 보기";
      default:
        return CATTOWER_VIEW_PANELS.find((p) => p.id === id)?.label ?? id;
    }
  }

  return CATTOWER_VIEW_PANELS.find((p) => p.id === id)?.label ?? id;
}

/** @deprecated */
export type CatTowerPanelId = CatTowerCenterPanelId | "room-decorate" | "items";
