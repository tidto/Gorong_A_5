export type UserItem = {
  userItemId: number;
  itemId: number;
  itemCode: string | null;
  itemName: string | null;
  itemType: string | null;
  imageUrl: string | null;
  acquiredAt: string;
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

