/** 캐릭터 주변 sparkle — 미니홈피 감성 */
const SPARKLES = [
  { className: "left-[8%] top-[18%]", delay: "0s", size: "text-[10px]" },
  { className: "right-[6%] top-[22%]", delay: "0.8s", size: "text-xs" },
  { className: "left-[14%] bottom-[28%]", delay: "1.4s", size: "text-[8px]" },
  { className: "right-[12%] bottom-[32%]", delay: "0.4s", size: "text-[10px]" },
  { className: "left-1/2 top-[8%] -translate-x-1/2", delay: "1.1s", size: "text-[9px]" },
];

export default function CatSparkleRing() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[3]" aria-hidden>
      {SPARKLES.map((s, i) => (
        <span
          key={i}
          className={`absolute animate-sparkle opacity-50 ${s.className} ${s.size}`}
          style={{ animationDelay: s.delay }}
        >
          ✦
        </span>
      ))}
    </div>
  );
}
