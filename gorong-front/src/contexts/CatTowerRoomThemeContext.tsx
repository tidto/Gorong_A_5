import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  DEFAULT_ROOM_BACKGROUND,
  type RoomBackgroundId,
} from "../utils/minihome/cat-tower/catTowerRoomBackground";
import {
  getCatTowerPageTheme,
  type CatTowerPageTheme,
} from "../utils/minihome/cat-tower/catTowerPageTheme";

const CatTowerRoomThemeContext = createContext<RoomBackgroundId>(DEFAULT_ROOM_BACKGROUND);

export function CatTowerRoomThemeProvider({
  roomBackground,
  children,
}: {
  roomBackground: RoomBackgroundId;
  children: ReactNode;
}) {
  return (
    <CatTowerRoomThemeContext.Provider value={roomBackground}>
      {children}
    </CatTowerRoomThemeContext.Provider>
  );
}

export function useCatTowerRoomBackgroundId(): RoomBackgroundId {
  return useContext(CatTowerRoomThemeContext);
}

export function useCatTowerPageTheme(): CatTowerPageTheme {
  const id = useCatTowerRoomBackgroundId();
  return useMemo(() => getCatTowerPageTheme(id), [id]);
}

/** 전체 화면 배경·오브 */
export function CatTowerPageBackdrop() {
  const theme = useCatTowerPageTheme();
  const [orb1, orb2, orb3] = theme.pageOrbClasses;

  return (
    <div
      className={`pointer-events-none fixed inset-0 -z-10 transition-colors duration-700 ${theme.pageBgClass}`}
      aria-hidden
    >
      <div className={`absolute -left-20 top-20 h-64 w-64 rounded-full blur-3xl ${orb1}`} />
      <div className={`absolute -right-16 top-40 h-56 w-56 rounded-full blur-3xl ${orb2}`} />
      <div className={`absolute bottom-32 left-1/4 h-48 w-48 rounded-full blur-3xl ${orb3}`} />
    </div>
  );
}
