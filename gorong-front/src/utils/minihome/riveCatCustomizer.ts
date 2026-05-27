/**
 * cat-customizer.riv (seal) — Rive SM 실험·참고용 유틸.
 * 최종 Go냥이 UI는 GoCatVisual / DecorateCatPreview overlay 사용.
 */

/** cat-customizer.riv State Machine (확인됨) */
export const RIVE_CAT_CUSTOMIZER_STATE_MACHINE = "Customize";

export const RIVE_CAT_CUSTOMIZER_SRC = "/rive/cat-customizer.riv";

/** 테스트 미리보기 캔버스 크기 (px) */
export const RIVE_CAT_CUSTOMIZER_PREVIEW_SIZE = 420;

/** Rive SM input — boolean · number · trigger */
export type RiveCustomizerInput = {
  name?: string;
  fire?: () => void;
  value?: boolean | number;
} | null;

export type RiveCustomizerRuntime = {
  stateMachineInputs?: (
    name: string
  ) => Array<{ name: string; fire?: () => void; value?: boolean | number }> | undefined;
};

/** Hat 버튼 1~4 → HeadWear0~3 */
export const RIVE_CAT_CUSTOMIZER_HEAD_WEAR_INPUTS = [
  "HeadWear0",
  "HeadWear1",
  "HeadWear2",
  "HeadWear3",
] as const;

export type RiveCustomizerHeadWearIndex = 0 | 1 | 2 | 3;

const SM_CANDIDATES = [
  RIVE_CAT_CUSTOMIZER_STATE_MACHINE,
  "Customizer",
  "CatCustomize",
  "State Machine 1",
  "Main",
];

/** 로드된 cat-customizer.riv 에서 사용할 State Machine 이름 결정 */
export function resolveCatCustomizerStateMachine(names?: readonly string[] | null): string | null {
  if (!names?.length) return null;
  for (const candidate of SM_CANDIDATES) {
    if (names.includes(candidate)) return candidate;
  }
  console.warn(
    `[GoCatRiveCustomizer] No known SM found. Using "${names[0]}". Available:`,
    names
  );
  return names[0];
}

function resolveSmInput(
  rive: RiveCustomizerRuntime | null | undefined,
  stateMachine: string,
  inputName: string,
  hookInput: RiveCustomizerInput
): RiveCustomizerInput {
  if (hookInput) return hookInput;
  const direct = rive?.stateMachineInputs?.(stateMachine)?.find((i) => i.name === inputName);
  return direct ?? null;
}

function setBooleanValue(input: RiveCustomizerInput, next: boolean): boolean {
  if (!input || typeof input.value !== "boolean") return false;
  try {
    input.value = next;
    return true;
  } catch (e) {
    console.warn("[GoCatRiveCustomizer] boolean set failed", input.name, e);
    return false;
  }
}

function fireTrigger(input: RiveCustomizerInput): boolean {
  if (!input || typeof input.fire !== "function") return false;
  try {
    input.fire();
    return true;
  } catch (e) {
    console.warn("[GoCatRiveCustomizer] trigger fire failed", input.name, e);
    return false;
  }
}

/**
 * 모자 N → HeadWear(N-1)
 * - boolean: 선택만 true, 나머지 false
 * - trigger: 선택 input fire()
 * - hookInput null 시 rive.stateMachineInputs 폴백
 */
export function applyHeadWearSelection(
  rive: RiveCustomizerRuntime | null | undefined,
  stateMachine: string,
  hookInputs: readonly RiveCustomizerInput[],
  selectedIndex: number
): boolean {
  const resolved = RIVE_CAT_CUSTOMIZER_HEAD_WEAR_INPUTS.map((name, index) =>
    resolveSmInput(rive, stateMachine, name, hookInputs[index] ?? null)
  );

  const selected = resolved[selectedIndex];
  if (!selected) {
    console.warn(
      "[GoCatRiveCustomizer] HeadWear input missing:",
      RIVE_CAT_CUSTOMIZER_HEAD_WEAR_INPUTS[selectedIndex]
    );
    return false;
  }

  let applied = false;
  const hasBoolean = resolved.some((input) => input && typeof input.value === "boolean");

  if (hasBoolean) {
    resolved.forEach((input, index) => {
      if (setBooleanValue(input, index === selectedIndex)) applied = true;
    });
  }

  if (fireTrigger(selected)) applied = true;

  if (!applied && selected.value !== undefined && typeof selected.value !== "boolean") {
    try {
      selected.value = selectedIndex;
      applied = true;
    } catch (e) {
      console.warn("[GoCatRiveCustomizer] numeric value set failed", selected.name, e);
    }
  }

  if (import.meta.env.DEV) {
    console.info(
      "[GoCatRiveCustomizer] HeadWear applied:",
      RIVE_CAT_CUSTOMIZER_HEAD_WEAR_INPUTS[selectedIndex],
      { applied, hasBoolean, hasFire: typeof selected.fire === "function" }
    );
  }

  return applied;
}

/** @deprecated applyHeadWearSelection 사용 */
export function applyExclusiveRiveInput(
  inputs: readonly RiveCustomizerInput[],
  selectedIndex: number
): void {
  applyHeadWearSelection(undefined, RIVE_CAT_CUSTOMIZER_STATE_MACHINE, inputs, selectedIndex);
}
