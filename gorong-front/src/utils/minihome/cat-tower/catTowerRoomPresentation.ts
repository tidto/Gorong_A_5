import {
  type RoomBackgroundId,
  DEFAULT_ROOM_BACKGROUND,
  loadRoomBackgroundFromStorage,
  parseRoomBackgroundFromAppearance,
} from "./catTowerRoomBackground";
import {
  type RoomPlacement,
  backgroundIdFromOwned,
  parseRoomOwnedIds,
  parseRoomPlacementsFromAppearance,
} from "./catTowerRoomCatalog";

export type CatTowerRoomPresentation = {
  background: RoomBackgroundId;
  items: RoomPlacement[];
  owned: Set<string>;
};

/**
 * 캣타워 방 표시용 단일 소스 — DB(appearanceState) 우선, 본인 화면만 API 없을 때 localStorage.
 * @param localCacheFallback true = 내 /cattower (로그인 본인 편집·조회)
 */
export function getCatTowerRoomPresentation(
  appearanceState?: Record<string, unknown> | null,
  localCacheFallback = false
): CatTowerRoomPresentation {
  const owned = parseRoomOwnedIds(appearanceState);
  const fromDb = parseRoomBackgroundFromAppearance(appearanceState);

  let background: RoomBackgroundId;
  if (fromDb != null) {
    background = backgroundIdFromOwned(fromDb, owned);
  } else if (localCacheFallback) {
    const cached = loadRoomBackgroundFromStorage();
    background =
      cached != null ? backgroundIdFromOwned(cached, owned) : DEFAULT_ROOM_BACKGROUND;
  } else {
    background = DEFAULT_ROOM_BACKGROUND;
  }

  const items = parseRoomPlacementsFromAppearance(appearanceState, owned);
  return { background, items, owned };
}
