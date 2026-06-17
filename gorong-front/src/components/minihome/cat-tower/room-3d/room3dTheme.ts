import type { RoomBackgroundId } from "../../../utils/minihome/cat-tower/catTowerRoomBackground";

export type Room3DTheme = {
  sky: string;
  fogNear: number;
  fogFar: number;
  wall: string;
  wallBack: string;
  floor: string;
  trim: string;
  ceiling: string;
  ambient: number;
  directional: number;
  pointColor: string;
  pointIntensity: number;
  accent: string;
};

export const ROOM_3D_THEMES: Record<RoomBackgroundId, Room3DTheme> = {
  BASIC_ROOM: {
    sky: "#fff1f2",
    fogNear: 9,
    fogFar: 20,
    wall: "#ffe4e6",
    wallBack: "#fecdd3",
    floor: "#fde68a",
    trim: "#fda4af",
    ceiling: "#fff7ed",
    ambient: 0.62,
    directional: 1.05,
    pointColor: "#fda4af",
    pointIntensity: 0.4,
    accent: "#fb7185",
  },
  FOREST_ROOM: {
    sky: "#ecfdf5",
    fogNear: 9,
    fogFar: 20,
    wall: "#bbf7d0",
    wallBack: "#86efac",
    floor: "#a3e635",
    trim: "#4ade80",
    ceiling: "#f0fdf4",
    ambient: 0.58,
    directional: 1.0,
    pointColor: "#84cc16",
    pointIntensity: 0.35,
    accent: "#22c55e",
  },
  NIGHT_ROOM: {
    sky: "#0f172a",
    fogNear: 7,
    fogFar: 18,
    wall: "#312e81",
    wallBack: "#1e1b4b",
    floor: "#1e293b",
    trim: "#6366f1",
    ceiling: "#0f172a",
    ambient: 0.42,
    directional: 0.75,
    pointColor: "#a5b4fc",
    pointIntensity: 0.55,
    accent: "#818cf8",
  },
};

export function getRoom3DTheme(id: RoomBackgroundId): Room3DTheme {
  return ROOM_3D_THEMES[id] ?? ROOM_3D_THEMES.BASIC_ROOM;
}
