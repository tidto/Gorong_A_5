import { useCallback, useEffect, useState } from "react";
import { updateMyCatAppearance } from "../../../api/minihome/miniHomeApi";
import {
  type RoomBackgroundId,
  loadRoomBackgroundFromStorage,
  normalizeRoomBackground,
  parseRoomBackgroundFromAppearance,
  sanitizeRoomBackgroundForStage,
  saveRoomBackgroundToStorage,
} from "../../../utils/minihome/cat-tower/catTowerRoomBackground";
import type { GrowthStage } from "../../../utils/minihome/growth/growth";

type Options = {
  appearanceState?: Record<string, unknown> | null;
  /** false — 다른 유저 CatTower: localStorage 미사용 */
  useLocalStorage?: boolean;
  growthStage?: GrowthStage;
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
export function useRoomBackground({
  appearanceState,
  useLocalStorage = true,
  growthStage = "BASIC",
}: Options) {
  const clamp = (id: RoomBackgroundId) => sanitizeRoomBackgroundForStage(id, growthStage);

  const [background, setBackground] = useState<RoomBackgroundId>(() =>
    clamp(resolveInitialBackground(appearanceState, useLocalStorage))
  );
  const [savedBackground, setSavedBackground] = useState<RoomBackgroundId>(() =>
    clamp(resolveInitialBackground(appearanceState, useLocalStorage))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (useLocalStorage) return;
    const fromApi = clamp(resolveInitialBackground(appearanceState, false));
    setBackground(fromApi);
    setSavedBackground(fromApi);
  }, [appearanceState, useLocalStorage, growthStage]);

  useEffect(() => {
    setBackground((prev) => sanitizeRoomBackgroundForStage(prev, growthStage));
    setSavedBackground((prev) => sanitizeRoomBackgroundForStage(prev, growthStage));
  }, [growthStage]);

  const selectBackground = useCallback(
    (id: RoomBackgroundId) => {
      const next = normalizeRoomBackground(id);
      setBackground(sanitizeRoomBackgroundForStage(next, growthStage));
      setError(null);
    },
    [growthStage]
  );

  const saveBackground = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    setError(null);

    const safeBg = sanitizeRoomBackgroundForStage(background, growthStage);
    const localOk = saveRoomBackgroundToStorage(safeBg);
    if (!localOk) {
      setError("방 배경을 기기에 저장하지 못했습니다.");
      setSaving(false);
      return false;
    }

    try {
      await updateMyCatAppearance({ roomBackground: safeBg });
    } catch (e) {
      console.warn("[GoCat] roomBackground API save failed — localStorage kept", e);
    }

    setBackground(safeBg);
    setSavedBackground(safeBg);
    setSaving(false);
    return true;
  }, [background, growthStage]);

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
