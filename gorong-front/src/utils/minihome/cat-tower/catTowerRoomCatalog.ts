import type { GrowthStage } from "../growth/growth";
import {
  type RoomBackgroundId,
  normalizeRoomBackground,
} from "./catTowerRoomBackground";

export type RoomCatalogTab = "background" | "furniture" | "decor";
export type RoomItemType = "BACKGROUND" | "FURNITURE" | "DECOR";

export type RoomUnlockType =
  | "DEFAULT"
  | "EVENT_COUNT"
  | "REVIEW_COUNT"
  | "GUESTBOOK_RECEIVED"
  | "GROWTH_STAGE"
  | "EVENT_OR_GROWTH";

export type RoomCatalogEntry = {
  id: string;
  tab: RoomCatalogTab;
  type: RoomItemType;
  label: string;
  emoji: string;
  backgroundId?: RoomBackgroundId;
  defaultX: number;
  defaultY: number;
  zIndex: number;
  unlockType: RoomUnlockType;
  requiredValue: number | GrowthStage;
  unlockCondition: string;
};

export type RoomPlacement = {
  itemId: string;
  type: RoomItemType;
  x: number;
  y: number;
  visible: boolean;
};

export const ROOM_CATALOG: RoomCatalogEntry[] = [
  {
    id: "room_bg_basic",
    tab: "background",
    type: "BACKGROUND",
    label: "벚꽃 방",
    emoji: "🌸",
    backgroundId: "BASIC_ROOM",
    defaultX: 50,
    defaultY: 50,
    zIndex: 0,
    unlockType: "DEFAULT",
    requiredValue: 0,
    unlockCondition: "처음부터 사용 가능",
  },
  {
    id: "room_bg_forest",
    tab: "background",
    type: "BACKGROUND",
    label: "숲속 방",
    emoji: "🌲",
    backgroundId: "FOREST_ROOM",
    defaultX: 50,
    defaultY: 50,
    zIndex: 0,
    unlockType: "EVENT_COUNT",
    requiredValue: 1,
    unlockCondition: "행사 1회 참여 시 해금",
  },
  {
    id: "room_bg_night",
    tab: "background",
    type: "BACKGROUND",
    label: "별밤 방",
    emoji: "🌙",
    backgroundId: "NIGHT_ROOM",
    defaultX: 50,
    defaultY: 50,
    zIndex: 0,
    unlockType: "GROWTH_STAGE",
    requiredValue: "ADULT",
    unlockCondition: "성장 단계 ADULT 달성 시 해금",
  },
  {
    id: "room_plant",
    tab: "furniture",
    type: "FURNITURE",
    label: "화분",
    emoji: "🪴",
    defaultX: 8,
    defaultY: 75,
    zIndex: 2,
    unlockType: "DEFAULT",
    requiredValue: 0,
    unlockCondition: "처음부터 보유",
  },
  {
    id: "room_lamp",
    tab: "furniture",
    type: "FURNITURE",
    label: "조명",
    emoji: "💡",
    defaultX: 92,
    defaultY: 8,
    zIndex: 3,
    unlockType: "REVIEW_COUNT",
    requiredValue: 3,
    unlockCondition: "리뷰 3개 작성 시 해금",
  },
  {
    id: "room_sofa",
    tab: "furniture",
    type: "FURNITURE",
    label: "소파",
    emoji: "🛋️",
    defaultX: 88,
    defaultY: 75,
    zIndex: 2,
    unlockType: "GUESTBOOK_RECEIVED",
    requiredValue: 5,
    unlockCondition: "방명록 5개 받기 시 해금",
  },
  {
    id: "room_star",
    tab: "decor",
    type: "DECOR",
    label: "별",
    emoji: "⭐",
    defaultX: 50,
    defaultY: 12,
    zIndex: 4,
    unlockType: "EVENT_OR_GROWTH",
    requiredValue: 3,
    unlockCondition: "행사 3회 참여 또는 TEEN 이상 성장 시 해금",
  },
  {
    id: "room_speech",
    tab: "decor",
    type: "DECOR",
    label: "말풍선",
    emoji: "💬",
    defaultX: 18,
    defaultY: 22,
    zIndex: 5,
    unlockType: "REVIEW_COUNT",
    requiredValue: 1,
    unlockCondition: "리뷰 1개 작성 시 해금",
  },
];

export const ROOM_CATALOG_BY_ID = Object.fromEntries(
  ROOM_CATALOG.map((e) => [e.id, e])
) as Record<string, RoomCatalogEntry>;

const DEFAULT_OWNED = new Set(["room_bg_basic", "room_plant"]);

export function parseRoomOwnedIds(
  state: Record<string, unknown> | null | undefined
): Set<string> {
  if (!state?.roomOwnedItemIds || !Array.isArray(state.roomOwnedItemIds)) {
    return new Set(DEFAULT_OWNED);
  }
  const out = new Set<string>();
  for (const raw of state.roomOwnedItemIds) {
    if (raw != null) out.add(String(raw).trim().toLowerCase());
  }
  if (out.size === 0) DEFAULT_OWNED.forEach((id) => out.add(id));
  return out;
}

export function isRoomItemOwned(itemId: string, owned: Set<string>): boolean {
  return owned.has(itemId.trim().toLowerCase());
}

export function roomUnlockHint(entry: RoomCatalogEntry): string {
  return entry.unlockCondition;
}

export function backgroundIdFromOwned(
  bg: RoomBackgroundId,
  owned: Set<string>
): RoomBackgroundId {
  const entry = ROOM_CATALOG.find((e) => e.backgroundId === bg);
  if (!entry || isRoomItemOwned(entry.id, owned)) return bg;
  return "BASIC_ROOM";
}

function parsePlacement(raw: unknown): RoomPlacement | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const itemId = typeof o.itemId === "string" ? o.itemId.trim().toLowerCase() : "";
  if (!itemId || !ROOM_CATALOG_BY_ID[itemId] || ROOM_CATALOG_BY_ID[itemId].type === "BACKGROUND") {
    return null;
  }
  const x = Number(o.x);
  const y = Number(o.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const type = (ROOM_CATALOG_BY_ID[itemId].type ?? "FURNITURE") as RoomItemType;
  const visible = o.visible !== false;
  if (!visible) return null;
  return {
    itemId,
    type,
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(100, Math.max(0, y)),
    visible: true,
  };
}

export function parseRoomPlacementsFromAppearance(
  state: Record<string, unknown> | null | undefined,
  owned?: Set<string>
): RoomPlacement[] {
  const ownedSet = owned ?? parseRoomOwnedIds(state);
  const raw = state?.roomItems;
  const out: RoomPlacement[] = [];
  const seen = new Set<string>();

  if (Array.isArray(raw)) {
    for (const entry of raw) {
      const p = parsePlacement(entry);
      if (!p || seen.has(p.itemId) || !isRoomItemOwned(p.itemId, ownedSet)) continue;
      seen.add(p.itemId);
      out.push(p);
    }
  }

  if (out.length === 0 && isRoomItemOwned("room_plant", ownedSet) && !seen.has("room_plant")) {
    const plant = ROOM_CATALOG_BY_ID.room_plant;
    out.push({
      itemId: "room_plant",
      type: "FURNITURE",
      x: plant.defaultX,
      y: plant.defaultY,
      visible: true,
    });
  }

  return out;
}

export function resolveRoomBackgroundFromState(
  state: Record<string, unknown> | null | undefined,
  owned?: Set<string>
): RoomBackgroundId {
  const ownedSet = owned ?? parseRoomOwnedIds(state);
  const raw = state?.roomBackground;
  const bg = normalizeRoomBackground(raw ?? "BASIC_ROOM");
  return backgroundIdFromOwned(bg, ownedSet);
}

export function placementsToApiPayload(items: RoomPlacement[]) {
  return items.map((p) => ({
    itemId: p.itemId,
    type: p.type,
    x: p.x,
    y: p.y,
    visible: p.visible,
  }));
}

export function upsertPlacement(
  items: RoomPlacement[],
  itemId: string
): RoomPlacement[] {
  const meta = ROOM_CATALOG_BY_ID[itemId];
  if (!meta || meta.type === "BACKGROUND") return items;
  const without = items.filter((i) => i.itemId !== itemId);
  return [
    ...without,
    {
      itemId,
      type: meta.type,
      x: meta.defaultX,
      y: meta.defaultY,
      visible: true,
    },
  ];
}

export function removePlacement(items: RoomPlacement[], itemId: string): RoomPlacement[] {
  return items.filter((i) => i.itemId !== itemId);
}

export function updatePlacementPosition(
  items: RoomPlacement[],
  itemId: string,
  x: number,
  y: number
): RoomPlacement[] {
  return items.map((i) =>
    i.itemId === itemId
      ? { ...i, x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) }
      : i
  );
}

export function catalogForTab(tab: RoomCatalogTab): RoomCatalogEntry[] {
  return ROOM_CATALOG.filter((e) => e.tab === tab);
}
