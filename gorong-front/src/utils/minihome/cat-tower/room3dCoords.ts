import { ROOM_3D } from "../../../config/catTower3d";

function clampPct(value: number): number {
  return Math.round(Math.min(95, Math.max(5, value)) * 10) / 10;
}

/** 2D % (CatTower roomDecor) → 3D 바닥 XZ */
export function percentToFloorXZ(xPct: number, yPct: number): [number, number] {
  const x = (xPct / 100) * ROOM_3D.width - ROOM_3D.width / 2;
  const z = (yPct / 100) * ROOM_3D.depth - ROOM_3D.depth / 2;
  return [x, z];
}

/** 3D 바닥 XZ → 2D % (기존 저장 포맷 호환) */
export function floorXZToPercent(x: number, z: number): { x: number; y: number } {
  return {
    x: clampPct(((x + ROOM_3D.width / 2) / ROOM_3D.width) * 100),
    y: clampPct(((z + ROOM_3D.depth / 2) / ROOM_3D.depth) * 100),
  };
}

export function clampFloorXZ(x: number, z: number): [number, number] {
  const halfW = ROOM_3D.width / 2 - 0.35;
  const halfD = ROOM_3D.depth / 2 - 0.35;
  return [
    Math.max(-halfW, Math.min(halfW, x)),
    Math.max(-halfD, Math.min(halfD, z)),
  ];
}
