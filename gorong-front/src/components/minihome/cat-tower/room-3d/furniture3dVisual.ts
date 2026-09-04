import type { RoomDecorType } from "../../../utils/minihome/cat-tower/catTowerRoomDecor";

export type Furniture3DVisual = {
  color: string;
  accent?: string;
  scale: [number, number, number];
  yOffset: number;
  wallMounted?: boolean;
};

export const FURNITURE_3D_VISUAL: Record<RoomDecorType, Furniture3DVisual> = {
  plant: { color: "#4ade80", accent: "#92400e", scale: [0.35, 0.55, 0.35], yOffset: 0.28 },
  frame: { color: "#fcd34d", accent: "#38bdf8", scale: [0.55, 0.45, 0.06], yOffset: 1.35, wallMounted: true },
  lamp: { color: "#fef3c7", accent: "#64748b", scale: [0.25, 0.55, 0.25], yOffset: 1.2, wallMounted: true },
  sofa: { color: "#fb7185", accent: "#fda4af", scale: [1.1, 0.55, 0.55], yOffset: 0.28 },
  rug: { color: "#f9a8d4", accent: "#fbcfe8", scale: [1.4, 0.04, 0.9], yOffset: 0.02 },
  toy: { color: "#fbbf24", accent: "#f59e0b", scale: [0.22, 0.22, 0.22], yOffset: 0.12 },
};
