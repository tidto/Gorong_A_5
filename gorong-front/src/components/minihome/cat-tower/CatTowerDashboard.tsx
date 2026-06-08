import { memo, useCallback, useMemo, useState } from "react";
import type { ActivityItem, GalleryItem } from "../../../types/minihome/minihome";
import type { GrowthState } from "../../../utils/minihome/growth/growth";
import type { EquipPreview } from "../../../utils/minihome/gocat/items";
import { useRoomBackground } from "../../../pages/minihome/hooks/useRoomBackground";
import { useRoomDecor } from "../../../pages/minihome/hooks/useRoomDecor";
import { buildRoomDecorUnlockContext } from "../../../utils/minihome/cat-tower/catTowerRoomDecor";
import { useNotification } from "../../../contexts/NotificationContext";
import type { CatTowerCenterPanelId } from "./catTowerPanelTypes";
import CatTowerProfilePanel from "./CatTowerProfilePanel";
import CatTowerCenterPanel from "./CatTowerCenterPanel";
import CatTowerVisitorBlock from "./CatTowerVisitorBlock";
import CatTowerViewAllModal from "./CatTowerViewAllModal";
import CatTowerRoomDecorateModal from "./CatTowerRoomDecorateModal";
import CatTowerMobileTabs from "./CatTowerMobileTabs";
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
  /** Go냥이 꾸미기 모달 열림 — 메인 방 WebGL 일시 중지 */
  catDecorateOpen?: boolean;
  onDecorate: () => void;
  onBack: () => void;
  onEvents: () => void;
  onRefresh: () => void;
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
  catDecorateOpen = false,
  onDecorate,
  onBack,
  onEvents,
  onRefresh,
  onReport,
}: CatTowerDashboardProps) {
  const { toast } = useNotification();
  const [centerPanel, setCenterPanel] = useState<CatTowerCenterPanelId>("room");
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [roomDecorateOpen, setRoomDecorateOpen] = useState(false);

  const roomBg = useRoomBackground({
    growthStage: growth.stage,
    appearanceState,
    useLocalStorage: canEdit,
  });

  const decorUnlockContext = useMemo(
    () => buildRoomDecorUnlockContext(growth.stage, growth.activityCount, activities),
    [growth.stage, growth.activityCount, activities]
  );

  const roomDecor = useRoomDecor(canEdit ? decorUnlockContext : undefined);

  const placedDecorTypes = useMemo(
    () => new Set(roomDecor.items.map((item) => item.type)),
    [roomDecor.items]
  );

  const handleSaveRoomBackground = useCallback(async () => {
    const ok = await roomBg.saveBackground();
    if (ok) {
      toast("방 배경이 저장되었습니다.", "success");
      setRoomDecorateOpen(false);
    }
  }, [roomBg, toast]);

  const openActivityModal = useCallback(() => setActivityModalOpen(true), []);
  const openGalleryModal = useCallback(() => setGalleryModalOpen(true), []);
  const openRoomDecorate = useCallback(() => setRoomDecorateOpen(true), []);

  const roomActive =
    centerPanel === "room" && !roomDecorateOpen && !catDecorateOpen;

  return (
    <div className="relative space-y-3">
      <header className="relative overflow-hidden rounded-2xl border border-orange-200/60 bg-gradient-to-r from-orange-400 via-rose-400 to-emerald-400 shadow-[0_4px_20px_rgba(255,140,80,0.18)]">
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-6 left-8 h-24 w-24 rounded-full bg-emerald-300/20 blur-2xl"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/90">
              {isReadOnly ? "✨ Guest MiniHome" : "✨ My MiniHome"}
            </p>
            <h1 className="text-lg font-extrabold text-white drop-shadow-sm sm:text-xl">
              {loading ? "불러오는 중…" : `${catName}의 CatTower`}
            </h1>
            {!loading && isReadOnly && nickname ? (
              <p className="mt-0.5 text-xs font-semibold text-white/85">{nickname}님의 미니홈</p>
            ) : null}
            {!loading ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white/95 backdrop-blur-sm">
                  🌱 {growth.stageLabel}
                </span>
                <span className="rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white/95 backdrop-blur-sm">
                  📋 활동 {activityCount}회
                </span>
                <span className="rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white/95 backdrop-blur-sm">
                  📸 갤러리 {galleryCount}개
                </span>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isReadOnly && onReport ? (
              <button
                type="button"
                onClick={onReport}
                className="rounded-full border border-white/40 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/95 backdrop-blur-sm hover:bg-white/20"
              >
                신고
              </button>
            ) : null}
            {isReadOnly ? (
              <button
                type="button"
                onClick={onBack}
                className="hidden rounded-full border border-white/50 bg-white/15 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm hover:bg-white/25 sm:inline-flex"
              >
                ← 내 CatTower
              </button>
            ) : null}
            <div className="rounded-full border border-white/35 bg-white/20 px-3 py-1.5 text-xs font-bold text-white shadow-sm backdrop-blur-md">
              {resolvingOwner ? "확인 중…" : isReadOnly ? "👀 둘러보기" : "🏡 내 공간"}
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-3 lg:grid-cols-[minmax(200px,240px)_1fr_minmax(168px,200px)]">
        <div className="order-2 lg:order-1">
          <CatTowerProfilePanel
          nickname={nickname}
          catName={catName}
          growth={growth}
          isPublic={isPublic}
          galleryCount={galleryCount}
          loading={loading}
          showParticipatingEvents={!isReadOnly}
          guestView={isReadOnly}
          refreshToken={refreshToken}
        />
        </div>

        <div className="order-1 flex flex-col gap-2 lg:order-2">
          <CatTowerMobileTabs
            activePanel={centerPanel}
            onPanelChange={setCenterPanel}
            disabled={busy}
            guestView={isReadOnly}
          />
          <CatTowerCenterPanel
          panel={centerPanel}
          growthStage={growth.stage}
          activityCount={activityCount}
          equipped={equipped}
          roomBackground={roomBg.background}
          roomDecorItems={canEdit ? roomDecor.items : []}
          catName={catName}
          isReadOnly={isReadOnly}
          roomActive={roomActive}
          activities={activities}
          galleries={galleries}
          galleryCount={galleryCount}
          roomOwnerId={roomOwnerId}
          myUserId={myUserId}
          isOwner={isOwner}
          pageReady={pageReady}
          refreshToken={refreshToken}
          onViewAllActivity={openActivityModal}
          onViewAllGallery={openGalleryModal}
        />
        </div>

        <div className="order-3 lg:order-3">
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
          onRoomDecorate={canEdit ? openRoomDecorate : undefined}
          onCatDecorate={onDecorate}
          onBack={onBack}
          onEvents={onEvents}
          onRefresh={onRefresh}
          activePanel={centerPanel}
          onPanelChange={setCenterPanel}
        />
        </div>
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
          selected={roomBg.background}
          saved={roomBg.savedBackground}
          isDirty={roomBg.isDirty}
          saving={roomBg.saving}
          error={roomBg.error}
          growthStage={growth.stage}
          decorUnlockContext={decorUnlockContext}
          placedDecorTypes={placedDecorTypes}
          roomDecorItems={roomDecor.items}
          equipped={equipped}
          activityCount={activityCount}
          onToggleDecor={roomDecor.toggleItem}
          onResetDecor={roomDecor.clearAll}
          onMoveDecorItem={roomDecor.moveItem}
          onRemoveDecorItem={roomDecor.removeItemById}
          onSelect={roomBg.selectBackground}
          onSave={handleSaveRoomBackground}
          onCatDecorate={onDecorate}
          onClose={() => setRoomDecorateOpen(false)}
        />
      ) : null}
    </div>
  );
}

export default memo(CatTowerDashboard);
