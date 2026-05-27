import { useCallback, useEffect, useRef, useState } from "react";
import { updateMyCatAppearance } from "../../../api/minihome/miniHomeApi";
import type { GoCat } from "../../../types/minihome/minihome";
import {
  DEFAULT_CAT_APPEARANCE,
  parseCatAppearance,
  toAppearanceApiPayload,
  type CatAppearance,
} from "../../../utils/minihome/gocat/catAppearance";
import { useNotification } from "../../../contexts/NotificationContext";
import { mapMiniHomeApiError } from "../../../utils/minihome/core/minihomeApiError";

/** 꾸미기 모달 — 색상 draft + API 저장 */
export function useCatAppearance(cat: GoCat | null, modalOpen: boolean, canEdit = true) {
  const { toast } = useNotification();
  const saved = parseCatAppearance(cat?.appearanceState ?? null);

  const [draft, setDraft] = useState<CatAppearance>(saved);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const prevModalOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = modalOpen && !prevModalOpenRef.current;
    prevModalOpenRef.current = modalOpen;
    if (!justOpened) return;
    setDraft(parseCatAppearance(cat?.appearanceState ?? null));
    setErr(null);
    setInfo(null);
  }, [modalOpen, cat?.goCatId, cat?.appearanceState]);

  const saveAppearance = useCallback(async (): Promise<GoCat | null> => {
    if (!canEdit) {
      const msg = "다른 사용자 홈에서는 저장할 수 없습니다.";
      setErr(msg);
      toast(msg, "warning");
      return null;
    }

    setSaving(true);
    setErr(null);
    setInfo(null);
    try {
      const updated = await updateMyCatAppearance({
        ...toAppearanceApiPayload(draft),
        catName: cat?.catName,
      });
      setDraft(parseCatAppearance(updated?.appearanceState ?? null));
      setInfo("저장되었습니다.");
      toast("고냥이가 저장되었습니다.", "success");
      return updated;
    } catch (e: unknown) {
      const msg = mapMiniHomeApiError(e, "저장 중 오류가 발생했습니다.");
      setErr(msg);
      toast(msg, "error");
      return null;
    } finally {
      setSaving(false);
    }
  }, [draft, canEdit, cat?.catName, toast]);

  const resetDraft = useCallback(() => {
    setDraft(parseCatAppearance(cat?.appearanceState ?? null));
  }, [cat?.appearanceState]);

  return {
    saved,
    draft,
    setDraft,
    saving,
    err,
    info,
    saveAppearance,
    resetDraft,
    defaults: DEFAULT_CAT_APPEARANCE,
  };
}
