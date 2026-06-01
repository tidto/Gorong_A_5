import type { RoomBackgroundTheme } from "../../../utils/minihome/cat-tower/catTowerRoomBackground";

type CatTowerRoomAmbienceProps = {
  theme: RoomBackgroundTheme;
  isDark?: boolean;
};

type FloatIcon = {
  emoji: string;
  className: string;
  animation?: string;
};

const THEME_ICONS: Record<RoomBackgroundTheme, FloatIcon[]> = {
  sakura: [
    { emoji: "🌸", className: "left-[6%] top-[16%] text-lg opacity-50", animation: "animate-petal-sway" },
    { emoji: "🌸", className: "left-[20%] top-[26%] text-sm opacity-35", animation: "animate-float" },
    { emoji: "🍃", className: "left-[38%] top-[14%] text-xs opacity-30", animation: "animate-petal-sway" },
    { emoji: "✨", className: "right-[10%] top-[18%] text-sm opacity-40", animation: "animate-sparkle" },
    { emoji: "🌸", className: "right-[22%] top-[30%] text-base opacity-38", animation: "animate-petal-sway" },
    { emoji: "✦", className: "right-[6%] top-[42%] text-[10px] opacity-30", animation: "animate-twinkle" },
  ],
  forest: [
    { emoji: "☁️", className: "left-[8%] top-[10%] text-xl opacity-40", animation: "animate-cloud-drift" },
    { emoji: "☁️", className: "left-[32%] top-[8%] text-base opacity-30", animation: "animate-cloud-drift" },
    { emoji: "🌿", className: "left-[4%] bottom-[30%] text-base opacity-35", animation: "animate-float" },
    { emoji: "🍃", className: "left-[16%] top-[20%] text-xs opacity-28", animation: "animate-petal-sway" },
    { emoji: "☁️", className: "right-[12%] top-[14%] text-lg opacity-38", animation: "animate-cloud-drift" },
    { emoji: "🍃", className: "right-[6%] bottom-[34%] text-sm opacity-38", animation: "animate-petal-sway" },
    { emoji: "✨", className: "right-[28%] top-[22%] text-[10px] opacity-32", animation: "animate-sparkle" },
  ],
  night: [
    { emoji: "✦", className: "left-[8%] top-[12%] text-[10px] text-white/85", animation: "animate-twinkle" },
    { emoji: "✦", className: "left-[22%] top-[8%] text-[8px] text-white/55", animation: "animate-twinkle" },
    { emoji: "✦", className: "left-[42%] top-[6%] text-[9px] text-white/70", animation: "animate-twinkle" },
    { emoji: "✦", className: "left-[58%] top-[10%] text-[7px] text-white/50", animation: "animate-twinkle" },
    { emoji: "✦", className: "left-[74%] top-[14%] text-[10px] text-white/80", animation: "animate-twinkle" },
    { emoji: "✦", className: "left-[90%] top-[18%] text-[8px] text-white/60", animation: "animate-twinkle" },
    { emoji: "✦", className: "left-[35%] top-[18%] text-[6px] text-white/45", animation: "animate-twinkle" },
    {
      emoji: "🌙",
      className:
        "right-[8%] top-[8%] text-3xl drop-shadow-[0_0_16px_rgba(255,255,200,0.5)]",
      animation: "animate-gentle-glow",
    },
  ],
};

const NIGHT_STARS = [
  { top: "11%", left: "15%", size: 2, delay: "0s" },
  { top: "7%", left: "48%", size: 3, delay: "0.6s" },
  { top: "15%", left: "67%", size: 2, delay: "1.1s" },
  { top: "9%", left: "82%", size: 2, delay: "0.3s" },
  { top: "20%", left: "28%", size: 1, delay: "1.8s" },
  { top: "13%", left: "55%", size: 2, delay: "2.2s" },
];

/** 방 배경 분위기 — 별·달·구름·벚꽃 등 */
export default function CatTowerRoomAmbience({ theme, isDark }: CatTowerRoomAmbienceProps) {
  const icons = THEME_ICONS[theme];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {theme === "sakura" ? (
        <>
          <div className="absolute -left-10 top-1/4 h-32 w-32 rounded-full bg-rose-200/20 blur-3xl" />
          <div className="absolute -right-8 top-1/3 h-28 w-28 rounded-full bg-pink-200/18 blur-3xl" />
        </>
      ) : null}

      {theme === "forest" ? (
        <>
          <div className="absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-white/22 via-sky-50/8 to-transparent" />
          <div className="absolute bottom-[20%] left-[3%] text-2xl opacity-18">🌲</div>
          <div className="absolute bottom-[22%] right-[4%] text-xl opacity-15">🌲</div>
          <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-emerald-900/6 to-transparent" />
        </>
      ) : null}

      {theme === "night" || isDark ? (
        <>
          <div className="absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-indigo-400/14 via-violet-300/6 to-transparent" />
          <div className="absolute right-[6%] top-[6%] h-16 w-16 rounded-full bg-yellow-100/8 blur-2xl" />
          {NIGHT_STARS.map((star, i) => (
            <span
              key={`star-${i}`}
              className="absolute animate-twinkle rounded-full bg-white/90"
              style={{
                top: star.top,
                left: star.left,
                width: star.size,
                height: star.size,
                animationDelay: star.delay,
              }}
            />
          ))}
        </>
      ) : null}

      {icons.map((icon, i) => (
        <span
          key={`${theme}-${i}`}
          className={`absolute ${icon.className} ${icon.animation ?? ""}`}
          style={{ animationDelay: `${i * 0.45}s` }}
        >
          {icon.emoji}
        </span>
      ))}
    </div>
  );
}
