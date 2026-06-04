export type GuestbookEntry = {
  id: string;
  author: string;
  message: string;
  date: string;
};

export type VisitorStats = {
  today: number;
  total: number;
};

const VISITOR_TOTAL_PREFIX = "visitor_count_";
const VISITOR_TODAY_PREFIX = "visitor_today_";
const GUESTBOOK_PREFIX = "guestbooks_";
const GUESTBOOK_UNREAD_PREFIX = "guestbook_unread_";
const VISIT_SESSION_PREFIX = "cattower_visit_session_";

const EMPTY_VISITORS: VisitorStats = { today: 0, total: 0 };

/** localStorage에서 읽은 값이 유효한 양의 정수인지 확인 */
function isValidStoredCount(raw: string | null): boolean {
  if (raw == null) return false;
  const trimmed = raw.trim();
  if (trimmed === "") return false;
  const parsed = parseInt(trimmed, 10);
  return !Number.isNaN(parsed) && parsed >= 0;
}

/** parseInt + isNaN 방어 — 숫자가 아니면 fallback(기본 0) */
function parseStoredCount(raw: string | null, fallback = 0): number {
  if (raw == null) return fallback;
  const trimmed = raw.trim();
  if (trimmed === "") return fallback;
  const parsed = parseInt(trimmed, 10);
  if (Number.isNaN(parsed)) return fallback;
  return parsed >= 0 ? parsed : fallback;
}

/** 상태/UI에 넘기기 전 최종 NaN 방어 */
export function sanitizeVisitorStats(stats: VisitorStats): VisitorStats {
  const today = parseStoredCount(String(stats.today), 0);
  const total = parseStoredCount(String(stats.total), 0);
  return {
    today: Number.isNaN(today) ? 0 : today,
    total: Number.isNaN(total) ? 0 : total,
  };
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function writeNumber(key: string, value: number): void {
  if (typeof window === "undefined") return;
  const safe = Number.isNaN(value) || !Number.isFinite(value) ? 0 : Math.max(0, Math.floor(value));
  try {
    window.localStorage.setItem(key, String(safe));
  } catch {
    /* ignore quota */
  }
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function visitorKeys(hostUserId: number) {
  return {
    totalKey: `${VISITOR_TOTAL_PREFIX}${hostUserId}`,
    todayKey: `${VISITOR_TODAY_PREFIX}${hostUserId}_${todayKey()}`,
  };
}

/** localStorage에 방문자 키가 없거나 손상됐으면 0으로 초기화·복구 */
export function ensureVisitorStats(hostUserId: number): VisitorStats {
  const { totalKey, todayKey: todayKeyStorage } = visitorKeys(hostUserId);

  const rawTotal =
    typeof window !== "undefined"
      ? (() => {
          try {
            return window.localStorage.getItem(totalKey);
          } catch {
            return null;
          }
        })()
      : null;
  const rawToday =
    typeof window !== "undefined"
      ? (() => {
          try {
            return window.localStorage.getItem(todayKeyStorage);
          } catch {
            return null;
          }
        })()
      : null;

  let total = parseStoredCount(rawTotal, 0);
  let today = parseStoredCount(rawToday, 0);

  if (Number.isNaN(total)) total = 0;
  if (Number.isNaN(today)) today = 0;

  if (rawTotal == null || !isValidStoredCount(rawTotal)) {
    total = 0;
    writeNumber(totalKey, 0);
  }
  if (rawToday == null || !isValidStoredCount(rawToday)) {
    today = 0;
    writeNumber(todayKeyStorage, 0);
  }

  return sanitizeVisitorStats({ today, total });
}

/** API 대체: 방문자 통계 조회 (없으면 0부터 시작) */
export function fetchVisitorStats(hostUserId: number): VisitorStats {
  return ensureVisitorStats(hostUserId);
}

/** API 대체: 타인 방문 시 방문자 수 +1 (세션당 1회) */
export function recordVisit(hostUserId: number, isMyPage: boolean): VisitorStats {
  if (isMyPage) {
    return fetchVisitorStats(hostUserId);
  }

  const sessionKey = `${VISIT_SESSION_PREFIX}${hostUserId}`;
  if (typeof window !== "undefined") {
    try {
      if (sessionStorage.getItem(sessionKey) === "1") {
        return fetchVisitorStats(hostUserId);
      }
      sessionStorage.setItem(sessionKey, "1");
    } catch {
      /* continue without session guard */
    }
  }

  const { totalKey, todayKey: todayKeyStorage } = visitorKeys(hostUserId);
  const current = ensureVisitorStats(hostUserId);
  const next = sanitizeVisitorStats({
    total: current.total + 1,
    today: current.today + 1,
  });

  writeNumber(totalKey, next.total);
  writeNumber(todayKeyStorage, next.today);

  return next;
}

/** API 대체: 방명록 목록 조회 (없으면 빈 배열) */
export function fetchGuestbooks(hostUserId: number): GuestbookEntry[] {
  const key = `${GUESTBOOK_PREFIX}${hostUserId}`;
  const stored = readJson<GuestbookEntry[]>(key);
  if (stored && Array.isArray(stored)) {
    return stored;
  }
  return [];
}

/** API 대체: 방명록 전체 저장 */
export function saveGuestbooks(hostUserId: number, entries: GuestbookEntry[]): void {
  writeJson(`${GUESTBOOK_PREFIX}${hostUserId}`, entries);
}

/** API 대체: 방명록 작성 */
export function postGuestbook(
  hostUserId: number,
  entry: Pick<GuestbookEntry, "author" | "message" | "date">
): GuestbookEntry[] {
  const current = fetchGuestbooks(hostUserId);
  const newEntry: GuestbookEntry = {
    id: `g-${Date.now()}`,
    author: entry.author,
    message: entry.message,
    date: entry.date,
  };
  const next = [newEntry, ...current];
  saveGuestbooks(hostUserId, next);
  setGuestbookUnread(hostUserId, true);
  return next;
}

export function hasGuestbookUnread(hostUserId: number): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(`${GUESTBOOK_UNREAD_PREFIX}${hostUserId}`) === "1";
  } catch {
    return false;
  }
}

export function setGuestbookUnread(hostUserId: number, unread: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (unread) {
      window.localStorage.setItem(`${GUESTBOOK_UNREAD_PREFIX}${hostUserId}`, "1");
    } else {
      window.localStorage.removeItem(`${GUESTBOOK_UNREAD_PREFIX}${hostUserId}`);
    }
  } catch {
    /* ignore */
  }
}

/** 방 주인이 방명록 탭을 열었을 때 뱃지 제거 */
export function markGuestbookRead(hostUserId: number): void {
  setGuestbookUnread(hostUserId, false);
}

export { EMPTY_VISITORS };
