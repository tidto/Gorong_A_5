import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCatTowerPageTheme } from "../../../contexts/CatTowerRoomThemeContext";
import { useCatTowerParticipatingGroups } from "../../../pages/minihome/hooks/useCatTowerParticipatingGroups";
import {
  formatMeetingCountdown,
  isGroupClosed,
} from "../../../utils/group/groupMeetingDate";

type CatTowerParticipatingEventsProps = {
  enabled?: boolean;
  refreshToken?: number;
};

/**
 * 미니홈 왼쪽 프로필 아래 — 참여 중인 그룹(이벤트) 목록.
 * Chat 페이지 좌측 "참여중인 채팅방" + GroupList 카드 메타(만남 날짜·참여중 뱃지) 참고.
 */
export default function CatTowerParticipatingEvents({
  enabled = true,
  refreshToken = 0,
}: CatTowerParticipatingEventsProps) {
  const navigate = useNavigate();
  const theme = useCatTowerPageTheme();
  const { groups, loading } = useCatTowerParticipatingGroups(enabled, refreshToken);

  if (!enabled) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.35 }}
      className={`overflow-hidden rounded-2xl border shadow-sm ${theme.profileCardClass}`}
    >
      <div
        className={`border-b px-3 py-2 text-center text-[10px] font-extrabold tracking-wide text-white ${theme.profileHeaderClass}`}
      >
        🎪 참여 중인 이벤트
      </div>

      <div className="p-3">
        <p className={`mb-2 text-[9px] font-bold ${theme.profileLabelClass}`}>
          {loading ? "불러오는 중…" : `${groups.length}개 참여 중 · 만남 날짜 순`}
        </p>

        {loading ? (
          <div className="flex justify-center py-6">
            <span className="text-lg opacity-40">⏳</span>
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-orange-100 bg-orange-50/40 px-3 py-5 text-center">
            <p className="text-[10px] font-semibold leading-relaxed text-slate-500">
              참여 중인 이벤트가 없어요.
            </p>
            <button
              type="button"
              onClick={() => navigate("/group")}
              className="mt-2 text-[10px] font-extrabold text-orange-600 underline underline-offset-2"
            >
              모집게시판에서 참여하기
            </button>
          </div>
        ) : (
          <ul className="max-h-[220px] space-y-2 overflow-y-auto pr-0.5">
            {groups.map((group) => {
              const closed = isGroupClosed(group);
              const countdown = formatMeetingCountdown(group.meetingDate);

              return (
                <li key={group.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/groups/${group.id}`)}
                    className={`w-full rounded-xl border px-2.5 py-2 text-left transition hover:-translate-y-px hover:shadow-sm ${
                      closed
                        ? "border-slate-100 bg-slate-50/80 opacity-80"
                        : "border-orange-100/90 bg-white hover:border-orange-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p
                        className={`line-clamp-2 text-[11px] font-extrabold leading-snug ${
                          theme.isDark ? "text-indigo-50" : "text-slate-800"
                        }`}
                      >
                        {group.title}
                      </p>
                      <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[8px] font-extrabold text-emerald-700">
                        참여중
                      </span>
                    </div>

                    {group.event ? (
                      <p className="mt-1 truncate text-[9px] font-semibold text-slate-500">
                        🎟️ {group.event}
                      </p>
                    ) : null}

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {group.meetingDate ? (
                        <span className="text-[9px] font-bold text-slate-600">
                          📅 {group.meetingDate}
                          {group.meetingTime ? ` ${group.meetingTime}` : ""}
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold text-slate-400">
                          📅 날짜 미정
                        </span>
                      )}
                      {countdown ? (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[8px] font-extrabold ${
                            countdown === "종료"
                              ? "bg-slate-100 text-slate-500"
                              : countdown === "오늘"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {countdown}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold ${
                          closed
                            ? "bg-slate-100 text-slate-500"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {closed ? "마감" : "모집중"}
                      </span>
                      <span className="text-[8px] font-semibold text-slate-400">
                        {group.currentCapacity}/{group.maxCapacity}명
                      </span>
                      {group.location ? (
                        <span className="truncate text-[8px] text-slate-400">
                          📍 {group.location}
                        </span>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          onClick={() => navigate("/group")}
          className="mt-2 w-full rounded-xl border border-dashed border-orange-200/80 bg-orange-50/30 py-2 text-[9px] font-extrabold text-orange-700 transition hover:bg-orange-50"
        >
          모집게시판 바로가기 →
        </button>
      </div>
    </motion.div>
  );
}
