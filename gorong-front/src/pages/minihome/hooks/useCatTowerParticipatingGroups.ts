import { useCallback, useEffect, useState } from "react";
import { fetchJoinedGroups, type JoinedGroup } from "../../../hooks/useChatRoom";
import { sortGroupsByMeetingDate } from "../../../utils/group/groupMeetingDate";
import { MINIHOME_UNLOCKS_SYNC_EVENT } from "../../../utils/minihome/core/minihomeUnlocksSync";

export function useCatTowerParticipatingGroups(enabled: boolean, refreshToken = 0) {
  const [groups, setGroups] = useState<JoinedGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) {
      setGroups([]);
      return;
    }
    setLoading(true);
    try {
      const joined = await fetchJoinedGroups();
      setGroups(sortGroupsByMeetingDate(joined));
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  useEffect(() => {
    if (!enabled) return;
    const onSync = () => void load();
    window.addEventListener(MINIHOME_UNLOCKS_SYNC_EVENT, onSync);
    return () => window.removeEventListener(MINIHOME_UNLOCKS_SYNC_EVENT, onSync);
  }, [enabled, load]);

  return { groups, loading, reload: load };
}
