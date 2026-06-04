export type RoomBackgroundId = "BASIC_ROOM" | "FOREST_ROOM" | "NIGHT_ROOM";

export const DEFAULT_ROOM_BACKGROUND: RoomBackgroundId = "BASIC_ROOM";

export const GOCAT_ROOM_BACKGROUND_STORAGE_KEY = "gocat_room_background";

export type RoomBackgroundTheme = "sakura" | "forest" | "night";

import type { GrowthStage } from "../growth/growth";
import { formatGrowthStageLabel, isItemUnlockedByStage } from "../growth/growth";

export type RoomBackgroundOption = {
  id: RoomBackgroundId;
  label: string;
  emoji: string;
  theme: RoomBackgroundTheme;
  previewClass: string;
  stageClass: string;
  floorClass: string;
  glowClass: string;
  headerClass: string;
  headerBgClass: string;
  isDark?: boolean;
  requiredGrowthStage?: GrowthStage;
  unlockHint?: string;
};

export const ROOM_BACKGROUND_OPTIONS: RoomBackgroundOption[] = [
  {
    id: "BASIC_ROOM",
    label: "벚꽃 방",
    emoji: "🌸",
    theme: "sakura",
    previewClass: "bg-gradient-to-br from-rose-100 via-pink-50 to-amber-50",
    stageClass:
      "bg-gradient-to-b from-rose-50/95 via-pink-50/75 to-amber-50/65",
    floorClass: "from-rose-200/22",
    glowClass: "from-rose-100/25 via-pink-50/10 to-transparent",
    headerClass: "text-rose-800/80",
    headerBgClass: "bg-white/50 backdrop-blur-sm border-rose-100/60",
  },
  {
    id: "FOREST_ROOM",
    label: "숲속 방",
    emoji: "🌲",
    requiredGrowthStage: "TEEN",
    unlockHint: "TEEN 단계(활동 10회) 달성 시 해금",
    theme: "forest",
    previewClass: "bg-gradient-to-br from-emerald-200 via-green-100 to-lime-50",
    stageClass:
      "bg-gradient-to-b from-emerald-100/92 via-green-50/78 to-lime-50/68",
    floorClass: "from-emerald-400/18",
    glowClass: "from-lime-100/28 via-emerald-50/12 to-transparent",
    headerClass: "text-emerald-900/80",
    headerBgClass: "bg-white/45 backdrop-blur-sm border-emerald-100/60",
  },
  {
    id: "NIGHT_ROOM",
    label: "별밤 방",
    emoji: "🌙",
    requiredGrowthStage: "ADULT",
    unlockHint: "ADULT 단계(활동 30회) 달성 시 해금",
    theme: "night",
    previewClass: "bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-950",
    stageClass:
      "bg-gradient-to-b from-indigo-950/96 via-indigo-900/88 to-purple-950/92",
    floorClass: "from-indigo-950/40",
    glowClass: "from-indigo-400/18 via-violet-300/8 to-transparent",
    headerClass: "text-indigo-100/90",
    headerBgClass: "bg-indigo-950/30 backdrop-blur-sm border-indigo-400/20",
    isDark: true,
  },
];

export const ROOM_BACKGROUND_BY_ID = Object.fromEntries(
  ROOM_BACKGROUND_OPTIONS.map((option) => [option.id, option])
) as Record<RoomBackgroundId, RoomBackgroundOption>;

export function isRoomBackgroundId(value: unknown): value is RoomBackgroundId {
  return typeof value === "string" && value in ROOM_BACKGROUND_BY_ID;
}

export function normalizeRoomBackground(value: unknown): RoomBackgroundId {
  if (isRoomBackgroundId(value)) return value;
  const upper = String(value ?? "")
    .trim()
    .toUpperCase();
  return isRoomBackgroundId(upper) ? upper : DEFAULT_ROOM_BACKGROUND;
}

export function parseRoomBackgroundFromAppearance(
  state: Record<string, unknown> | null | undefined
): RoomBackgroundId | null {
  if (!state) return null;
  const raw = state.roomBackground;
  if (!raw) return null;
  return normalizeRoomBackground(raw);
}

export function loadRoomBackgroundFromStorage(): RoomBackgroundId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GOCAT_ROOM_BACKGROUND_STORAGE_KEY);
    if (!raw) return null;
    return normalizeRoomBackground(raw);
  } catch {
    return null;
  }
}

export function saveRoomBackgroundToStorage(id: RoomBackgroundId): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(GOCAT_ROOM_BACKGROUND_STORAGE_KEY, id);
    return true;
  } catch {
    return false;
  }
}

export function resolveRoomBackground(
  appearanceState?: Record<string, unknown> | null
): RoomBackgroundId {
  return (
    loadRoomBackgroundFromStorage() ??
    parseRoomBackgroundFromAppearance(appearanceState) ??
    DEFAULT_ROOM_BACKGROUND
  );
}

export function isRoomBackgroundUnlocked(
  id: RoomBackgroundId,
  growthStage: GrowthStage
): boolean {
  const option = ROOM_BACKGROUND_BY_ID[id];
  if (!option.requiredGrowthStage) return true;
  return isItemUnlockedByStage(option.requiredGrowthStage, growthStage);
}

export function roomBackgroundUnlockLabel(id: RoomBackgroundId): string | null {
  const option = ROOM_BACKGROUND_BY_ID[id];
  if (!option.requiredGrowthStage) return null;
  return (
    option.unlockHint ??
    `${formatGrowthStageLabel(option.requiredGrowthStage)} 단계에서 해금`
  );
}

export function sanitizeRoomBackgroundForStage(
  id: RoomBackgroundId,
  growthStage: GrowthStage
): RoomBackgroundId {
  if (isRoomBackgroundUnlocked(id, growthStage)) return id;
  return DEFAULT_ROOM_BACKGROUND;
}
