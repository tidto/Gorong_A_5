import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type RoomDecorItem,
  type RoomDecorType,
  type RoomDecorUnlockContext,
  parseStoredRoomDecor,
  removeRoomDecorById,
  removeRoomDecorByType,
  sanitizeRoomDecorItems,
  upsertRoomDecorItem,
  moveRoomDecorItem,
} from "../../../utils/minihome/cat-tower/catTowerRoomDecor";

export const GOCAT_ROOM_DECOR_STORAGE_KEY = "gocat_room_decor_items";

function loadRoomDecorFromStorage(): RoomDecorItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GOCAT_ROOM_DECOR_STORAGE_KEY);
    if (!raw) return [];
    return parseStoredRoomDecor(JSON.parse(raw));
  } catch (e) {
    console.warn("[GoCat] loadRoomDecor failed", e);
    return [];
  }
}

function saveRoomDecorToStorage(items: RoomDecorItem[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(GOCAT_ROOM_DECOR_STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch (e) {
    console.warn("[GoCat] saveRoomDecor failed", e);
    return false;
  }
}

/** 방 가구·장식 — localStorage 영속 + 해금 조건 반영 */
export function useRoomDecor(unlockContext?: RoomDecorUnlockContext) {
  const [items, setItems] = useState<RoomDecorItem[]>(() => loadRoomDecorFromStorage());

  const safeItems = useMemo(
    () => (unlockContext ? sanitizeRoomDecorItems(items, unlockContext) : items),
    [items, unlockContext]
  );

  useEffect(() => {
    if (!unlockContext) return;
    setItems((prev) => {
      const next = sanitizeRoomDecorItems(prev, unlockContext);
      return next.length === prev.length ? prev : next;
    });
  }, [unlockContext]);

  useEffect(() => {
    const timer = window.setTimeout(() => saveRoomDecorToStorage(items), 400);
    return () => window.clearTimeout(timer);
  }, [items]);

  const addItem = useCallback((type: RoomDecorType) => {
    setItems((prev) => upsertRoomDecorItem(prev, type));
  }, []);

  const removeItem = useCallback((type: RoomDecorType) => {
    setItems((prev) => removeRoomDecorByType(prev, type));
  }, []);

  const removeItemById = useCallback((id: string) => {
    setItems((prev) => removeRoomDecorById(prev, id));
  }, []);

  const toggleItem = useCallback((type: RoomDecorType) => {
    setItems((prev) => {
      const exists = prev.some((i) => i.type === type);
      if (exists) return removeRoomDecorByType(prev, type);
      return upsertRoomDecorItem(prev, type);
    });
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
  }, []);

  const moveItem = useCallback((id: string, x: number, y: number) => {
    setItems((prev) => moveRoomDecorItem(prev, id, x, y));
  }, []);

  const hasType = useCallback(
    (type: RoomDecorType) => safeItems.some((i) => i.type === type),
    [safeItems]
  );

  return {
    items: safeItems,
    addItem,
    removeItem,
    removeItemById,
    toggleItem,
    clearAll,
    moveItem,
    hasType,
  };
}
