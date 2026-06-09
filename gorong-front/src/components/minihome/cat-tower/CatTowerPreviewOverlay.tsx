import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, X } from "lucide-react";
import { getMiniHomePage } from "../../../api/minihome/miniHomeApi";
import type { MiniHomePage } from "../../../types/minihome/minihome";
import { computeGrowthState } from "../../../utils/minihome/growth/growth";
import { enrichEquipItems, normalizeEquipPreview } from "../../../utils/minihome/gocat/items";
import { ownerEquipPreviewFromPage } from "../../../utils/minihome/gocat/gocatEquippedStorage";
import { mapMiniHomeApiError } from "../../../utils/minihome/core/minihomeApiError";
import { parseRoomBackgroundFromAppearance } from "../../../utils/minihome/cat-tower/catTowerRoomBackground";
import GrowthStageBadge from "../growth/GrowthStageBadge";
import CatTowerPreviewStage from "./CatTowerPreviewStage";
import CatTowerRecentActivityCards from "./CatTowerRecentActivityCards";

type CatTowerPreviewOverlayProps = {
  userId: number;
  onClose: () => void;
  onViewDetail: (userId: number) => void;
};

export default function CatTowerPreviewOverlay({
  userId,
  onClose,
  onViewDetail,
}: CatTowerPreviewOverlayProps) {
  const [page, setPage] = useState<MiniHomePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setPage(null);

    getMiniHomePage(userId)
      .then((data) => {
        if (cancelled) return;
        setPage({
          ...data,
          activeEquips: enrichEquipItems(data.activeEquips ?? []),
        });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setErr(mapMiniHomeApiError(e, "캣타워를 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const cat = page?.miniHome?.cat ?? null;
  const catName = cat?.catName ?? "고냥이";
  const nickname = page?.ownerNickname ?? "사용자";
  const growth = useMemo(() => (page ? computeGrowthState(page) : null), [page]);
  const equipped = useMemo(
    () =>
      normalizeEquipPreview(
        ownerEquipPreviewFromPage(
          page?.activeEquips,
          cat?.appearanceState,
          growth?.stage ?? "BASIC"
        )
      ),
    [page?.activeEquips, cat?.appearanceState, growth?.stage]
  );
  const roomBackground =
    parseRoomBackgroundFromAppearance(cat?.appearanceState) ?? "BASIC_ROOM";
  const recentActivities = useMemo(
    () => (page?.activities ?? []).slice(0, 2),
    [page?.activities]
  );
  const activityCount = page?.stats?.activityCount ?? growth?.activityCount ?? 0;

  return (
    <AnimatePresence>
      <motion.div
        key="cattower-preview-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[1400] flex items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-4"
        onClick={onClose}
        role="presentation"
      >
        <motion.div
          key="cattower-preview-panel"
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 32 }}
          transition={{ type: "spring", stiffness: 340, damping: 32 }}
          className="flex max-h-[min(78vh,720px)] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-orange-200/70 bg-gradient-to-b from-[#fffaf5] via-white to-[#f0faf2] shadow-[0_-8px_40px_rgba(15,23,42,0.18)] sm:max-h-[min(82vh,760px)] sm:rounded-3xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cattower-preview-title"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-orange-100/80 bg-gradient-to-r from-orange-400 via-rose-400 to-emerald-400 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/85">
                👀 CatTower 미리보기
              </p>
              <h2
                id="cattower-preview-title"
                className="truncate text-base font-extrabold text-white sm:text-lg"
              >
                {loading ? "불러오는 중…" : `${catName}의 CatTower`}
              </h2>
              <p className="truncate text-[10px] font-medium text-white/75">
                {loading ? "잠시만 기다려 주세요" : `${nickname}님의 공간을 살짝 구경해요 🐾`}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {loading ? (
              <div className="flex flex-1 items-center justify-center px-4">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              </div>
            ) : err ? (
              <div className="flex-1 overflow-y-auto px-4 py-3">
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-8 text-center">
                  <p className="text-3xl">⚠️</p>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-red-700">{err}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="shrink-0 space-y-2 px-4 pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {growth ? (
                      <GrowthStageBadge
                        stage={growth.stage}
                        activityCount={growth.activityCount}
                        compact
                        glow
                      />
                    ) : null}
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                      활동 {activityCount}회
                    </span>
                    <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-bold text-orange-700">
                      갤러리 {page?.stats?.galleryCount ?? page?.galleries?.length ?? 0}개
                    </span>
                  </div>

                  <CatTowerPreviewStage
                    growthStage={growth?.stage ?? "BASIC"}
                    activityCount={activityCount}
                    equipped={equipped}
                    roomBackground={roomBackground}
                    catName={catName}
                  />
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 pt-2">
                  <CatTowerRecentActivityCards activities={recentActivities} />
                </div>
              </>
            )}
          </div>

          <div className="flex shrink-0 gap-2 border-t border-orange-100/80 bg-white/80 px-4 py-3 backdrop-blur-sm">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              닫기
            </button>
            <button
              type="button"
              disabled={loading || Boolean(err)}
              onClick={() => onViewDetail(userId)}
              className="flex flex-[1.4] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ExternalLink className="h-4 w-4" />
              자세히 보기
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
