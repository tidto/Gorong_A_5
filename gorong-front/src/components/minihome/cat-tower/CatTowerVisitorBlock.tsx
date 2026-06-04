import { memo } from "react";
import { useCatTowerVisitors } from "../../../pages/minihome/hooks/useCatTowerVisitors";
import CatTowerSideMenu from "./CatTowerSideMenu";

type Props = {
  busy?: boolean;
  loading?: boolean;
  readOnly?: boolean;
  canEdit?: boolean;
  roomOwnerId: number | null | undefined;
  myUserId: number | null | undefined;
  isOwner: boolean;
  pageReady: boolean;
  refreshToken?: number;
  onRoomDecorate?: () => void;
  onCatDecorate: () => void;
  onBack: () => void;
  onEvents: () => void;
  onRefresh: () => void;
  onScrollToGuestbook: () => void;
};

/** 방문자 통계 API — 사이드 메뉴에만 연결 */
function CatTowerVisitorBlock({
  busy,
  loading,
  readOnly,
  canEdit,
  roomOwnerId,
  myUserId,
  isOwner,
  pageReady,
  refreshToken = 0,
  onRoomDecorate,
  onCatDecorate,
  onBack,
  onEvents,
  onRefresh,
  onScrollToGuestbook,
}: Props) {
  const visitors = useCatTowerVisitors({
    roomOwnerId,
    myUserId,
    isOwner,
    pageReady,
    refreshToken,
  });

  return (
    <CatTowerSideMenu
      busy={busy}
      loading={loading}
      readOnly={readOnly}
      canEdit={canEdit}
      onRoomDecorate={onRoomDecorate}
      onCatDecorate={onCatDecorate}
      onBack={onBack}
      onEvents={onEvents}
      onRefresh={onRefresh}
      onScrollToGuestbook={onScrollToGuestbook}
      visitorTodayCount={visitors.stats.todayCount}
      visitorTotalCount={visitors.stats.totalCount}
      visitorStatsLoading={visitors.loading}
    />
  );
}

export default memo(CatTowerVisitorBlock);
