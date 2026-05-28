import { motion } from "framer-motion";

/** MASTER — 은은한 glow (고양이 뒤, 가리지 않음) */
export default function GrowthStageEffects() {
  return (
    <div
      className="pointer-events-none absolute bottom-[8%] left-1/2 z-0 h-[42%] w-[55%] max-w-[200px] -translate-x-1/2"
      aria-hidden
    >
      <div className="absolute inset-0 rounded-full bg-amber-200/20 blur-2xl" />
      {[
        { left: "0%", top: "20%", delay: 0 },
        { right: "0%", top: "30%", delay: 0.7 },
      ].map((p, i) => (
        <motion.span
          key={i}
          className="absolute text-[10px] text-amber-300/50"
          style={{ left: p.left, right: p.right, top: p.top }}
          animate={{ opacity: [0.2, 0.55, 0.2] }}
          transition={{ duration: 2.8, repeat: Infinity, delay: p.delay }}
        >
          ✦
        </motion.span>
      ))}
    </div>
  );
}
