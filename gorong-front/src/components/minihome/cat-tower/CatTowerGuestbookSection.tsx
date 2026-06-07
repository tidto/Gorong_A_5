import { motion } from "framer-motion";
import { Loader2, MessageCircle, Send, Trash2, User } from "lucide-react";
import LazyImage from "../../common/LazyImage";
import type { GuestbookEntry } from "../../../api/minihome/guestbookApi";

type CatTowerGuestbookSectionProps = {
  catName: string;
  entries: GuestbookEntry[];
  totalCount?: number;
  previewLimit?: number;
  onViewAll?: () => void;
  loading?: boolean;
  submitting?: boolean;
  deletingId?: number | null;
  error?: string | null;
  canWrite?: boolean;
  draft: string;
  isWriting: boolean;
  onDraftChange: (value: string) => void;
  onToggleWriting: (open: boolean) => void;
  onSubmit: () => void;
  onDelete: (entry: GuestbookEntry) => void;
  canDeleteEntry: (entry: GuestbookEntry) => boolean;
  embedded?: boolean;
};

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
}

function ProfileAvatar({
  nickname,
  imageUrl,
}: {
  nickname: string;
  imageUrl: string | null;
}) {
  if (imageUrl) {
    return (
      <LazyImage
        src={imageUrl}
        alt={`${nickname} 프로필`}
        wrapperClassName="h-9 w-9 shrink-0 rounded-full border-2 border-white shadow-sm ring-1 ring-rose-100"
        className="h-9 w-9 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-rose-100 to-orange-100 text-rose-500 shadow-sm ring-1 ring-rose-100">
      <User className="h-4 w-4" />
    </div>
  );
}

function GuestbookBubble({
  entry,
  canDelete,
  deleting,
  onDelete,
}: {
  entry: GuestbookEntry;
  canDelete: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex gap-2.5"
    >
      <ProfileAvatar nickname={entry.authorNickname} imageUrl={entry.authorProfileImageUrl} />
      <div className="min-w-0 flex-1">
        <div className="relative rounded-2xl rounded-tl-md border border-rose-100/90 bg-gradient-to-br from-white via-rose-50/40 to-orange-50/30 px-3.5 py-2.5 shadow-[0_2px_12px_rgba(244,114,182,0.08)]">
          <div className="pointer-events-none absolute -left-1.5 top-3 h-3 w-3 rotate-45 border-b border-l border-rose-100/90 bg-rose-50/80" />
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-extrabold text-rose-800/90">
                {entry.authorNickname}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-700">
                {entry.content}
              </p>
            </div>
            {canDelete ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="shrink-0 rounded-lg p-1 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 disabled:opacity-50"
                aria-label="방명록 삭제"
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            ) : null}
          </div>
          <p className="mt-2 text-[10px] font-medium text-slate-400">{formatDate(entry.createAt)}</p>
        </div>
      </div>
    </motion.li>
  );
}

/** 캣타워 하단 — 방명록 (미니홈피 감성 말풍선 카드) */
export default function CatTowerGuestbookSection({
  catName,
  entries,
  totalCount,
  previewLimit = 3,
  onViewAll,
  loading,
  submitting,
  deletingId,
  error,
  canWrite,
  draft,
  isWriting,
  onDraftChange,
  onToggleWriting,
  onSubmit,
  onDelete,
  canDeleteEntry,
  embedded = false,
}: CatTowerGuestbookSectionProps) {
  const total = totalCount ?? entries.length;
  const previewEntries = entries.slice(0, previewLimit);
  const hasMore = total > previewLimit;

  return (
    <section
      id={embedded ? undefined : "cattower-guestbook"}
      className={
        embedded
          ? ""
          : "overflow-hidden rounded-2xl border border-rose-200/70 bg-gradient-to-b from-rose-50/50 via-white to-orange-50/30 shadow-[0_2px_16px_rgba(244,114,182,0.08)]"
      }
    >
      {!embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-100/80 bg-gradient-to-r from-rose-400/90 via-pink-400/90 to-orange-300/90 px-4 py-2.5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/85">
              ✉️ Guestbook
            </p>
            <h2 className="text-sm font-extrabold text-white">{catName}의 방명록</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-white/35 bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
              💌 {total}개
            </span>
            {hasMore && onViewAll ? (
              <button
                type="button"
                onClick={onViewAll}
                className="rounded-full border border-white/40 bg-white/15 px-2.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm transition hover:bg-white/25"
              >
                전체보기 →
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mb-3 flex items-center justify-end gap-2">
          <span className="rounded-full bg-rose-100/80 px-2.5 py-0.5 text-[9px] font-bold text-rose-700/80">
            💌 {total}개
          </span>
          {hasMore && onViewAll ? (
            <button
              type="button"
              onClick={onViewAll}
              className="rounded-full border border-rose-200 bg-white px-2.5 py-0.5 text-[9px] font-bold text-rose-700 transition hover:bg-rose-50"
            >
              전체보기 →
            </button>
          ) : null}
        </div>
      )}

      <div className={embedded ? "space-y-3" : "space-y-3 p-3.5 sm:p-4"}>
        {canWrite ? (
          <div className="rounded-2xl border border-dashed border-rose-200/80 bg-white/70 p-3">
            {!isWriting ? (
              <button
                type="button"
                onClick={() => onToggleWriting(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:brightness-105"
              >
                <MessageCircle className="h-4 w-4" />
                따뜻한 한마디 남기기
              </button>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={draft}
                  onChange={(e) => onDraftChange(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="오늘 이 캣타워 구경하고 갑니다 🐾"
                  className="w-full resize-none rounded-xl border border-rose-100 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none ring-rose-200 transition focus:ring-2"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400">{draft.length}/500</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onToggleWriting(false);
                        onDraftChange("");
                      }}
                      className="rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-100"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={onSubmit}
                      disabled={submitting || !draft.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-[11px] font-extrabold text-white disabled:opacity-50"
                    >
                      {submitting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      남기기
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex min-h-[120px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-rose-400" />
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-rose-200/70 bg-white/60 px-4 py-8 text-center">
            <p className="text-2xl opacity-50">💌</p>
            <p className="mt-2 text-xs font-bold text-rose-900/70">아직 방명록이 없어요</p>
            <p className="mt-1 text-[11px] text-slate-500">
              {canWrite
                ? "첫 번째 방문자가 되어 한마디 남겨보세요!"
                : "친구들의 따뜻한 한마디가 이곳에 모일 거예요."}
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {previewEntries.map((entry) => (
              <GuestbookBubble
                key={entry.guestbookId}
                entry={entry}
                canDelete={canDeleteEntry(entry)}
                deleting={deletingId === entry.guestbookId}
                onDelete={() => onDelete(entry)}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
