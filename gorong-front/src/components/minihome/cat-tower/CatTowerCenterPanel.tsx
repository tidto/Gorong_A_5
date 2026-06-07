import { memo, type ReactNode } from "react";
import type { ActivityItem, GalleryItem } from "../../../types/minihome/minihome";
import type { EquipPreview } from "../../../utils/minihome/gocat/items";
import type { GrowthStage } from "../../../utils/minihome/growth/growth";
import type { RoomBackgroundId } from "../../../utils/minihome/cat-tower/catTowerRoomBackground";
import type { RoomDecorItem } from "../../../utils/minihome/cat-tower/catTowerRoomDecor";
import type { CatTowerCenterPanelId } from "./catTowerPanelTypes";
import CatTowerRoomStage from "./CatTowerRoomStage";
import CatTowerRecentActivityCards from "./CatTowerRecentActivityCards";
import CatTowerGalleryPreview from "./CatTowerGalleryPreview";
import CatTowerGuestbookBlock from "./CatTowerGuestbookBlock";

const TAB_PREVIEW_LIMIT = 6;
const PANEL_MIN_H = "min-h-[300px] sm:min-h-[360px]";

type CatTowerCenterPanelProps = {
  panel: CatTowerCenterPanelId;
  growthStage: GrowthStage;
  activityCount: number;
  equipped: EquipPreview;
  roomBackground: RoomBackgroundId;
  roomDecorItems?: RoomDecorItem[];
  catName: string;
  isReadOnly?: boolean;
  activities: ActivityItem[];
  galleries: GalleryItem[];
  galleryCount: number;
  roomOwnerId: number | null | undefined;
  myUserId: number | null | undefined;
  isOwner: boolean;
  pageReady: boolean;
  refreshToken?: number;
  onViewAllActivity?: () => void;
  onViewAllGallery?: () => void;
};

function TabPanelShell({
  title,
  emoji,
  children,
}: {
  title: string;
  emoji: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex ${PANEL_MIN_H} flex-col overflow-hidden rounded-[1.75rem] border border-orange-100/80 bg-gradient-to-b from-white/95 via-[#fffaf5] to-orange-50/30 shadow-[0_12px_36px_rgba(255,140,80,0.1)]`}
    >
      <div className="shrink-0 border-b border-orange-100/70 bg-gradient-to-r from-orange-50/90 to-amber-50/50 px-4 py-2.5 text-center">
        <p className="text-[11px] font-extrabold tracking-wide text-orange-900/75">
          {emoji} {title}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">{children}</div>
    </div>
  );
}

function CatTowerCenterPanel({
  panel,
  growthStage,
  activityCount,
  equipped,
  roomBackground,
  roomDecorItems = [],
  catName,
  isReadOnly = false,
  activities,
  galleries,
  galleryCount,
  roomOwnerId,
  myUserId,
  isOwner,
  pageReady,
  refreshToken = 0,
  onViewAllActivity,
  onViewAllGallery,
}: CatTowerCenterPanelProps) {
  if (panel === "room") {
    return (
      <CatTowerRoomStage
        growthStage={growthStage}
        activityCount={activityCount}
        equipped={equipped}
        roomBackground={roomBackground}
        roomDecorItems={roomDecorItems}
        catName={catName}
        interactive
        readOnly={isReadOnly}
      />
    );
  }

  if (panel === "gallery") {
    return (
      <TabPanelShell title="갤러리" emoji="📸">
        <CatTowerGalleryPreview
          galleries={galleries}
          totalCount={galleryCount}
          limit={TAB_PREVIEW_LIMIT}
          onViewAll={onViewAllGallery}
          embedded
        />
      </TabPanelShell>
    );
  }

  if (panel === "activity") {
    return (
      <TabPanelShell title="히스토리" emoji="📋">
        <CatTowerRecentActivityCards
          activities={activities.slice(0, TAB_PREVIEW_LIMIT)}
          totalCount={activities.length}
          onViewAll={onViewAllActivity}
          embedded
        />
      </TabPanelShell>
    );
  }

  return (
    <TabPanelShell title="방명록" emoji="✉️">
      <CatTowerGuestbookBlock
        catName={catName}
        roomOwnerId={roomOwnerId}
        myUserId={myUserId}
        isOwner={isOwner}
        pageReady={pageReady}
        refreshToken={refreshToken}
        previewLimit={TAB_PREVIEW_LIMIT}
        embedded
      />
    </TabPanelShell>
  );
}

export default memo(CatTowerCenterPanel);
