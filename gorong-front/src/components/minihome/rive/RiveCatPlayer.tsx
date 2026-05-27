import { useCallback, useEffect, useRef, useState } from "react";
import { useRive, useStateMachineInput, Layout, Fit, Alignment } from "@rive-app/react-canvas";
import type { GrowthStage } from "../../../utils/minihome/growth/growth";
import { resolveCatStateMachine, RIVE_CAT_SRC } from "../../../utils/minihome/rive/riveCatColor";
import { fireRiveTap } from "../../../utils/minihome/rive/riveCatState";
import type { RiveRuntime } from "../../../utils/minihome/rive/riveInteract";
import {
  fireRiveInteraction,
  playRiveIdle,
  playRiveInteractionAnimation,
  pickRiveStateMachineName,
} from "../../../utils/minihome/rive/riveInteract";

const BASE_CAT_IMAGE = "/assets/cat/gocat-base.png";

type RiveCatPlayerProps = {
  growthStage?: GrowthStage;
  interactive?: boolean;
  /** 꼬리 흔들기·눈 깜빡임 (Rive SM/타임라인) */
  enableIdleLife?: boolean;
  className?: string;
  onTap?: () => void;
};

/** 단일 cat.riv — 성장 단계 애니 + tap(있을 때) */
export default function RiveCatPlayer({
  growthStage = "BASIC",
  interactive = false,
  enableIdleLife = false,
  className = "",
  onTap,
}: RiveCatPlayerProps) {
  const [activeSm, setActiveSm] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const smWarned = useRef(false);
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { rive, RiveComponent } = useRive({
    src: RIVE_CAT_SRC,
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.BottomCenter }),
    onLoadError: () => {
      console.warn("[RiveCat] cat.riv load failed — check public/rive/cat.riv");
      setLoadFailed(true);
    },
    onRiveReady: (instance) => {
      const r = instance as RiveRuntime;
      const sm = resolveCatStateMachine(r.stateMachineNames);
      if (sm) {
        setActiveSm(sm);
        try {
          r.play(sm);
        } catch {
          playRiveIdle(r, "BASIC");
        }
      } else {
        playRiveIdle(r, "BASIC");
        if (!smWarned.current) {
          console.warn("[RiveCat] No state machine in cat.riv — timeline idle only");
          smWarned.current = true;
        }
      }
    },
  });

  const tapInput = useStateMachineInput(rive, activeSm ?? "", "tap");

  useEffect(() => {
    if (!rive) return;
    playRiveIdle(rive as RiveRuntime, growthStage);
  }, [rive, growthStage]);

  /** 꼬리: 천천히 좌우 (Rive) */
  useEffect(() => {
    if (!rive || !enableIdleLife) return;
    const r = rive as RiveRuntime;
    const sm = activeSm ?? pickRiveStateMachineName(r.stateMachineNames);

    const wag = () => {
      if (sm && fireRiveInteraction(r, sm, "wag")) return;
      playRiveInteractionAnimation(r, "wag", r.animationNames);
    };

    wag();
    const id = window.setInterval(wag, 4800);
    return () => window.clearInterval(id);
  }, [rive, enableIdleLife, activeSm]);

  /** 눈: 가끔 깜빡임 */
  useEffect(() => {
    if (!rive || !enableIdleLife) return;
    const r = rive as RiveRuntime;
    const sm = activeSm ?? pickRiveStateMachineName(r.stateMachineNames);

    const scheduleNext = () => {
      const delay = 2800 + Math.random() * 3200;
      blinkTimerRef.current = window.setTimeout(() => {
        if (sm) fireRiveInteraction(r, sm, "blink");
        else playRiveInteractionAnimation(r, "blink", r.animationNames);
        scheduleNext();
      }, delay);
    };

    scheduleNext();
    return () => {
      if (blinkTimerRef.current) window.clearTimeout(blinkTimerRef.current);
    };
  }, [rive, enableIdleLife, activeSm]);

  const handleTap = useCallback(() => {
    if (!interactive) return;

    if (tapInput != null) {
      try {
        if (typeof tapInput.fire === "function") tapInput.fire();
        else tapInput.value = true;
      } catch {
        if (rive && activeSm) fireRiveTap(rive as RiveRuntime, activeSm);
      }
    } else if (rive && activeSm) {
      fireRiveTap(rive as RiveRuntime, activeSm);
    }

    onTap?.();
  }, [interactive, tapInput, rive, activeSm, onTap]);

  const riveCanvasClass =
    "riveLayer__canvas h-full w-full !bg-transparent [&>canvas]:!block [&>canvas]:!h-full [&>canvas]:!w-full [&>canvas]:!bg-transparent";

  if (loadFailed) {
    return (
      <div
        className={`absolute inset-0 flex items-center justify-center bg-transparent ${className}`}
        onClick={interactive ? handleTap : undefined}
        role={interactive ? "button" : undefined}
      >
        <img src={BASE_CAT_IMAGE} alt="고냥이" className="h-full w-full object-contain" draggable={false} />
      </div>
    );
  }

  if (!RiveComponent) return null;

  return (
    <div
      className={`rive-cat-player riveLayer absolute inset-0 h-full w-full !bg-transparent ${interactive ? "cursor-pointer" : ""} ${className}`}
      style={{ background: "transparent" }}
      onClick={interactive ? handleTap : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleTap();
              }
            }
          : undefined
      }
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? "고냥이와 놀기" : undefined}
    >
      <RiveComponent className={riveCanvasClass} />
    </div>
  );
}
