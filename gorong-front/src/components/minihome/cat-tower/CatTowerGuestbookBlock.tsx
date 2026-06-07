import { memo, useState } from "react";
import { Loader2, Trash2, User } from "lucide-react";
import type { GuestbookEntry } from "../../../api/minihome/guestbookApi";
import { useInViewport } from "../../../hooks/useInViewport";
import LazyImage from "../../common/LazyImage";
import { useCatTowerGuestbook } from "../../../pages/minihome/hooks/useCatTowerGuestbook";
import CatTowerGuestbookSection from "./CatTowerGuestbookSection";
import CatTowerViewAllModal from "./CatTowerViewAllModal";

type Props = {
  catName: string;
  roomOwnerId: number | null | undefined;
  myUserId: number | null | undefined;
  isOwner: boolean;
  pageReady: boolean;
  refreshToken?: number;
  previewLimit?: number;
  embedded?: boolean;
};

function formatGuestbookDate(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("ko-KR");
  } catch {
    return iso;
  }
}

function GuestbookFullList({
  entries,
  loading,
  deletingId,
  onDelete,
  canDeleteEntry,
}: {
  entries: GuestbookEntry[];
  loading?: boolean;
  deletingId?: number | null;
  onDelete: (entry: GuestbookEntry) => void;
  canDeleteEntry: (entry: GuestbookEntry) => boolean;
}) {
  if (loading) {
    return (
      <div className="flex min-h-[120px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-rose-400" />
      </div>
    );
  }

  if (entries.length === 0) {
    return <p className="py-8 text-center text-xs text-slate-500">아직 방명록이 없어요.</p>;
  }

  return (
    <ul className="space-y-2">
      {entries.map((g) => (
        <li
          key={g.guestbookId}
          className="group flex gap-2 rounded-xl border border-dashed border-emerald-200 bg-white px-3 py-2.5"
        >
          {g.authorProfileImageUrl ? (
            <LazyImage
              src={g.authorProfileImageUrl}
              alt=""
              wrapperClassName="h-8 w-8 shrink-0 rounded-full"
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-400">
              <User className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] font-bold text-emerald-700">{g.authorNickname}</p>
              {canDeleteEntry(g) ? (
                <button
                  type="button"
                  onClick={() => onDelete(g)}
                  disabled={deletingId === g.guestbookId}
                  className="text-slate-400 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                  aria-label="삭제"
                >
                  {deletingId === g.guestbookId ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              ) : null}
            </div>
            <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-slate-700">{g.content}</p>
            <p className="mt-1 text-[10px] text-slate-400">{formatGuestbookDate(g.createAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** 방명록 API·입력 상태 — RoomStage(Rive)와 분리해 리렌더 격리 */
function CatTowerGuestbookBlock({
  catName,
  roomOwnerId,
  myUserId,
  isOwner,
  pageReady,
  refreshToken = 0,
  previewLimit = 3,
  embedded = false,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const { ref, inView } = useInViewport<HTMLElement>({ enabled: pageReady && !embedded });
  const guestbook = useCatTowerGuestbook({
    roomOwnerId,
    myUserId,
    isOwner,
    enabled: pageReady && (embedded || inView),
    refreshToken,
  });

  return (
    <div ref={embedded ? undefined : ref} id={embedded ? undefined : "cattower-guestbook"}>
      <CatTowerGuestbookSection
        catName={catName}
        entries={guestbook.entries}
        totalCount={guestbook.entries.length}
        previewLimit={previewLimit}
        onViewAll={() => setModalOpen(true)}
        loading={guestbook.loading}
        submitting={guestbook.submitting}
        deletingId={guestbook.deletingId}
        error={guestbook.error}
        canWrite={guestbook.canWrite}
        draft={guestbook.draft}
        isWriting={guestbook.isWriting}
        onDraftChange={guestbook.setDraft}
        onToggleWriting={guestbook.setIsWriting}
        onSubmit={() => void guestbook.handleSubmit()}
        onDelete={(entry) => void guestbook.handleDelete(entry)}
        canDeleteEntry={guestbook.canDeleteEntry}
        embedded={embedded}
      />

      <CatTowerViewAllModal
        open={modalOpen}
        title={`${catName}의 방명록`}
        subtitle={`총 ${guestbook.entries.length}개`}
        emoji="✉️"
        onClose={() => setModalOpen(false)}
      >
        <GuestbookFullList
          entries={guestbook.entries}
          loading={guestbook.loading}
          deletingId={guestbook.deletingId}
          onDelete={(entry) => void guestbook.handleDelete(entry)}
          canDeleteEntry={guestbook.canDeleteEntry}
        />
      </CatTowerViewAllModal>
    </div>
  );
}

export default memo(CatTowerGuestbookBlock);
