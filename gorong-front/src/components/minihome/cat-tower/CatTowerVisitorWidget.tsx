import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Users } from "lucide-react";

type CatTowerVisitorWidgetProps = {
  todayCount: number;
  totalCount: number;
  loading?: boolean;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function AnimatedCount({ value }: { value: number }) {
  const reducedMotion = useRef(prefersReducedMotion());
  const [display, setDisplay] = useState(reducedMotion.current ? value : 0);
  const rafRef = useRef<number | null>(null);
  const displayRef = useRef(0);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    if (reducedMotion.current) {
      setDisplay(value);
      return;
    }

    const from = displayRef.current;
    const to = value;
    if (from === to) return;

    const durationMs = 500;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - startedAt) / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3);
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

/** 방문자 현황 — 오늘(고유 방문자) / 누적(전체 방문 기록) */
export default function CatTowerVisitorWidget({
  todayCount,
  totalCount,
  loading,
}: CatTowerVisitorWidgetProps) {
  const today = loading ? 0 : todayCount;
  const total = loading ? 0 : totalCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.35 }}
      className="sidebar-card w-full max-w-full border-emerald-100/90 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50"
      style={{ width: "100%" }}
    >
      <div className="sidebar-card-header justify-center border-emerald-100/70 bg-gradient-to-r from-emerald-500 to-teal-500">
        <Users className="h-3.5 w-3.5 shrink-0 text-white/95" />
        <p>방문자 현황</p>
      </div>
      <div className="sidebar-card-body !space-y-0 grid grid-cols-2 divide-x divide-emerald-100/70 !p-0 py-3">
        <div className="text-center">
          <p className="text-xl font-extrabold tabular-nums text-emerald-700">
            <AnimatedCount value={today} />
          </p>
          <p className="mt-0.5 text-xs font-semibold text-emerald-800/60">오늘</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-extrabold tabular-nums text-teal-700">
            <AnimatedCount value={total} />
          </p>
          <p className="mt-0.5 text-xs font-semibold text-emerald-800/60">누적</p>
        </div>
      </div>
    </motion.div>
  );
}
