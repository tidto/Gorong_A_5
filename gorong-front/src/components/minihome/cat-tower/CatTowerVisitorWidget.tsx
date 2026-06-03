import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { MOCK_TODAY_VISITORS, MOCK_VISITOR_COUNT } from "../../../data/minihome/catTowerDashboardMock";

function AnimatedCount({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  const displayRef = useRef(0);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    const from = displayRef.current;
    const to = value;
    if (from === to) return;

    const durationMs = 700;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - startedAt) / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return <span>{display}</span>;
}

/** 방문자 수 mock — 카운트업 애니메이션 */
export default function CatTowerVisitorWidget() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.35 }}
      className="overflow-hidden rounded-2xl border border-emerald-100/90 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50 shadow-sm"
    >
      <div className="flex items-center gap-2 border-b border-emerald-100/70 bg-emerald-500/90 px-3 py-1.5">
        <Users className="h-3 w-3 text-white/90" />
        <p className="text-[10px] font-extrabold text-white">방문자 현황</p>
      </div>
      <div className="grid grid-cols-2 divide-x divide-emerald-100/70 px-1 py-2.5">
        <div className="text-center">
          <p className="text-lg font-extrabold tabular-nums text-emerald-700">
            <AnimatedCount value={MOCK_TODAY_VISITORS} />
          </p>
          <p className="text-[9px] font-bold text-emerald-800/55">오늘</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-extrabold tabular-nums text-teal-700">
            <AnimatedCount value={MOCK_VISITOR_COUNT} />
          </p>
          <p className="text-[9px] font-bold text-emerald-800/55">누적</p>
        </div>
      </div>
      <p className="border-t border-emerald-50 px-2 py-1 text-center text-[8px] text-emerald-700/45">
        mock · 추후 연동 예정
      </p>
    </motion.div>
  );
}
