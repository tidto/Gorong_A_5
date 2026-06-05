import { memo, useCallback, useState } from "react";
import type { ActivityItem, GalleryItem } from "../../../types/minihome/minihome";
import type { GrowthState } from "../../../utils/minihome/growth/growth";
import type { EquipPreview } from "../../../utils/minihome/gocat/items";
import { useRoomDecorate } from "../../../pages/minihome/hooks/useRoomDecorate";
import { useNotification } from "../../../contexts/NotificationContext";
import {
  CatTowerPageBackdrop,
  CatTowerRoomThemeProvider,
  useCatTowerPageTheme,
} from "../../../contexts/CatTowerRoomThemeContext";
import type { RoomBackgroundId } from "../../../utils/minihome/cat-tower/catTowerRoomBackground";
import type { RoomPlacement } from "../../../utils/minihome/cat-tower/catTowerRoomCatalog";
import type { CatTowerCenterPanelId } from "./catTowerPanelTypes";
import CatTowerProfilePanel from "./CatTowerProfilePanel";
import CatTowerCenterPanel from "./CatTowerCenterPanel";
import CatTowerVisitorBlock from "./CatTowerVisitorBlock";
import CatTowerViewAllModal from "./CatTowerViewAllModal";
import CatTowerRoomDecorateModal from "./CatTowerRoomDecorateModal";
import ActivityHistory from "../mini-home/ActivityHistory";
import GallerySection from "../mini-home/GallerySection";

type CatTowerDashboardProps = {
  nickname: string;
  catName: string;
  growth: GrowthState;
  isPublic: boolean;
  equipped: EquipPreview;
  appearanceState?: Record<string, unknown> | null;
  activities: ActivityItem[];
  galleries: GalleryItem[];
  activityCount: number;
  galleryCount: number;
  loading?: boolean;
  busy?: boolean;
  canEdit?: boolean;
  isReadOnly?: boolean;
  resolvingOwner?: boolean;
  roomOwnerId: number | null | undefined;
  myUserId: number | null | undefined;
  isOwner: boolean;
  pageReady: boolean;
  refreshToken?: number;
  onDecorate: () => void;
  onBack: () => void;
  onEvents: () => void;
  onRefresh: () => void;
  onAppearanceSaved?: (appearanceState: Record<string, unknown>) => void;
  onReport?: () => void;
};

function CatTowerDashboard({
  nickname,
  catName,
  growth,
  isPublic,
  equipped,
  appearanceState,
  activities,
  galleries,
  activityCount,
  galleryCount,
  loading,
  busy,
  canEdit = true,
  isReadOnly = false,
  resolvingOwner = false,
  roomOwnerId,
  myUserId,
  isOwner,
  pageReady,
  refreshToken = 0,
  onDecorate,
  onBack,
  onEvents,
  onRefresh,
  onAppearanceSaved,
  onReport,
}: CatTowerDashboardProps) {
  const { toast } = useNotification();
  const [centerPanel, setCenterPanel] = useState<CatTowerCenterPanelId>("room");
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [roomDecorateOpen, setRoomDecorateOpen] = useState(false);

  const room = useRoomDecorate({
    appearanceState,
    useLocalStorage: canEdit && !isReadOnly,
    onSaved: onAppearanceSaved,
  });

  const displayBackground = roomDecorateOpen && canEdit ? room.background : room.savedBackground;
  const displayItems = roomDecorateOpen && canEdit ? room.items : room.savedItems;

  const handleSaveRoom = useCallback(async () => {
    const ok = await room.save();
    if (ok) {
      toast("방 꾸미기가 저장되었습니다.", "success");
      setRoomDecorateOpen(false);
    }
  }, [room, toast]);

  return (
    <CatTowerRoomThemeProvider roomBackground={displayBackground}>
      <CatTowerPageBackdrop />
      <CatTowerDashboardBody
        nickname={nickname}
        catName={catName}
        growth={growth}
        isPublic={isPublic}
        equipped={equipped}
        activities={activities}
        galleries={galleries}
        activityCount={activityCount}
        galleryCount={galleryCount}
        loading={loading}
        busy={busy}
        canEdit={canEdit}
        isReadOnly={isReadOnly}
        resolvingOwner={resolvingOwner}
        roomOwnerId={roomOwnerId}
        myUserId={myUserId}
        isOwner={isOwner}
        pageReady={pageReady}
        refreshToken={refreshToken}
        displayBackground={displayBackground}
        displayItems={displayItems}
        centerPanel={centerPanel}
        setCenterPanel={setCenterPanel}
        activityModalOpen={activityModalOpen}
        setActivityModalOpen={setActivityModalOpen}
        galleryModalOpen={galleryModalOpen}
        setGalleryModalOpen={setGalleryModalOpen}
        roomDecorateOpen={roomDecorateOpen}
        setRoomDecorateOpen={setRoomDecorateOpen}
        room={room}
        onDecorate={onDecorate}
        onBack={onBack}
        onEvents={onEvents}
        onRefresh={onRefresh}
        onReport={onReport}
        handleSaveRoom={handleSaveRoom}
      />
    </CatTowerRoomThemeProvider>
  );
}

type DashboardBodyProps = Omit<
  CatTowerDashboardProps,
  "appearanceState" | "onAppearanceSaved"
> & {
  displayBackground: RoomBackgroundId;
  displayItems: RoomPlacement[];
  centerPanel: CatTowerCenterPanelId;
  setCenterPanel: (p: CatTowerCenterPanelId) => void;
  activityModalOpen: boolean;
  setActivityModalOpen: (v: boolean) => void;
  galleryModalOpen: boolean;
  setGalleryModalOpen: (v: boolean) => void;
  roomDecorateOpen: boolean;
  setRoomDecorateOpen: (v: boolean) => void;
  room: ReturnType<typeof useRoomDecorate>;
  handleSaveRoom: () => void;
};

function CatTowerDashboardBody({
  nickname,
  catName,
  growth,
  isPublic,
  equipped,
  activities,
  galleries,
  activityCount,
  galleryCount,
  loading,
  busy,
  canEdit,
  isReadOnly,
  resolvingOwner,
  roomOwnerId,
  myUserId,
  isOwner,
  pageReady,
  refreshToken,
  displayBackground,
  displayItems,
  centerPanel,
  setCenterPanel,
  activityModalOpen,
  setActivityModalOpen,
  galleryModalOpen,
  setGalleryModalOpen,
  roomDecorateOpen,
  setRoomDecorateOpen,
  room,
  onDecorate,
  onBack,
  onEvents,
  onRefresh,
  onReport,
  handleSaveRoom,
}: DashboardBodyProps) {
  const pageTheme = useCatTowerPageTheme();

  return (
    <div className="relative space-y-3">
      <header
        className={`relative overflow-hidden rounded-2xl border shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-colors duration-500 ${pageTheme.bannerBorderClass} ${pageTheme.bannerClass}`}
      >
        <div className="relative flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/85">
              {isReadOnly ? "✨ Guest MiniHome" : "✨ My MiniHome"}
            </p>
            <h1 className="text-base font-extrabold text-white drop-shadow-sm sm:text-lg">
              {loading ? "불러오는 중…" : `${catName}의 CatTower`}
            </h1>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {isReadOnly && onReport ? (
              <button
                type="button"
                onClick={onReport}
                className="rounded-full border border-white/40 bg-white/10 px-2 py-0.5 text-[9px] font-semibold text-white/90 backdrop-blur-sm hover:bg-white/20"
              >
                신고
              </button>
            ) : null}
            {isReadOnly ? (
              <button
                type="button"
                onClick={onBack}
                className="rounded-full border border-white/50 bg-white/15 px-2.5 py-1 text-[9px] font-bold text-white backdrop-blur-sm hover:bg-white/25"
              >
                ← 내 CatTower
              </button>
            ) : null}
            <div className="rounded-full border border-white/35 bg-white/20 px-3 py-1 text-[10px] font-bold text-white shadow-sm backdrop-blur-md">
              {resolvingOwner ? "확인 중…" : isReadOnly ? "👀 둘러보기" : "🏡 내 공간"}
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-3 lg:grid-cols-[minmax(180px,220px)_1fr_minmax(150px,180px)]">
        <CatTowerProfilePanel
          nickname={nickname}
          catName={catName}
          growth={growth}
          isPublic={isPublic}
          galleryCount={galleryCount}
          loading={loading}
          showParticipatingEvents={isOwner && !isReadOnly}
          refreshToken={refreshToken}
        />

        <CatTowerCenterPanel
          panel={centerPanel}
          growthStage={growth.stage}
          activityCount={activityCount}
          equipped={equipped}
          roomBackground={displayBackground}
          roomItems={displayItems}
          catName={catName}
          isReadOnly={isReadOnly}
          activities={activities}
          galleries={galleries}
          galleryCount={galleryCount}
          roomOwnerId={roomOwnerId}
          myUserId={myUserId}
          isOwner={isOwner}
          pageReady={pageReady}
          refreshToken={refreshToken}
          onViewAllActivity={() => setActivityModalOpen(true)}
          onViewAllGallery={() => setGalleryModalOpen(true)}
        />

        <CatTowerVisitorBlock
          busy={busy}
          loading={loading}
          readOnly={isReadOnly}
          canEdit={canEdit}
          roomOwnerId={roomOwnerId}
          myUserId={myUserId}
          isOwner={isOwner}
          pageReady={pageReady}
          refreshToken={refreshToken}
          onRoomDecorate={
            canEdit
              ? () => {
                  setRoomDecorateOpen(true);
                  onRefresh();
                }
              : undefined
          }
          onCatDecorate={onDecorate}
          onBack={onBack}
          onEvents={onEvents}
          onRefresh={onRefresh}
          activePanel={centerPanel}
          onPanelChange={setCenterPanel}
        />
      </div>

      <CatTowerViewAllModal
        open={activityModalOpen}
        title="활동 기록"
        subtitle={`총 ${activities.length}건의 활동`}
        emoji="📋"
        onClose={() => setActivityModalOpen(false)}
      >
        <ActivityHistory
          activities={activities}
          variant="full"
          emptyMessage="아직 활동 기록이 없어요. 행사에 참여해 보세요!"
        />
      </CatTowerViewAllModal>

      <CatTowerViewAllModal
        open={galleryModalOpen}
        title="갤러리"
        subtitle={`총 ${galleryCount}개`}
        emoji="📸"
        onClose={() => setGalleryModalOpen(false)}
      >
        <GallerySection
          galleries={galleries}
          variant="preview"
          emptyMessage="등록된 갤러리가 없습니다."
        />
      </CatTowerViewAllModal>

      {canEdit ? (
        <CatTowerRoomDecorateModal
          open={roomDecorateOpen}
          selectedBg={room.background}
          savedBg={room.savedBackground}
          items={room.items}
          ownedIds={room.ownedIds}
          isDirty={room.isDirty}
          saving={room.saving}
          error={room.error}
          onSelectBg={room.selectBackground}
          onToggleItem={room.togglePlacement}
          onRemoveItem={room.removeItem}
          onMoveItem={room.moveItem}
          onSave={handleSaveRoom}
          onCatDecorate={onDecorate}
          onClose={() => {
            room.resetDraft();
            setRoomDecorateOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

export default memo(CatTowerDashboard);
