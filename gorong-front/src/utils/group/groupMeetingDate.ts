/** 그룹 모임 날짜가 오늘 이전인지 (GroupListPage / Chat 과 동일) */
export function isGroupMeetingDatePassed(dateStr?: string): boolean {
  if (!dateStr) return false;
  try {
    const meeting = new Date(dateStr);
    meeting.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return meeting < today;
  } catch {
    return false;
  }
}

/** 만남 날짜 오름차순 (가까운 일정 우선, 날짜 없음은 맨 뒤) */
export function sortGroupsByMeetingDate<T extends { meetingDate?: string; id?: number }>(
  groups: T[]
): T[] {
  return [...groups].sort((a, b) => {
    if (!a.meetingDate && !b.meetingDate) return (b.id ?? 0) - (a.id ?? 0);
    if (!a.meetingDate) return 1;
    if (!b.meetingDate) return -1;
    const diff =
      new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime();
    return diff !== 0 ? diff : (b.id ?? 0) - (a.id ?? 0);
  });
}

export function formatMeetingCountdown(meetingDate?: string): string | null {
  if (!meetingDate) return null;
  try {
    const meeting = new Date(meetingDate);
    meeting.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil(
      (meeting.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff < 0) return "종료";
    if (diff === 0) return "오늘";
    return `D-${diff}`;
  } catch {
    return null;
  }
}

export function isGroupClosed(
  group: {
    status?: string;
    currentCapacity?: number;
    maxCapacity?: number;
    meetingDate?: string;
  }
): boolean {
  const cur = group.currentCapacity ?? 0;
  const max = group.maxCapacity ?? 0;
  const isFull = max > 0 && cur >= max;
  return (
    group.status === "CLOSED" ||
    isFull ||
    isGroupMeetingDatePassed(group.meetingDate)
  );
}
