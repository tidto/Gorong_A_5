import { useCallback, useEffect, useState } from "react";
import { updateMyCatAppearance } from "../../../api/minihome/miniHomeApi";
import {
  type RoomBackgroundId,
  loadRoomBackgroundFromStorage,
  normalizeRoomBackground,
  parseRoomBackgroundFromAppearance,
  saveRoomBackgroundToStorage,
} from "../../../utils/minihome/catTowerRoomBackground";

type Options = {
  appearanceState?: Record<string, unknown> | null;
  /** false — 다른 유저 CatTower: localStorage 미사용 */
  useLocalStorage?: boolean;
};

function resolveInitialBackground(
  appearanceState?: Record<string, unknown> | null,
  useLocalStorage = true
): RoomBackgroundId {
  if (useLocalStorage) {
    return (
      loadRoomBackgroundFromStorage() ??
      parseRoomBackgroundFromAppearance(appearanceState) ??
      "BASIC_ROOM"
    );
  }
  return parseRoomBackgroundFromAppearance(appearanceState) ?? "BASIC_ROOM";
}

/** 내 공간 — 방 배경 선택·저장 (API 우선, localStorage fallback) */
export function useRoomBackground({ appearanceState, useLocalStorage = true }: Options) {
  const [background, setBackground] = useState<RoomBackgroundId>(() =>
    resolveInitialBackground(appearanceState, useLocalStorage)
  );
  const [savedBackground, setSavedBackground] = useState<RoomBackgroundId>(() =>
    resolveInitialBackground(appearanceState, useLocalStorage)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (useLocalStorage) return;
    const fromApi = resolveInitialBackground(appearanceState, false);
    setBackground(fromApi);
    setSavedBackground(fromApi);
  }, [appearanceState, useLocalStorage]);

  const selectBackground = useCallback((id: RoomBackgroundId) => {
    setBackground(normalizeRoomBackground(id));
    setError(null);
  }, []);

  const saveBackground = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    setError(null);

    const localOk = saveRoomBackgroundToStorage(background);
    if (!localOk) {
      setError("방 배경을 기기에 저장하지 못했습니다.");
      setSaving(false);
      return false;
    }

    try {
      await updateMyCatAppearance({ roomBackground: background });
    } catch (e) {
      console.warn("[GoCat] roomBackground API save failed — localStorage kept", e);
    }

    setSavedBackground(background);
    setSaving(false);
    return true;
  }, [background]);

  const isDirty = background !== savedBackground;

  return {
    background,
    savedBackground,
    selectBackground,
    saveBackground,
    saving,
    error,
    isDirty,
  };
}
