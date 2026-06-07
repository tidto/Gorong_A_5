import { useCallback, useEffect, useState } from "react";
import { useNotification } from "../../../contexts/NotificationContext";
import {
  createGuestbook,
  deleteGuestbook,
  fetchGuestbooks,
  type GuestbookEntry,
} from "../../../api/minihome/guestbookApi";
import { mapMiniHomeApiError } from "../../../utils/minihome/core/minihomeApiError";

type Options = {
  roomOwnerId: number | null | undefined;
  myUserId: number | null | undefined;
  isOwner: boolean;
  /** false면 API 미호출 (뷰포트 진입 전) */
  enabled?: boolean;
  /** 새로고침 시 증가 */
  refreshToken?: number;
};

export function useCatTowerGuestbook({
  roomOwnerId,
  myUserId,
  isOwner,
  enabled = true,
  refreshToken = 0,
}: Options) {
  const { toast, confirm } = useNotification();
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isWriting, setIsWriting] = useState(false);

  const canWrite =
    !isOwner &&
    roomOwnerId != null &&
    myUserId != null &&
    myUserId !== roomOwnerId;

  const loadGuestbooks = useCallback(async () => {
    if (roomOwnerId == null) return;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchGuestbooks(roomOwnerId);
      setEntries(list);
    } catch (e: unknown) {
      setError(mapMiniHomeApiError(e, "방명록을 불러오지 못했습니다."));
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [roomOwnerId]);

  useEffect(() => {
    if (!enabled || roomOwnerId == null) return;

    let cancelled = false;
    const run = () => {
      if (!cancelled) void loadGuestbooks();
    };

    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(run, { timeout: 1800 });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    }

    const id = window.setTimeout(run, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [enabled, roomOwnerId, loadGuestbooks, refreshToken]);

  const handleSubmit = useCallback(async () => {
    const content = draft.trim();
    if (!content || roomOwnerId == null || !canWrite) return;

    setSubmitting(true);
    setError(null);
    try {
      const created = await createGuestbook(roomOwnerId, content);
      setEntries((prev) => [created, ...prev]);
      setDraft("");
      setIsWriting(false);
      toast("💌 방명록이 등록되었습니다!", "success");
    } catch (e: unknown) {
      const message = mapMiniHomeApiError(e, "방명록 작성에 실패했습니다.");
      setError(message);
      toast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }, [canWrite, draft, roomOwnerId, toast]);

  const handleDelete = useCallback(
    async (entry: GuestbookEntry) => {
      if (myUserId == null) return;

      const isAuthor = myUserId === entry.authorUserId;
      const isRoomOwner = myUserId === entry.roomOwnerUserId;
      if (!isAuthor && !isRoomOwner) return;

      const ok = await confirm({
        message: "이 방명록을 삭제할까요?",
        confirmLabel: "삭제",
        cancelLabel: "취소",
        danger: true,
      });
      if (!ok) return;

      setDeletingId(entry.guestbookId);
      setError(null);
      try {
        await deleteGuestbook(entry.guestbookId);
        setEntries((prev) => prev.filter((e) => e.guestbookId !== entry.guestbookId));
        toast("방명록이 삭제되었습니다.", "info");
      } catch (e: unknown) {
        const message = mapMiniHomeApiError(e, "방명록 삭제에 실패했습니다.");
        setError(message);
        toast(message, "error");
      } finally {
        setDeletingId(null);
      }
    },
    [confirm, myUserId, toast]
  );

  const canDeleteEntry = useCallback(
    (entry: GuestbookEntry) => {
      if (myUserId == null) return false;
      return myUserId === entry.authorUserId || myUserId === entry.roomOwnerUserId;
    },
    [myUserId]
  );

  return {
    entries,
    loading,
    submitting,
    deletingId,
    error,
    draft,
    setDraft,
    isWriting,
    setIsWriting,
    canWrite,
    loadGuestbooks,
    handleSubmit,
    handleDelete,
    canDeleteEntry,
  };
}
