import { useMemo, useState } from "react";
import type { ActivityItem, GalleryItem } from "../../../types/minihome/minihome";
import type { GrowthState } from "../../../utils/minihome/growth/growth";
import type { EquipPreview } from "../../../utils/minihome/gocat/items";
import { useRoomBackground } from "../../../pages/minihome/hooks/useRoomBackground";
import { useNotification } from "../../../contexts/NotificationContext";
import CatTowerProfilePanel from "./CatTowerProfilePanel";
import CatTowerRoomStage from "./CatTowerRoomStage";
import CatTowerRoomBackgroundPanel from "./CatTowerRoomBackgroundPanel";
import CatTowerRecentActivityCards from "./CatTowerRecentActivityCards";
import CatTowerItemsPanel from "./CatTowerItemsPanel";
import CatTowerSideMenu, { type CatTowerPanelId } from "./CatTowerSideMenu";
import CatTowerHistorySection from "./CatTowerHistorySection";

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
  onDecorate: () => void;
  onBack: () => void;
  onEvents: () => void;
  onRefresh: () => void;
  onReport?: () => void;
};

/**
 * CatTower — 싸이월드 × 동물농장 감성 미니홈피
 */
export default function CatTowerDashboard({
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
  onDecorate,
  onBack,
  onEvents,
  onRefresh,
  onReport,
}: CatTowerDashboardProps) {
  const { toast } = useNotification();
  const [activePanel, setActivePanel] = useState<CatTowerPanelId>("room");
  const roomBg = useRoomBackground({
    appearanceState,
    useLocalStorage: canEdit,
  });

  const recentActivities = useMemo(() => activities.slice(0, 3), [activities]);

  const showDecoratePanel = canEdit && (activePanel === "room" || activePanel === "room-decorate");

  async function handleSaveRoomBackground() {
    const ok = await roomBg.saveBackground();
    if (ok) toast("방 배경이 저장되었습니다.", "success");
  }

  return (
    <div className="relative space-y-4">
      {/* floating decorative icons */}
      <span className="pointer-events-none absolute -left-1 top-24 hidden animate-float text-lg opacity-40 lg:block">
        🌸
      </span>
      <span
        className="pointer-events-none absolute -right-1 top-40 hidden animate-petal-sway text-base opacity-35 lg:block"
        style={{ animationDelay: "1.2s" }}
      >
        ✨
      </span>
      <span className="pointer-events-none absolute left-1/2 top-2 hidden -translate-x-1/2 text-xs opacity-25 lg:block">
        ♡ · ★ · ♡
      </span>

      <header className="relative overflow-hidden rounded-3xl border border-orange-200/60 bg-gradient-to-r from-orange-400 via-rose-400 to-emerald-400 shadow-[0_6px_28px_rgba(255,140,80,0.22)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.28),transparent_50%)]" />
        <span className="pointer-events-none absolute right-5 top-3 animate-sparkle text-sm opacity-50">
          ✨
        </span>
        <div className="relative flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/85">
              {isReadOnly ? "✨ Guest MiniHome" : "✨ My MiniHome"}
            </p>
            <h1 className="text-lg font-extrabold text-white drop-shadow-sm sm:text-xl">
              {loading ? "불러오는 중…" : `${catName}의 CatTower`}
            </h1>
            <p className="mt-0.5 text-[10px] font-medium text-white/75">
              {isReadOnly
                ? `${nickname}님의 공간을 둘러보고 있어요 🐾`
                : `${nickname}님의 감성 Go냥이 공간 🐾`}
            </p>
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
              {resolvingOwner
                ? "확인 중…"
                : isReadOnly
                  ? "👀 둘러보기"
                  : "🏡 내 공간"}
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(200px,240px)_1fr_minmax(160px,200px)]">
        <CatTowerProfilePanel
          nickname={nickname}
          catName={catName}
          growth={growth}
          isPublic={isPublic}
          galleryCount={galleryCount}
          loading={loading}
        />

        <div className="space-y-3">
          <CatTowerRoomStage
            growthStage={growth.stage}
            activityCount={activityCount}
            equipped={equipped}
            roomBackground={roomBg.background}
            catName={catName}
            interactive
            readOnly={isReadOnly}
          />

          <CatTowerRecentActivityCards activities={recentActivities} />

          {showDecoratePanel ? (
            <CatTowerRoomBackgroundPanel
              selected={roomBg.background}
              saved={roomBg.savedBackground}
              isDirty={roomBg.isDirty}
              saving={roomBg.saving}
              error={roomBg.error}
              onSelect={roomBg.selectBackground}
              onSave={handleSaveRoomBackground}
              onCatDecorate={onDecorate}
            />
          ) : null}

          {activePanel === "items" ? (
            <CatTowerItemsPanel
              equipped={equipped}
              onDecorate={onDecorate}
              canEdit={canEdit}
              readOnly={isReadOnly}
            />
          ) : null}
        </div>

        <CatTowerSideMenu
          activePanel={activePanel}
          onSelectPanel={setActivePanel}
          busy={busy}
          loading={loading}
          readOnly={isReadOnly}
          onCatDecorate={onDecorate}
          onBack={onBack}
          onEvents={onEvents}
          onRefresh={onRefresh}
        />
      </div>

      <CatTowerHistorySection
        activities={activities}
        galleries={galleries}
        growth={growth}
        activePanel={activePanel}
        galleryCount={galleryCount}
      />
    </div>
  );
}
