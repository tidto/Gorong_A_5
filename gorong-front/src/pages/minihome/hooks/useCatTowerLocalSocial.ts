import { useCallback, useEffect, useState } from "react";
import { useNotification } from "../../../contexts/NotificationContext";
import {
  fetchGuestbooks,
  fetchVisitorStats,
  hasGuestbookUnread,
  markGuestbookRead,
  postGuestbook,
  recordVisit,
  sanitizeVisitorStats,
  type GuestbookEntry,
  type VisitorStats,
} from "../../../utils/minihome/cat-tower/catTowerLocalApi";

type Options = {
  hostUserId: number | null | undefined;
  isMyPage: boolean;
  visitorDisplayName: string;
};

export function useCatTowerLocalSocial({
  hostUserId,
  isMyPage,
  visitorDisplayName,
}: Options) {
  const { toast } = useNotification();
  const [visitors, setVisitors] = useState<VisitorStats>({ today: 0, total: 0 });
  const [guestbooks, setGuestbooks] = useState<GuestbookEntry[]>([]);
  const [hasNewGuestbook, setHasNewGuestbook] = useState(false);
  const [isCheered, setIsCheered] = useState(false);
  const [isWritingGuestbook, setIsWritingGuestbook] = useState(false);
  const [guestbookDraft, setGuestbookDraft] = useState("");

  useEffect(() => {
    if (hostUserId == null) return;

    if (isMyPage) {
      setVisitors(sanitizeVisitorStats(fetchVisitorStats(hostUserId)));
      setGuestbooks(fetchGuestbooks(hostUserId));
      setHasNewGuestbook(hasGuestbookUnread(hostUserId));
      return;
    }

    setVisitors(sanitizeVisitorStats(recordVisit(hostUserId, false)));
    setGuestbooks(fetchGuestbooks(hostUserId));
  }, [hostUserId, isMyPage]);

  const handleSelectPanel = useCallback(
    (panelId: string, onSelect: (id: string) => void) => {
      if (isMyPage && panelId === "guestbook" && hostUserId != null) {
        markGuestbookRead(hostUserId);
        setHasNewGuestbook(false);
      }
      onSelect(panelId);
    },
    [hostUserId, isMyPage]
  );

  const handleSubmitGuestbook = useCallback(() => {
    const message = guestbookDraft.trim();
    if (!message || hostUserId == null) return;

    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;

    const next = postGuestbook(hostUserId, {
      author: visitorDisplayName,
      message,
      date,
    });

    setGuestbooks(next);
    setGuestbookDraft("");
    setIsWritingGuestbook(false);
    toast("💌 새로운 방명록이 등록되었습니다!", "info");
  }, [guestbookDraft, hostUserId, visitorDisplayName, toast]);

  return {
    visitors,
    guestbooks,
    hasNewGuestbook,
    isCheered,
    setIsCheered,
    isWritingGuestbook,
    setIsWritingGuestbook,
    guestbookDraft,
    setGuestbookDraft,
    handleSelectPanel,
    handleSubmitGuestbook,
  };
}
