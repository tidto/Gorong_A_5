import type { ActivityItem } from "../../../types/minihome/minihome";
import type { GrowthStage } from "../growth/growth";
import {
  formatGrowthStageLabel,
  isItemUnlockedByStage,
} from "../growth/growth";
import { countEventParticipations } from "../core/activity";

export type RoomDecorType = "plant" | "frame" | "lamp" | "sofa" | "rug" | "toy";

export type RoomDecorUnlockType = "DEFAULT" | "GROWTH_STAGE" | "EVENT_COUNT" | "ACTIVITY_COUNT";

export type RoomDecorItem = {
  id: string;
  type: RoomDecorType;
  x: number;
  y: number;
};

export type RoomDecorCatalogEntry = {
  type: RoomDecorType;
  label: string;
  emoji: string;
  defaultX: number;
  defaultY: number;
  zIndex: number;
  unlockType: RoomDecorUnlockType;
  requiredGrowthStage?: GrowthStage;
  requiredCount?: number;
  unlockHint?: string;
};

export const ROOM_DECOR_CATALOG: RoomDecorCatalogEntry[] = [
  {
    type: "plant",
    label: "화분",
    emoji: "🪴",
    defaultX: 8,
    defaultY: 75,
    zIndex: 2,
    unlockType: "EVENT_COUNT",
    requiredCount: 1,
    unlockHint: "행사 1회 참여 시 해금",
  },
  {
    type: "frame",
    label: "액자",
    emoji: "🖼️",
    defaultX: 8,
    defaultY: 8,
    zIndex: 3,
    unlockType: "GROWTH_STAGE",
    requiredGrowthStage: "TEEN",
    unlockHint: "성장1 단계(활동 10회) 달성 시 해금",
  },
  {
    type: "lamp",
    label: "조명",
    emoji: "💡",
    defaultX: 92,
    defaultY: 8,
    zIndex: 3,
    unlockType: "GROWTH_STAGE",
    requiredGrowthStage: "ADULT",
    unlockHint: "성장2 단계(활동 30회) 달성 시 해금",
  },
  {
    type: "sofa",
    label: "소파",
    emoji: "🛋️",
    defaultX: 88,
    defaultY: 75,
    zIndex: 2,
    unlockType: "EVENT_COUNT",
    requiredCount: 3,
    unlockHint: "행사 3회 참여 시 해금",
  },
  {
    type: "rug",
    label: "러그",
    emoji: "🧶",
    defaultX: 50,
    defaultY: 82,
    zIndex: 1,
    unlockType: "GROWTH_STAGE",
    requiredGrowthStage: "MASTER",
    unlockHint: "마스터 단계(활동 60회) 달성 시 해금",
  },
  {
    type: "toy",
    label: "장난감",
    emoji: "🧸",
    defaultX: 50,
    defaultY: 70,
    zIndex: 4,
    unlockType: "ACTIVITY_COUNT",
    requiredCount: 5,
    unlockHint: "활동 5회 달성 시 해금",
  },
];

export const ROOM_DECOR_BY_TYPE = Object.fromEntries(
  ROOM_DECOR_CATALOG.map((e) => [e.type, e])
) as Record<RoomDecorType, RoomDecorCatalogEntry>;

export type RoomDecorUnlockContext = {
  growthStage: GrowthStage;
  activityCount: number;
  eventParticipationCount: number;
};

export function buildRoomDecorUnlockContext(
  growthStage: GrowthStage,
  activityCount: number,
  activities: ActivityItem[] = []
): RoomDecorUnlockContext {
  return {
    growthStage,
    activityCount,
    eventParticipationCount: countEventParticipations(activities),
  };
}

export function isRoomDecorUnlocked(
  type: RoomDecorType,
  ctx: RoomDecorUnlockContext
): boolean {
  const entry = ROOM_DECOR_BY_TYPE[type];
  switch (entry.unlockType) {
    case "DEFAULT":
      return true;
    case "GROWTH_STAGE":
      return isItemUnlockedByStage(entry.requiredGrowthStage, ctx.growthStage);
    case "EVENT_COUNT":
      return ctx.eventParticipationCount >= (entry.requiredCount ?? 0);
    case "ACTIVITY_COUNT":
      return ctx.activityCount >= (entry.requiredCount ?? 0);
    default:
      return false;
  }
}

export function roomDecorUnlockLabel(type: RoomDecorType): string {
  const entry = ROOM_DECOR_BY_TYPE[type];
  if (entry.unlockHint) return entry.unlockHint;
  if (entry.unlockType === "GROWTH_STAGE" && entry.requiredGrowthStage) {
    return `${formatGrowthStageLabel(entry.requiredGrowthStage)} 단계에서 해금`;
  }
  if (entry.unlockType === "EVENT_COUNT" && entry.requiredCount != null) {
    return `행사 ${entry.requiredCount}회 참여 시 해금`;
  }
  if (entry.unlockType === "ACTIVITY_COUNT" && entry.requiredCount != null) {
    return `활동 ${entry.requiredCount}회 달성 시 해금`;
  }
  return "아직 해금되지 않았어요";
}

export function sanitizeRoomDecorItems(
  items: RoomDecorItem[],
  ctx: RoomDecorUnlockContext
): RoomDecorItem[] {
  return items.filter((item) => isRoomDecorUnlocked(item.type, ctx));
}

export function createRoomDecorItem(type: RoomDecorType): RoomDecorItem {
  const meta = ROOM_DECOR_BY_TYPE[type];
  return {
    id: `${type}-${Date.now()}`,
    type,
    x: meta.defaultX,
    y: meta.defaultY,
  };
}

export function upsertRoomDecorItem(
  items: RoomDecorItem[],
  type: RoomDecorType
): RoomDecorItem[] {
  const next = createRoomDecorItem(type);
  const withoutType = items.filter((i) => i.type !== type);
  return [...withoutType, next];
}

export function removeRoomDecorByType(
  items: RoomDecorItem[],
  type: RoomDecorType
): RoomDecorItem[] {
  return items.filter((i) => i.type !== type);
}

export function removeRoomDecorById(
  items: RoomDecorItem[],
  id: string
): RoomDecorItem[] {
  return items.filter((i) => i.id !== id);
}

export function clampDecorCoord(value: number): number {
  return Math.round(Math.min(95, Math.max(5, value)) * 10) / 10;
}

export function moveRoomDecorItem(
  items: RoomDecorItem[],
  id: string,
  x: number,
  y: number
): RoomDecorItem[] {
  return items.map((item) =>
    item.id === id ? { ...item, x: clampDecorCoord(x), y: clampDecorCoord(y) } : item
  );
}

export function isRoomDecorType(v: unknown): v is RoomDecorType {
  return typeof v === "string" && v in ROOM_DECOR_BY_TYPE;
}

function parseStoredItem(raw: unknown): RoomDecorItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!isRoomDecorType(o.type)) return null;
  if (typeof o.id !== "string" || !o.id.trim()) return null;
  const x = Number(o.x);
  const y = Number(o.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { id: o.id, type: o.type, x, y };
}

export function parseStoredRoomDecor(raw: unknown): RoomDecorItem[] {
  if (!Array.isArray(raw)) return [];
  const out: RoomDecorItem[] = [];
  const seenTypes = new Set<RoomDecorType>();
  for (const entry of raw) {
    const item = parseStoredItem(entry);
    if (!item || seenTypes.has(item.type)) continue;
    seenTypes.add(item.type);
    out.push(item);
  }
  return out;
}
