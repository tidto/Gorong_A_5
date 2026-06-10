import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { updateMyCatAppearance } from "../../../api/minihome/miniHomeApi";
import {
  type RoomDecorItem,
  type RoomDecorType,
  type RoomDecorUnlockContext,
  parseRoomDecorFromAppearance,
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

type UseRoomDecorOptions = {
  unlockContext?: RoomDecorUnlockContext;
  appearanceState?: Record<string, unknown> | null;
  /** false — 방문자: 서버 appearance만 표시 */
  canEdit?: boolean;
};

function resolveInitialItems(
  appearanceState: Record<string, unknown> | null | undefined,
  canEdit: boolean
): RoomDecorItem[] {
  const fromApi = parseRoomDecorFromAppearance(appearanceState);
  if (fromApi.length > 0) return fromApi;
  if (canEdit) return loadRoomDecorFromStorage();
  return [];
}

/** 방 가구·장식 — 서버 appearance_state 영속 + 방문자 노출 */
export function useRoomDecor({
  unlockContext,
  appearanceState,
  canEdit = true,
}: UseRoomDecorOptions = {}) {
  const [items, setItems] = useState<RoomDecorItem[]>(() =>
    resolveInitialItems(appearanceState, canEdit)
  );
  const skipNextSaveRef = useRef(true);
  const savingRef = useRef(false);

  const safeItems = useMemo(
    () => (unlockContext ? sanitizeRoomDecorItems(items, unlockContext) : items),
    [items, unlockContext]
  );

  useEffect(() => {
    skipNextSaveRef.current = true;
    const next = resolveInitialItems(appearanceState, canEdit);
    setItems(unlockContext ? sanitizeRoomDecorItems(next, unlockContext) : next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- appearanceState 변경 시에만 서버 값으로 동기화
  }, [appearanceState, canEdit]);

  useEffect(() => {
    if (!unlockContext) return;
    setItems((prev) => {
      const next = sanitizeRoomDecorItems(prev, unlockContext);
      return next.length === prev.length ? prev : next;
    });
  }, [unlockContext]);

  useEffect(() => {
    if (!canEdit) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    if (savingRef.current) return;

    const timer = window.setTimeout(() => {
      savingRef.current = true;
      saveRoomDecorToStorage(items);
      void updateMyCatAppearance({ roomDecorItems: items })
        .catch((e) => console.warn("[GoCat] roomDecor API save failed", e))
        .finally(() => {
          savingRef.current = false;
        });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [items, canEdit]);

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

  const saveNow = useCallback(async (): Promise<boolean> => {
    if (!canEdit) return false;
    saveRoomDecorToStorage(items);
    try {
      await updateMyCatAppearance({ roomDecorItems: items });
      return true;
    } catch (e) {
      console.warn("[GoCat] roomDecor immediate save failed", e);
      return false;
    }
  }, [canEdit, items]);

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
    saveNow,
    hasType,
  };
}
