import { RIVE_CAT_STATE_MACHINE } from "./riveCatColor";
import type { RiveRuntime } from "./riveInteract";
import { playRiveInteractionAnimation } from "./riveInteract";
import { riveWarnOnce } from "./riveWarnOnce";

type SmInput = {
  name: string;
  fire?: () => void;
  value?: boolean | number;
};

function getInputs(rive: RiveRuntime, stateMachine: string): SmInput[] | null {
  const list = rive.stateMachineInputs?.(stateMachine);
  if (!list?.length) return null;
  return list;
}

function findInput(inputs: SmInput[], name: string): SmInput | null {
  const lower = name.toLowerCase();
  return inputs.find((i) => i.name.toLowerCase() === lower) ?? null;
}

/** State Machine.catColor Number input 설정 */
export function setRiveCatColor(
  rive: RiveRuntime | null | undefined,
  colorIndex: number,
  stateMachine = RIVE_CAT_STATE_MACHINE
): boolean {
  if (!rive) return false;
  const inputs = getInputs(rive, stateMachine);
  if (!inputs) {
    riveWarnOnce(
      `sm-inputs-${stateMachine}`,
      `[RiveCat] "${stateMachine}" inputs not found — using CSS color fallback`
    );
    return false;
  }
  const input = findInput(inputs, "catColor");
  if (!input) {
    riveWarnOnce(
      `catColor-${stateMachine}`,
      `[RiveCat] catColor input not found on "${stateMachine}" — add Number input in cat.riv or use CSS fallback`
    );
    return false;
  }
  try {
    input.value = colorIndex;
    return true;
  } catch (e) {
    console.warn("[RiveCat] failed to set catColor", e);
    return false;
  }
}

/** State Machine.tap Trigger 발화 (없으면 타임라인 tap 애니 폴백) */
export function fireRiveTap(
  rive: RiveRuntime | null | undefined,
  stateMachine = RIVE_CAT_STATE_MACHINE
): boolean {
  if (!rive) return false;
  const inputs = getInputs(rive, stateMachine);
  if (inputs) {
    const input = findInput(inputs, "tap");
    if (input) {
      try {
        if (typeof input.fire === "function") input.fire();
        else input.value = true;
        return true;
      } catch (e) {
        console.warn("[RiveCat] failed to fire tap trigger", e);
      }
    }
  }

  const played = playRiveInteractionAnimation(rive, "jump", rive.animationNames);
  if (!played) {
    riveWarnOnce(
      `tap-${stateMachine}`,
      `[RiveCat] tap trigger not found on "${stateMachine}" — using timeline fallback`
    );
  }
  return Boolean(played);
}
