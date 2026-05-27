export type RoomDecorType = "plant" | "frame" | "lamp" | "sofa" | "rug" | "toy";

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
};

export const ROOM_DECOR_CATALOG: RoomDecorCatalogEntry[] = [
  { type: "plant", label: "화분", emoji: "🪴", defaultX: 8, defaultY: 75, zIndex: 2 },
  { type: "frame", label: "액자", emoji: "🖼️", defaultX: 8, defaultY: 8, zIndex: 3 },
  { type: "lamp", label: "조명", emoji: "💡", defaultX: 92, defaultY: 8, zIndex: 3 },
  { type: "sofa", label: "소파", emoji: "🛋️", defaultX: 88, defaultY: 75, zIndex: 2 },
  { type: "rug", label: "러그", emoji: "🧶", defaultX: 50, defaultY: 82, zIndex: 1 },
  { type: "toy", label: "장난감", emoji: "🧸", defaultX: 50, defaultY: 70, zIndex: 4 },
];

export const ROOM_DECOR_BY_TYPE = Object.fromEntries(
  ROOM_DECOR_CATALOG.map((e) => [e.type, e])
) as Record<RoomDecorType, RoomDecorCatalogEntry>;

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
