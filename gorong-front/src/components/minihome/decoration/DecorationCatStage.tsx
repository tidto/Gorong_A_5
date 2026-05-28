import type { ReactNode } from "react";
import { motion } from "framer-motion";

type DecorationCatStageProps = {
  children: ReactNode;
  hint?: string;
};

/** 꾸미기 모달 — 캐릭터 히어로 스테이지 */
export default function DecorationCatStage({ children, hint = "냥이를 터치해 보세요" }: DecorationCatStageProps) {
  return (
    <div className="relative flex min-h-[300px] flex-1 flex-col items-center justify-center overflow-visible sm:min-h-[360px] lg:min-h-[400px]">
      {/* 하늘 그라데이션 */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sky-100/80 via-rose-50/50 to-emerald-50/70" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(255,255,255,0.7),transparent_55%)]" />

      {/* 발 밑 부드러운 하이라이트 (Rive 박스 밖, 노란 사각형 느낌 방지) */}
      <motion.div
        className="pointer-events-none absolute bottom-[8%] left-1/2 h-[18%] w-[42%] max-w-[200px] -translate-x-1/2 rounded-[100%] bg-white/35 blur-xl"
        animate={{ opacity: [0.5, 0.75, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />

      {/* 바닥 그림자 */}
      <div
        className="pointer-events-none absolute bottom-[10%] h-4 w-[36%] max-w-[180px] rounded-[100%] bg-amber-900/20 blur-md sm:h-5"
        aria-hidden
      />

      {/* 캐릭터 영역 */}
      <motion.div
        className="relative z-10 flex w-full max-w-[min(100%,560px)] items-end justify-center overflow-visible px-1 pb-2"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        {children}
      </motion.div>

      <motion.p
        className="pointer-events-none absolute bottom-3 z-20 text-center text-[11px] font-bold tracking-wide text-amber-900/45"
        animate={{ opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      >
        {hint} 🐾
      </motion.p>
    </div>
  );
}
