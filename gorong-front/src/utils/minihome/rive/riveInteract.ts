import type { GrowthStage } from "../growth/growth";
import {
  RIVE_GROWTH_ANIMATION_FALLBACK,
  getRiveAnimationForStage,
  resolveRivePlaybackAnimation,
} from "./riveGrowth";

/** CatPreview 터치 반응 종류 — Rive·CSS rig 공통 */
export type RiveInteractionKind = "idle" | "jump" | "wag" | "squish" | "blink";

export type RiveRuntime = {
  stop: () => void;
  play: (name?: string | string[]) => void;
  animationNames?: string[];
  stateMachineNames?: string[];
  stateMachineInputs?: (
    name: string
  ) => Array<{ name: string; fire?: () => void; value?: boolean | number }> | undefined;
  timeScale?: number;
};

/** cat.riv 에 있을 수 있는 State Machine 이름 후보 */
export const RIVE_STATE_MACHINE_CANDIDATES = [
  "CatState",
  "CatInteract",
  "Interact",
  "Interaction",
  "State Machine 1",
  "Main",
];

const INTERACTION_TRIGGERS: Record<RiveInteractionKind, string[]> = {
  idle: [],
  jump: ["tap", "jump", "interact", "click", "poke"],
  wag: ["wag", "tail", "tail_wag", "interact"],
  squish: ["squish", "squeeze", "tap", "interact"],
  blink: ["blink", "eye_blink", "eyes_blink", "blink_eyes"],
};

const INTERACTION_ANIMATIONS: Record<RiveInteractionKind, string[]> = {
  idle: [],
  jump: ["tap", "jump", "interact", "happy", "bounce"],
  wag: ["wag", "tail_wag", "tail", "tap"],
  squish: ["squish", "squeeze", "tap"],
  blink: ["blink", "eye_blink", "eyes_blink"],
};

export function pickRiveStateMachineName(names?: readonly string[] | null): string | null {
  if (!names?.length) return null;
  for (const candidate of RIVE_STATE_MACHINE_CANDIDATES) {
    if (names.includes(candidate)) return candidate;
  }
  return names[0] ?? null;
}

function findInput(
  rive: RiveRuntime,
  stateMachineName: string,
  inputNames: string[]
): { name: string; fire?: () => void; value?: boolean | number } | null {
  const inputs = rive.stateMachineInputs?.(stateMachineName);
  if (!inputs?.length) return null;
  const lower = inputNames.map((n) => n.toLowerCase());
  return (
    inputs.find((i) => lower.includes(i.name.toLowerCase())) ??
    inputs.find((i) => i.name.toLowerCase().includes("tap") || i.name.toLowerCase().includes("interact")) ??
    null
  );
}

/** State Machine 트리거 발화 (있으면 true) */
export function fireRiveInteraction(
  rive: RiveRuntime,
  stateMachineName: string,
  kind: RiveInteractionKind
): boolean {
  if (kind === "idle") return false;
  const input = findInput(rive, stateMachineName, INTERACTION_TRIGGERS[kind]);
  if (!input) return false;
  try {
    if (typeof input.fire === "function") {
      input.fire();
      return true;
    }
    input.value = true;
    return true;
  } catch {
    return false;
  }
}

function pickAnimation(nameList: string[], available?: readonly string[]): string | null {
  if (!available?.length) return nameList[0] ?? null;
  for (const n of nameList) {
    if (available.includes(n)) return n;
  }
  return null;
}

/** 타임라인 원샷 애니메이션 재생 (있으면 true) */
export function playRiveInteractionAnimation(
  rive: RiveRuntime,
  kind: RiveInteractionKind,
  available?: readonly string[] | null
): string | null {
  if (kind === "idle") return null;
  const picked = pickAnimation(INTERACTION_ANIMATIONS[kind], available ?? rive.animationNames);
  if (!picked) return null;
  try {
    rive.stop();
    rive.play(picked);
    return picked;
  } catch {
    return null;
  }
}

export function playRiveIdle(
  rive: RiveRuntime,
  stage: GrowthStage | string | null | undefined
): string {
  const idle = resolveRivePlaybackAnimation(stage, rive.animationNames);
  try {
    rive.play(idle);
  } catch {
    try {
      rive.play(RIVE_GROWTH_ANIMATION_FALLBACK);
      return RIVE_GROWTH_ANIMATION_FALLBACK;
    } catch {
      /* ignore */
    }
  }
  return idle;
}

export function applyRiveTimeScale(rive: RiveRuntime, speed: number) {
  if (typeof rive.timeScale === "number") {
    rive.timeScale = speed;
  }
}
