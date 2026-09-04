import { useCallback, useEffect, useState } from "react";
import { fetchMyEventParticipations } from "../../../api/eventParticipationApi";
import { fetchRecruitingJoinedGroups, type JoinedGroup } from "../../../hooks/useChatRoom";

export type ParticipatingEventItem = {
  key: string;
  kind: "group" | "solo";
  title: string;
  eventName?: string;
  date?: string;
  time?: string;
  location?: string;
  status?: string;
  currentCapacity?: number;
  maxCapacity?: number;
  groupId?: number;
  eventContentId?: string;
};

function sortByDate(items: ParticipatingEventItem[]): ParticipatingEventItem[] {
  return [...items].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
}

function groupToItem(group: JoinedGroup): ParticipatingEventItem {
  return {
    key: `group-${group.id}`,
    kind: "group",
    title: group.title,
    eventName: group.event,
    date: group.meetingDate,
    time: group.meetingTime,
    location: group.location,
    status: group.status,
    currentCapacity: group.currentCapacity,
    maxCapacity: group.maxCapacity,
    groupId: group.id,
  };
}

function buildItems(groups: JoinedGroup[], soloParticipations: Awaited<ReturnType<typeof fetchMyEventParticipations>>): ParticipatingEventItem[] {
  const groupItems = groups.map(groupToItem);

  const soloItems: ParticipatingEventItem[] = soloParticipations
    .filter((p) => p.participationType === "SOLO")
    .map((p) => ({
      key: `solo-${p.id}`,
      kind: "solo" as const,
      title: p.eventTitle || "혼자 가기 행사",
      eventName: p.eventTitle || undefined,
      date: p.visitDate ?? undefined,
      eventContentId: p.eventContentId,
    }));

  return sortByDate([...groupItems, ...soloItems]);
}

export function useCatTowerParticipatingEvents(enabled: boolean, refreshToken = 0) {
  const [items, setItems] = useState<ParticipatingEventItem[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const [groups, participations] = await Promise.all([
        fetchRecruitingJoinedGroups(),
        fetchMyEventParticipations().catch(() => [] as Awaited<ReturnType<typeof fetchMyEventParticipations>>),
      ]);
      setItems(buildItems(groups, participations));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (!cancelled) void reload();
    };

    if (typeof requestIdleCallback !== "undefined") {
      const idleId = requestIdleCallback(run, { timeout: 2500 });
      return () => {
        cancelled = true;
        cancelIdleCallback(idleId);
      };
    }

    const timerId = window.setTimeout(run, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [reload, refreshToken]);

  return { items, loading, reload };
}
