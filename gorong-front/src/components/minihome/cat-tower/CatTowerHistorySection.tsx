import { useEffect, useState } from "react";
import ActivityHistory from "../mini-home/ActivityHistory";
import GallerySection from "../mini-home/GallerySection";
import type { ActivityItem, GalleryItem } from "../../../types/minihome/minihome";
import type { GrowthState } from "../../../utils/minihome/growth/growth";
import {
  MOCK_GUESTBOOK,
  MOCK_REVIEWS,
  buildMockGrowthLogs,
} from "../../../data/minihome/catTowerDashboardMock";
import type { CatTowerPanelId } from "./CatTowerSideMenu";

type HistoryTab = "events" | "reviews" | "growth" | "guestbook";

type CatTowerHistorySectionProps = {
  activities: ActivityItem[];
  galleries: GalleryItem[];
  growth: GrowthState;
  activePanel: CatTowerPanelId;
  galleryCount: number;
};

const TABS: { id: HistoryTab; label: string; emoji: string }[] = [
  { id: "events", label: "행사 참여", emoji: "🎪" },
  { id: "reviews", label: "리뷰", emoji: "✍️" },
  { id: "growth", label: "성장 로그", emoji: "🌱" },
  { id: "guestbook", label: "방명록", emoji: "✉️" },
];

/** 아래 — 행사·리뷰·성장·방명록 히스토리 */
export default function CatTowerHistorySection({
  activities,
  galleries,
  growth,
  activePanel,
  galleryCount,
}: CatTowerHistorySectionProps) {
  const [tab, setTab] = useState<HistoryTab>("events");

  useEffect(() => {
    if (activePanel === "guestbook") setTab("guestbook");
    else if (activePanel === "activity") setTab("events");
    else if (activePanel === "gallery") setTab("events");
  }, [activePanel]);

  const growthLogs = buildMockGrowthLogs(growth.activityCount, growth.stageLabel);

  return (
    <section className="overflow-hidden rounded-2xl border-2 border-emerald-200/80 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-orange-50/50 px-4 py-2">
        <h2 className="text-xs font-extrabold text-emerald-900/80">📜 나의 히스토리</h2>
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${
                tab === t.id
                  ? "bg-orange-500 text-white shadow-sm"
                  : "bg-white/80 text-slate-600 hover:bg-orange-50"
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {tab === "events" ? (
          <div className="space-y-4">
            {activePanel === "gallery" ? (
              <div>
                <p className="mb-3 text-xs font-bold text-slate-700">갤러리 {galleryCount}개</p>
                <GallerySection
                  galleries={galleries}
                  limit={4}
                  variant="preview"
                  emptyMessage="등록된 갤러리가 없습니다."
                />
              </div>
            ) : null}
            <div>
              <p className="mb-2 text-xs font-bold text-slate-700">최근 활동</p>
              <ActivityHistory
                activities={activities}
                limit={8}
                variant="preview"
                emptyMessage="아직 활동 기록이 없어요. 행사에 참여해 보세요!"
              />
            </div>
          </div>
        ) : null}

        {tab === "reviews" ? (
          <ul className="space-y-3">
            {MOCK_REVIEWS.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-orange-100 bg-orange-50/30 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-slate-900">{r.eventTitle}</span>
                  <span className="text-[10px] text-amber-600">{"★".repeat(r.rating)}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{r.excerpt}</p>
                <p className="mt-1 text-[10px] text-slate-400">{r.date} · mock</p>
              </li>
            ))}
          </ul>
        ) : null}

        {tab === "growth" ? (
          <ul className="space-y-2">
            {growthLogs.map((log) => (
              <li
                key={log.id}
                className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-2.5"
              >
                <span className="text-lg">🌿</span>
                <div>
                  <p className="text-xs font-extrabold text-slate-800">{log.label}</p>
                  <p className="text-[11px] text-slate-600">{log.detail}</p>
                  <p className="text-[10px] text-slate-400">{log.date}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {tab === "guestbook" ? (
          <ul className="space-y-2">
            {MOCK_GUESTBOOK.map((g) => (
              <li
                key={g.id}
                className="rounded-xl border border-dashed border-emerald-200 bg-white px-3 py-2.5"
              >
                <p className="text-[10px] font-bold text-emerald-700">{g.author}</p>
                <p className="mt-0.5 text-xs text-slate-700">{g.message}</p>
                <p className="mt-1 text-[10px] text-slate-400">{g.date}</p>
              </li>
            ))}
            <p className="text-center text-[10px] text-slate-400">방명록 mock · 추후 연동 예정</p>
          </ul>
        ) : null}
      </div>
    </section>
  );
}
