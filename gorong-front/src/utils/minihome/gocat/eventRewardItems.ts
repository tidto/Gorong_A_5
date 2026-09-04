import type { SlotType } from "./gocatSlots";

/** 행사 키워드 → 보상 (장식/BADGE·퇴역 NECK 보상 제외) */
export const EVENT_REWARD_RULES: {
  keywords: string[];
  itemCode: string;
  slot: SlotType;
}[] = [];
