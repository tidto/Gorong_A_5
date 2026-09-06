import { memo, useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ActivityItem, GalleryItem } from "../../../types/minihome/minihome";
import type { GrowthState } from "../../../utils/minihome/growth/growth";
import type { EquipPreview } from "../../../utils/minihome/gocat/items";
import { useRoomBackground } from "../../../pages/minihome/hooks/useRoomBackground";
import { useRoomDecor } from "../../../pages/minihome/hooks/useRoomDecor";
import { useCatTowerPostHistory } from "../../../pages/minihome/hooks/useCatTowerPostHistory";
import { buildRoomDecorUnlockContext } from "../../../utils/minihome/cat-tower/catTowerRoomDecor";
import { useNotification } from "../../../contexts/NotificationContext";
import type { CatTowerCenterPanelId } from "./catTowerPanelTypes";
import CatTowerProfilePanel from "./CatTowerProfilePanel";
import CatTowerCenterPanel from "./CatTowerCenterPanel";
import CatTowerVisitorBlock from "./CatTowerVisitorBlock";
import CatTowerViewAllModal from "./CatTowerViewAllModal";
import CatTowerRoomDecorateModal from "./CatTowerRoomDecorateModal";
import CatTowerMobileTabs from "./CatTowerMobileTabs";
import GallerySection from "../mini-home/GallerySection";
import { CatTowerPostHistoryModalBody } from "./CatTowerPostHistoryList";
import {
  CATTOWER_BADGE,
  CATTOWER_BADGE_ACCENT,
  CATTOWER_PAGE_HEADER,
} from "../../../utils/minihome/cat-tower/catTowerTheme";

type CatTowerDashboardProps = {
  nickname: string;
  catName: string;
  growth: GrowthState;
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
  const navigate = useNavigate();
  const { toast } = useNotification();
  const [centerPanel, setCenterPanel] = useState<CatTowerCenterPanelId>("room");
  const [postHistoryModalOpen, setPostHistoryModalOpen] = useState(false);
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

  const roomDecor = useRoomDecor({
    unlockContext: decorUnlockContext,
    appearanceState,
    canEdit,
  });

  const postHistory = useCatTowerPostHistory({
    roomOwnerId,
    enabled: pageReady,
    refreshToken,
  });

  const placedDecorTypes = useMemo(
    () => new Set(roomDecor.items.map((item) => item.type)),
    [roomDecor.items]
  );

  const handleSaveRoomBackground = useCallback(async () => {
    const bgOk = await roomBg.saveBackground();
    const decorOk = canEdit ? await roomDecor.saveNow() : true;
    if (bgOk && decorOk) {
      toast("방 꾸미기가 저장되었습니다.", "success");
      setRoomDecorateOpen(false);
    } else if (bgOk) {
      toast("방 배경은 저장됐지만 가구 저장에 실패했습니다.", "info");
    }
  }, [roomBg, roomDecor, canEdit, toast]);

  const openPostHistoryModal = useCallback(() => {
    setPostHistoryModalOpen(true);
    postHistory.openModal();
  }, [postHistory]);

  const handlePostHistoryNavigate = useCallback(
    (linkPath: string) => {
      setPostHistoryModalOpen(false);
      navigate(linkPath);
    },
    [navigate]
  );
  const openGalleryModal = useCallback(() => setGalleryModalOpen(true), []);
  const openRoomDecorate = useCallback(() => setRoomDecorateOpen(true), []);

  const roomActive =
    centerPanel === "room" && !roomDecorateOpen && !catDecorateOpen;

  return (
    <div className="relative space-y-3">
      <header className={CATTOWER_PAGE_HEADER}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-primary-600">
              {isReadOnly ? "Guest MiniHome" : "My MiniHome"}
            </p>
            <h1 className="text-lg font-extrabold text-slate-900 sm:text-xl">
              {loading ? "불러오는 중…" : `${catName}의 CatTower`}
            </h1>
            {!loading && isReadOnly && nickname ? (
              <p className="mt-0.5 text-xs font-medium text-slate-500">{nickname}님의 미니홈</p>
            ) : null}
            {!loading ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className={CATTOWER_BADGE_ACCENT}>🌱 {growth.stageLabel}</span>
                <span className={CATTOWER_BADGE}>📋 활동 {activityCount}회</span>
                <span className={CATTOWER_BADGE}>📸 갤러리 {galleryCount}개</span>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isReadOnly && onReport ? (
              <button
                type="button"
                onClick={onReport}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                신고
              </button>
            ) : null}
            {isReadOnly ? (
              <button
                type="button"
                onClick={onBack}
                className="hidden rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700 hover:bg-primary-100 sm:inline-flex"
              >
                ← 내 CatTower
              </button>
            ) : null}
            <div className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700">
              {resolvingOwner ? "확인 중…" : isReadOnly ? "👀 둘러보기" : "🏡 내 공간"}
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)_240px]">
        <div className="sidebar-column-shell order-1 lg:order-1">
          <CatTowerProfilePanel
          nickname={nickname}
          catName={catName}
          growth={growth}
          galleryCount={galleryCount}
          loading={loading}
          showParticipatingEvents={!isReadOnly}
          guestView={isReadOnly}
          refreshToken={refreshToken}
        />
        </div>

        <div className="order-2 flex flex-col gap-2 lg:order-2">
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
          roomDecorItems={roomDecor.items}
          catName={catName}
          isReadOnly={isReadOnly}
          roomActive={roomActive}
          postHistoryItems={postHistory.previewItems}
          postHistoryTotalCount={postHistory.totalPostCount}
          postHistoryLoading={postHistory.previewLoading}
          postHistoryError={postHistory.previewError}
          galleries={galleries}
          galleryCount={galleryCount}
          roomOwnerId={roomOwnerId}
          myUserId={myUserId}
          isOwner={isOwner}
          pageReady={pageReady}
          refreshToken={refreshToken}
          onViewAllPostHistory={openPostHistoryModal}
          onViewAllGallery={openGalleryModal}
        />
        </div>

        <div className="sidebar-column-shell order-3 lg:order-3">
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
        open={postHistoryModalOpen}
        title="작성 글 히스토리"
        subtitle={`리뷰 ${postHistory.modalReviewCount} · 모집·참여 ${postHistory.modalRecruitmentCount}`}
        emoji="📝"
        onClose={() => setPostHistoryModalOpen(false)}
      >
        <CatTowerPostHistoryModalBody
          items={postHistory.modalItems}
          category={postHistory.modalCategory}
          page={postHistory.modalPage}
          totalPages={postHistory.modalTotalPages}
          totalElements={postHistory.modalTotalElements}
          reviewCount={postHistory.modalReviewCount}
          recruitmentCount={postHistory.modalRecruitmentCount}
          loading={postHistory.modalLoading}
          error={postHistory.modalError}
          onCategoryChange={postHistory.setModalCategory}
          onPageChange={postHistory.setModalPage}
          onItemNavigate={handlePostHistoryNavigate}
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
