import { useEffect, useState } from "react";
import { Loader2, Trash2, User } from "lucide-react";
import ActivityHistory from "../mini-home/ActivityHistory";
import GallerySection from "../mini-home/GallerySection";
import type { ActivityItem, GalleryItem } from "../../../types/minihome/minihome";
import type { GrowthState } from "../../../utils/minihome/growth/growth";
import type { GuestbookEntry } from "../../../api/minihome/guestbookApi";
import {
  MOCK_REVIEWS,
  buildMockGrowthLogs,
} from "../../../data/minihome/catTowerDashboardMock";
import type { CatTowerPanelId } from "./catTowerPanelTypes";

type HistoryTab = "events" | "reviews" | "growth" | "guestbook";

type CatTowerHistorySectionProps = {
  activities: ActivityItem[];
  galleries: GalleryItem[];
  growth: GrowthState;
  activePanel: CatTowerPanelId;
  galleryCount: number;
  guestbookEntries: GuestbookEntry[];
  guestbookLoading?: boolean;
  onGuestbookDelete: (entry: GuestbookEntry) => void;
  guestbookCanDeleteEntry: (entry: GuestbookEntry) => boolean;
  guestbookDeletingId?: number | null;
};

const TABS: { id: HistoryTab; label: string; emoji: string }[] = [
  { id: "events", label: "행사 참여", emoji: "🎪" },
  { id: "reviews", label: "리뷰", emoji: "✍️" },
  { id: "growth", label: "성장 로그", emoji: "🌱" },
  { id: "guestbook", label: "방명록", emoji: "✉️" },
];

function formatGuestbookDate(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("ko-KR");
  } catch {
    return iso;
  }
}

/** 아래 — 행사·리뷰·성장·방명록 히스토리 */
export default function CatTowerHistorySection({
  activities,
  galleries,
  growth,
  activePanel,
  galleryCount,
  guestbookEntries,
  guestbookLoading,
  onGuestbookDelete,
  guestbookCanDeleteEntry,
  guestbookDeletingId,
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
          guestbookLoading ? (
            <div className="flex min-h-[100px] items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-rose-400" />
            </div>
          ) : guestbookEntries.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">아직 방명록이 없어요.</p>
          ) : (
            <ul className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
              {guestbookEntries.slice(0, 10).map((g) => (
                <li
                  key={g.guestbookId}
                  className="group flex gap-2 rounded-xl border border-dashed border-emerald-200 bg-white px-3 py-2.5"
                >
                  {g.authorProfileImageUrl ? (
                    <img
                      src={g.authorProfileImageUrl}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-400">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[10px] font-bold text-emerald-700">{g.authorNickname}</p>
                      {guestbookCanDeleteEntry(g) ? (
                        <button
                          type="button"
                          onClick={() => onGuestbookDelete(g)}
                          disabled={guestbookDeletingId === g.guestbookId}
                          className="text-slate-400 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                          aria-label="삭제"
                        >
                          {guestbookDeletingId === g.guestbookId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-700">{g.content}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{formatGuestbookDate(g.createAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>
    </section>
  );
}
