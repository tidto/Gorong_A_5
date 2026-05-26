export type GoCat = {
  goCatId: number;
  miniHomeId: number;
  userId: number;
  catName: string;
  characterType: string;
  appearanceState: Record<string, any> | null;
  temperatureTotal: number;
  level: number;
};

export type MiniHome = {
  miniHomeId: number;
  userId: number;
  userId2: number;
  description: string | null;
  themeCode: string | null;
  isPublic: boolean;
  cat: GoCat | null;
};

export type ActivityItem = {
  activityId: number;
  activityType: string | null;
  referenceId: number | null;
  temperatureChange: number;
  title?: string | null;
  description?: string | null;
  createAt: string;
};

export type GalleryImageItem = {
  galleryImageId: number;
  imageUrl: string;
  locationName: string | null;
  takenAt: string | null;
  createAt: string;
};

export type GalleryItem = {
  galleryId: number;
  title: string | null;
  description: string | null;
  createAt: string;
  images: GalleryImageItem[];
};

export type EquipItem = {
  catEquipId: number;
  slotType: string;
  equippedAt: string;
  itemId: number;
  itemCode: string | null;
  itemName: string | null;
  itemType: string | null;
  imageUrl: string | null;
};

export type MiniHomePage = {
  miniHome: MiniHome;
  ownerNickname?: string | null;
  stats: {
    activityCount: number;
    temperatureTotal: number;
    level: number;
    growthStage?: string;
    galleryCount?: number;
  };
  activities: ActivityItem[];
  galleries: GalleryItem[];
  activeEquips: EquipItem[];
};

