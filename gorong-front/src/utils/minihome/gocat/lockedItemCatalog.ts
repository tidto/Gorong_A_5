import type { SlotType } from "../../../components/minihome/mini-home/DecorationModal";
import type { GrowthStage } from "../growth/growth";
import type { ItemRarity } from "./itemRarity";

/** API 미보유 시 수집 욕구용 showcase — 실제 USER_ITEM 과 무관한 mock */
export type LockedCatalogItem = {
  id: string;
  slotType: SlotType;
  itemName: string;
  emoji: string;
  rarity: ItemRarity;
  unlockHint: string;
  requiredGrowthStage?: GrowthStage;
};

/** 행사 카테고리 보상 — 실제 지급은 백엔드 EventCategoryItemRewardService */
export const EVENT_REWARD_ITEMS: LockedCatalogItem[] = [
  {
    id: "reward-cherry",
    slotType: "HEAD",
    itemName: "벚꽃 모자",
    emoji: "🌸",
    rarity: "EPIC",
    unlockHint: "벚꽃축제 리뷰·참여",
  },
  {
    id: "reward-neon",
    slotType: "ACCESSORY",
    itemName: "네온 안경",
    emoji: "🕶️",
    rarity: "RARE",
    unlockHint: "야시장 행사 참여",
  },
  {
    id: "reward-hanbok",
    slotType: "BODY",
    itemName: "한복",
    emoji: "🎎",
    rarity: "EPIC",
    unlockHint: "전통축제 참여",
  },
  {
    id: "reward-shell",
    slotType: "ACCESSORY",
    itemName: "조개 악세",
    emoji: "🐚",
    rarity: "RARE",
    unlockHint: "바다축제 참여",
  },
];

export const LOCKED_ITEM_CATALOG: LockedCatalogItem[] = [
  ...EVENT_REWARD_ITEMS,
  {
    id: "lock-wing",
    slotType: "HEAD",
    itemName: "고양이 날개",
    emoji: "🪽",
    rarity: "LEGENDARY",
    unlockHint: "활동 레벨 5 달성",
    requiredGrowthStage: "MASTER",
  },
  {
    id: "lock-ribbon",
    slotType: "HEAD",
    itemName: "핑크 리본",
    emoji: "🎀",
    rarity: "EPIC",
    unlockHint: "커플 행사 참여 보상",
    requiredGrowthStage: "ADULT",
  },
  {
    id: "lock-hat",
    slotType: "HEAD",
    itemName: "별 모자",
    emoji: "⭐",
    rarity: "RARE",
    unlockHint: "축제 3회 참여",
    requiredGrowthStage: "TEEN",
  },
  {
    id: "lock-coat",
    slotType: "BODY",
    itemName: "따뜻한 코트",
    emoji: "🧥",
    rarity: "RARE",
    unlockHint: "겨울 행사 인증",
    requiredGrowthStage: "TEEN",
  },
  {
    id: "lock-hoodie",
    slotType: "BODY",
    itemName: "고롱 후디",
    emoji: "👕",
    rarity: "EPIC",
    unlockHint: "미니홈 레벨 3",
    requiredGrowthStage: "ADULT",
  },
  {
    id: "lock-badge",
    slotType: "ACCESSORY",
    itemName: "탐험가 배지",
    emoji: "🏅",
    rarity: "RARE",
    unlockHint: "헬시 플래너 10km",
    requiredGrowthStage: "TEEN",
  },
  {
    id: "lock-bell",
    slotType: "ACCESSORY",
    itemName: "황금 방울",
    emoji: "🔔",
    rarity: "LEGENDARY",
    unlockHint: "마스터 등급 달성",
    requiredGrowthStage: "MASTER",
  },
];

export function lockedItemsForSlot(slot: SlotType): LockedCatalogItem[] {
  return LOCKED_ITEM_CATALOG.filter((i) => i.slotType === slot);
}
