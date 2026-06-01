import { useCallback, useEffect, useState } from "react";
import {
  type RoomDecorItem,
  type RoomDecorType,
  parseStoredRoomDecor,
  removeRoomDecorById,
  removeRoomDecorByType,
  upsertRoomDecorItem,
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

/** 방 꾸미기 — localStorage 영속 (드래그는 다음 단계) */
export function useRoomDecor() {
  const [items, setItems] = useState<RoomDecorItem[]>(() => loadRoomDecorFromStorage());

  useEffect(() => {
    saveRoomDecorToStorage(items);
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

  const hasType = useCallback(
    (type: RoomDecorType) => items.some((i) => i.type === type),
    [items]
  );

  return { items, addItem, removeItem, removeItemById, toggleItem, clearAll, hasType };
}
