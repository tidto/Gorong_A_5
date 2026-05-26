import { useEffect, useMemo, useState } from "react";
import { useRive, Layout, Fit, Alignment } from "@rive-app/react-canvas";
import type { GrowthStage } from "../../utils/minihome/growth";
import { getCatVisualByStage, type CatVisual } from "../../utils/minihome/catVisual";
import { getItemDisplayEmoji, type EquipPreview } from "../../utils/minihome/items";
import {
  RIVE_GROWTH_ANIMATION_FALLBACK,
  resolveRivePlaybackAnimation,
} from "../../utils/minihome/riveGrowth";

type GoCatVisualProps = {
  stage: GrowthStage;
  className?: string;
  variant?: "card" | "hero";
  /** 장착 아이템 미리보기 (HEAD/BODY/ACCESSORY) */
  equipped?: EquipPreview | null;
};

function EquipmentOverlays({
  equipped,
  isHero,
}: {
  equipped: EquipPreview;
  isHero: boolean;
}) {
  const size = isHero ? "text-2xl" : "text-base";
  const headClass = isHero ? "-top-7" : "-top-5";
  const bodyClass = isHero ? "bottom-2 right-1" : "bottom-1 right-0";
  const accClass = isHero ? "bottom-6 left-0" : "bottom-4 -left-1";

  const renderSlot = (slot: keyof EquipPreview, positionClass: string) => {
    const item = equipped[slot];
    if (!item) return null;
    const emoji = getItemDisplayEmoji(item);
    return (
      <div
        className={`pointer-events-none absolute z-30 drop-shadow-md ${positionClass} ${size}`}
        title={item.itemName ?? undefined}
        aria-hidden
      >
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
        ) : (
          <span>{emoji}</span>
        )}
      </div>
    );
  };

  return (
    <>
      {renderSlot("HEAD", headClass)}
      {renderSlot("BODY", bodyClass)}
      {renderSlot("ACCESSORY", accClass)}
    </>
  );
}

type RiveInstance = {
  stop: () => void;
  play: (name?: string) => void;
  animationNames?: string[];
};

function playAnimation(rive: RiveInstance, visual: CatVisual): boolean {
  const available = rive.animationNames?.length ? rive.animationNames : undefined;
  const toPlay = resolveRivePlaybackAnimation(visual.stage, available);
  try {
    rive.stop();
    rive.play(toPlay);
    return true;
  } catch {
    try {
      rive.play(RIVE_GROWTH_ANIMATION_FALLBACK);
      return true;
    } catch {
      return false;
    }
  }
}

function MasterEffects() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-tr from-yellow-300/50 via-amber-200/20 to-orange-300/40 animate-pulse"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -inset-1 rounded-full border-2 border-yellow-300/60 animate-ping"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute left-2 top-3 text-xs text-yellow-200 animate-pulse"
        aria-hidden
      >
        ✦
      </span>
      <span
        className="pointer-events-none absolute bottom-4 right-2 text-xs text-amber-200 animate-pulse"
        aria-hidden
      >
        ✦
      </span>
    </>
  );
}

function CrownOnHead({ large }: { large?: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 drop-shadow-md ${
        large ? "-top-6 text-4xl" : "-top-4 text-2xl"
      }`}
      aria-hidden
      title="마스터"
    >
      <span className="animate-bounce inline-block">👑</span>
    </div>
  );
}

function StageRiveLayer({
  visual,
  onFailed,
}: {
  visual: CatVisual;
  onFailed: () => void;
}) {
  const { rive, RiveComponent } = useRive({
    src: visual.riveSrc,
    autoplay: true,
    animations: visual.riveAnimation,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    onLoadError: () => onFailed(),
  });

  useEffect(() => {
    if (!rive) return;
    const ok = playAnimation(rive as RiveInstance, visual);
    if (!ok) onFailed();
    
    // Apply animation speed using timeScale
    if ((rive as any).timeScale !== undefined) {
      (rive as any).timeScale = visual.animationSpeed;
    }
  }, [rive, visual, onFailed]);

  if (!RiveComponent) return null;

  return (
    <div 
      className={`h-full w-full overflow-hidden rounded-full ${visual.innerClass} ${visual.filterClass}`}
      style={{ animationDuration: `${1 / visual.animationSpeed}s` }}
    >
      <RiveComponent />
    </div>
  );
}

function EmojiFallback({ visual }: { visual: CatVisual }) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center rounded-full ${visual.innerClass} ${visual.filterClass} ${visual.emojiSizeClass}`}
      aria-hidden
    >
      {visual.emojiFallback}
    </div>
  );
}

function StaticImageLayer({
  visual,
  onFailed,
}: {
  visual: CatVisual;
  onFailed: () => void;
}) {
  return (
    <img
      src={visual.imageSrc}
      alt={`${visual.stageLabel} 고냥이`}
      className={`h-full w-full rounded-full object-cover ${visual.innerClass} ${visual.filterClass}`}
      onError={onFailed}
    />
  );
}

function CharacterBody({
  visual,
  mode,
  setMode,
}: {
  visual: CatVisual;
  mode: "rive" | "image" | "emoji";
  setMode: (m: "rive" | "image" | "emoji") => void;
}) {
  return (
    <div
      className="relative flex h-full w-full items-center justify-center transition-transform duration-500 ease-out"
      style={{ transform: `scale(${visual.scale})` }}
    >
      {mode === "rive" ? (
        <StageRiveLayer
          key={`${visual.stage}-${visual.riveAnimation}`}
          visual={visual}
          onFailed={() => setMode("image")}
        />
      ) : mode === "image" ? (
        <StaticImageLayer visual={visual} onFailed={() => setMode("emoji")} />
      ) : (
        <EmojiFallback visual={visual} />
      )}
    </div>
  );
}

export default function GoCatVisual({
  stage,
  className = "",
  variant = "card",
  equipped = null,
}: GoCatVisualProps) {
  const visual = useMemo(() => getCatVisualByStage(stage), [stage]);
  const [mode, setMode] = useState<"rive" | "image" | "emoji">("rive");

  useEffect(() => {
    setMode("rive");
  }, [stage]);

  const isHero = variant === "hero";
  const shellSize = isHero ? "h-52 w-52" : "h-32 w-32";
  const ringWidth = isHero ? "ring-[6px]" : "ring-4";
  const innerPad = isHero ? "p-2" : "p-1.5";

  return (
    <div className={`relative inline-flex flex-col items-center gap-2 ${className}`}>
      <div
        className={`relative flex items-center justify-center overflow-visible rounded-full ${shellSize} ${ringWidth} ring ${visual.ringClass} ${visual.shellClass} ${visual.glowClass} transition-all duration-500`}
      >
        {visual.hasSparkle ? <MasterEffects /> : null}

        {visual.showCornerBadge && visual.badgeEmoji ? (
          <div
            className="absolute -right-1 -top-1 z-20 flex items-center gap-1 rounded-full border border-white bg-white px-2 py-1 text-[10px] font-extrabold text-slate-800 shadow-md"
          >
            <span>{visual.badgeEmoji}</span>
            {visual.badgeLabel ? <span>{visual.badgeLabel}</span> : null}
          </div>
        ) : null}

        {visual.showCrownOnHead && !equipped?.HEAD ? <CrownOnHead large={isHero} /> : null}

        {equipped ? <EquipmentOverlays equipped={equipped} isHero={isHero} /> : null}

        <div className={`relative h-[82%] w-[82%] overflow-hidden rounded-full ${innerPad}`}>
          <CharacterBody visual={visual} mode={mode} setMode={setMode} />
        </div>

        {visual.hasAura ? (
          <div
            className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_28px_8px_rgba(251,191,36,0.45)]"
            aria-hidden
          />
        ) : null}
      </div>

      <div
        className={`rounded-full px-3 py-1 font-extrabold shadow-sm transition-colors ${
          isHero
            ? "bg-white/90 text-sm text-orange-800"
            : "border border-orange-100 bg-white text-xs text-slate-700"
        } ${visual.stage === "MASTER" ? "bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-900" : ""}`}
      >
        {visual.stage} · {visual.stageLabel}
      </div>
    </div>
  );
}
