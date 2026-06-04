import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchVisitorStats,
  recordCatTowerVisit,
  type VisitorStats,
} from "../../../api/minihome/visitorApi";

type Options = {
  roomOwnerId: number | null | undefined;
  myUserId: number | null | undefined;
  isOwner: boolean;
  /** 페이지 데이터 로드 완료 후 방문 기록 */
  pageReady: boolean;
  refreshToken?: number;
};

const EMPTY_STATS: VisitorStats = { todayCount: 0, totalCount: 0 };

function sessionVisitKey(roomOwnerId: number) {
  return `cattower_visit_recorded_${roomOwnerId}`;
}

export function useCatTowerVisitors({
  roomOwnerId,
  myUserId,
  isOwner,
  pageReady,
  refreshToken = 0,
}: Options) {
  const [stats, setStats] = useState<VisitorStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(false);
  const recordAttemptedRef = useRef<number | null>(null);

  const loadStats = useCallback(async () => {
    if (roomOwnerId == null) return;
    setLoading(true);
    try {
      const data = await fetchVisitorStats(roomOwnerId);
      setStats(data);
    } catch {
      setStats(EMPTY_STATS);
    } finally {
      setLoading(false);
    }
  }, [roomOwnerId]);

  useEffect(() => {
    if (!pageReady || roomOwnerId == null) return;
    void loadStats();
  }, [pageReady, roomOwnerId, loadStats, refreshToken]);

  useEffect(() => {
    if (!pageReady || roomOwnerId == null || myUserId == null) return;
    if (isOwner || myUserId === roomOwnerId) return;
    if (recordAttemptedRef.current === roomOwnerId) return;

    if (typeof window !== "undefined") {
      try {
        if (sessionStorage.getItem(sessionVisitKey(roomOwnerId)) === "1") {
          recordAttemptedRef.current = roomOwnerId;
          return;
        }
      } catch {
        /* ignore */
      }
    }

    recordAttemptedRef.current = roomOwnerId;

    void (async () => {
      try {
        const data = await recordCatTowerVisit(roomOwnerId);
        setStats(data);
        try {
          sessionStorage.setItem(sessionVisitKey(roomOwnerId), "1");
        } catch {
          /* ignore */
        }
      } catch {
        recordAttemptedRef.current = null;
        void loadStats();
      }
    })();
  }, [pageReady, roomOwnerId, myUserId, isOwner, loadStats]);

  return { stats, loading, loadStats };
}
