import { lazy, memo, Suspense, type ReactNode } from "react";
import type { ActivityItem, GalleryItem } from "../../../types/minihome/minihome";
import type { EquipPreview } from "../../../utils/minihome/gocat/items";
import type { GrowthStage } from "../../../utils/minihome/growth/growth";
import type { RoomBackgroundId } from "../../../utils/minihome/cat-tower/catTowerRoomBackground";
import type { RoomDecorItem } from "../../../utils/minihome/cat-tower/catTowerRoomDecor";
import { CATTOWER_ROOM_3D_ENABLED } from "../../../config/catTower3d";
import type { CatTowerCenterPanelId } from "./catTowerPanelTypes";
import CatTowerRecentActivityCards from "./CatTowerRecentActivityCards";
import CatTowerGalleryPreview from "./CatTowerGalleryPreview";
import CatTowerGuestbookBlock from "./CatTowerGuestbookBlock";
import CatTowerRoomStageFallback from "./CatTowerRoomStageFallback";
import { CATTOWER_STAGE_MIN_H } from "./catTowerLayout";

const CatTowerRoom3DStage = lazy(() => import("./CatTowerRoom3DStage"));
const CatTowerRoomStage = lazy(() => import("./CatTowerRoomStage"));

const TAB_PREVIEW_LIMIT = 6;

type CatTowerCenterPanelProps = {
  panel: CatTowerCenterPanelId;
  growthStage: GrowthStage;
  activityCount: number;
  equipped: EquipPreview;
  roomBackground: RoomBackgroundId;
  roomDecorItems?: RoomDecorItem[];
  catName: string;
  isReadOnly?: boolean;
  /** false — 방 꾸미기/Go냥이 꾸미기 모달 등으로 메인 WebGL 일시 중지 */
  roomActive?: boolean;
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
      className={`flex ${CATTOWER_STAGE_MIN_H} flex-col overflow-hidden rounded-[1.75rem] border border-orange-100/90 bg-gradient-to-b from-white via-[#fffaf5] to-orange-50/40 shadow-[0_8px_32px_rgba(255,140,80,0.08)] ring-1 ring-orange-50`}
    >
      <div className="shrink-0 border-b border-orange-100/70 bg-gradient-to-r from-orange-50 to-amber-50/80 px-4 py-3 text-center">
        <p className="text-sm font-extrabold tracking-wide text-orange-900/80">
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
  roomActive = true,
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
    if (!roomActive) {
      return <CatTowerRoomStageFallback label="꾸미기 중…" />;
    }

    if (CATTOWER_ROOM_3D_ENABLED) {
      return (
        <Suspense fallback={<CatTowerRoomStageFallback />}>
          <CatTowerRoom3DStage
            growthStage={growthStage}
            activityCount={activityCount}
            equipped={equipped}
            roomBackground={roomBackground}
            roomDecorItems={roomDecorItems}
            catName={catName}
            readOnly={isReadOnly}
          />
        </Suspense>
      );
    }

    return (
      <Suspense fallback={<CatTowerRoomStageFallback />}>
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
      </Suspense>
    );
  }

  if (panel === "gallery") {
    return (
      <TabPanelShell title={isReadOnly ? `${catName}의 갤러리` : "갤러리"} emoji="📸">
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
      <TabPanelShell title={isReadOnly ? `${catName}의 히스토리` : "히스토리"} emoji="📋">
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
    <TabPanelShell title={isReadOnly ? `${catName}의 방명록` : "방명록"} emoji="✉️">
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
