import type { DecorItem, SlotType } from "../../../components/minihome/mini-home/DecorationModal";
import { findGoCatItem, isGoCatSlotEnabled } from "../../../data/minihome/gocatItems";
import type { GoCatItemCategory } from "../../../data/minihome/gocatItems";

const SLOTS: SlotType[] = ["HEAD", "BODY", "ACCESSORY"];

function isCatalogItem(item: DecorItem | null): item is DecorItem {
  if (!item?.itemCode?.trim()) return false;
  return Boolean(findGoCatItem(item.itemCode));
}

/** 카탈로그·활성 슬롯 기준 장착 정리 */
export function sanitizeEquipDraft(
  draft: Record<SlotType, DecorItem | null>
): Record<SlotType, DecorItem | null> {
  const out: Record<SlotType, DecorItem | null> = { HEAD: null, BODY: null, ACCESSORY: null };
  for (const slot of SLOTS) {
    if (!isGoCatSlotEnabled(slot as GoCatItemCategory)) {
      out[slot] = null;
      continue;
    }
    out[slot] = isCatalogItem(draft[slot]) ? draft[slot] : null;
  }
  return out;
}

/** @deprecated sanitizeEquipDraft */
export const stripDraftToMvpHead = sanitizeEquipDraft;
