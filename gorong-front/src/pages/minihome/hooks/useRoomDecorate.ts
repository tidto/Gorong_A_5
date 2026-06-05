import { useCallback, useEffect, useMemo, useState } from "react";
import { updateMyCatAppearance } from "../../../api/minihome/miniHomeApi";
import {
  type RoomBackgroundId,
  normalizeRoomBackground,
  saveRoomBackgroundToStorage,
} from "../../../utils/minihome/cat-tower/catTowerRoomBackground";
import {
  type RoomPlacement,
  backgroundIdFromOwned,
  parseRoomOwnedIds,
  parseRoomPlacementsFromAppearance,
  placementsToApiPayload,
  removePlacement,
  resolveRoomBackgroundFromState,
  upsertPlacement,
  updatePlacementPosition,
} from "../../../utils/minihome/cat-tower/catTowerRoomCatalog";
import { getCatTowerRoomPresentation } from "../../../utils/minihome/cat-tower/catTowerRoomPresentation";

type Options = {
  appearanceState?: Record<string, unknown> | null;
  /** true = 내 캣타워 — DB 없을 때만 localStorage */
  useLocalStorage?: boolean;
  onSaved?: (appearanceState: Record<string, unknown>) => void;
};

function resolveSaved(
  appearanceState?: Record<string, unknown> | null,
  localCacheFallback = true
): { background: RoomBackgroundId; items: RoomPlacement[]; owned: Set<string> } {
  const { background, items, owned } = getCatTowerRoomPresentation(
    appearanceState,
    localCacheFallback
  );
  return { background, items, owned };
}

/** 방 배경 + 가구/장식 — DB 저장 (appearance_state) */
export function useRoomDecorate({
  appearanceState,
  useLocalStorage = true,
  onSaved,
}: Options) {
  const savedSnapshot = useMemo(
    () => resolveSaved(appearanceState, useLocalStorage),
    [appearanceState, useLocalStorage]
  );

  const [background, setBackground] = useState<RoomBackgroundId>(savedSnapshot.background);
  const [savedBackground, setSavedBackground] = useState<RoomBackgroundId>(savedSnapshot.background);
  const [items, setItems] = useState<RoomPlacement[]>(savedSnapshot.items);
  const [savedItems, setSavedItems] = useState<RoomPlacement[]>(savedSnapshot.items);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(savedSnapshot.owned);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next = resolveSaved(appearanceState, useLocalStorage);
    setBackground(next.background);
    setSavedBackground(next.background);
    setItems(next.items);
    setSavedItems(next.items);
    setOwnedIds(next.owned);
  }, [appearanceState, useLocalStorage]);

  const selectBackground = useCallback(
    (id: RoomBackgroundId) => {
      const next = normalizeRoomBackground(id);
      setBackground(backgroundIdFromOwned(next, ownedIds));
      setError(null);
    },
    [ownedIds]
  );

  const togglePlacement = useCallback((itemId: string) => {
    setItems((prev) => {
      const exists = prev.some((i) => i.itemId === itemId);
      if (exists) return removePlacement(prev, itemId);
      return upsertPlacement(prev, itemId);
    });
    setError(null);
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => removePlacement(prev, itemId));
  }, []);

  const moveItem = useCallback((itemId: string, x: number, y: number) => {
    setItems((prev) => updatePlacementPosition(prev, itemId, x, y));
  }, []);

  const hasPlacement = useCallback(
    (itemId: string) => items.some((i) => i.itemId === itemId),
    [items]
  );

  const isDirty =
    background !== savedBackground ||
    JSON.stringify(items) !== JSON.stringify(savedItems);

  const save = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    setError(null);

    const safeBg = backgroundIdFromOwned(background, ownedIds);
    const safeItems = items.filter((p) => ownedIds.has(p.itemId));

    try {
      const cat = await updateMyCatAppearance({
        roomBackground: safeBg,
        roomItems: placementsToApiPayload(safeItems),
      });
      const state = (cat?.appearanceState ?? {}) as Record<string, unknown>;
      if (useLocalStorage) {
        saveRoomBackgroundToStorage(safeBg);
      }
      const owned = parseRoomOwnedIds(state);
      const syncedBg = resolveRoomBackgroundFromState(state, owned);
      const syncedItems = parseRoomPlacementsFromAppearance(state, owned);
      setBackground(syncedBg);
      setSavedBackground(syncedBg);
      setItems(syncedItems);
      setSavedItems(syncedItems);
      setOwnedIds(owned);
      onSaved?.(state);
      setSaving(false);
      return true;
    } catch (e) {
      console.warn("[GoCat] room decorate save failed", e);
      if (useLocalStorage) {
        const cached = saveRoomBackgroundToStorage(safeBg);
        if (cached) {
          setSavedBackground(safeBg);
          setBackground(safeBg);
        }
      }
      setError("방 꾸미기를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setSaving(false);
      return false;
    }
  }, [background, items, ownedIds, useLocalStorage, onSaved]);

  const resetDraft = useCallback(() => {
    setBackground(savedBackground);
    setItems(savedItems);
    setError(null);
  }, [savedBackground, savedItems]);

  return {
    background,
    savedBackground,
    items,
    savedItems,
    ownedIds,
    selectBackground,
    togglePlacement,
    removeItem,
    moveItem,
    hasPlacement,
    save,
    resetDraft,
    saving,
    error,
    isDirty,
  };
}
