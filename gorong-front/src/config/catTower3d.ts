/** 풀 3D 방 꾸미기 (React Three Fiber) — feature/cattower-room-3d-r3f */
export const CATTOWER_ROOM_3D_ENABLED =
  import.meta.env.VITE_CATTOWER_ROOM_3D !== "false";

/** 방 월드 좌표 (미터 단위) */
export const ROOM_3D = {
  width: 8,
  depth: 6,
  wallHeight: 3.2,
  floorY: 0,
} as const;
