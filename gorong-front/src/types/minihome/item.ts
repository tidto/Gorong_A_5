import type { GrowthStage } from "../../utils/minihome/growth/growth";

export type UserItem = {
  userItemId: number;
  itemId: number;
  itemCode: string | null;
  itemName: string | null;
  itemType: string | null;
  imageUrl: string | null;
  acquiredAt: string;
  /** 이 아이템을 장착하기 위해 필요한 최소 성장 단계 */
  requiredGrowthStage?: GrowthStage;
};

export type Equipment = {
  catEquipId: number;
  goCatId: number;
  slotType: "HEAD" | "BODY" | "ACCESSORY" | string;
  itemId: number;
  itemCode: string | null;
  itemName: string | null;
  itemType: string | null;
  imageUrl: string | null;
  isActive: boolean;
  equippedAt: string;
};

