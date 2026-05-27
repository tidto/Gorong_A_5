/** cat.riv State Machine 이름 (없으면 파일 내 첫 SM으로 폴백) */
export const RIVE_CAT_STATE_MACHINE = "CatState";

export const RIVE_CAT_SRC = "/rive/cat.riv";

const SM_CANDIDATES = [RIVE_CAT_STATE_MACHINE, "State Machine 1", "CatInteract", "Main"];

/** 로드된 riv 에서 사용할 State Machine 이름 결정 */
export function resolveCatStateMachine(names?: readonly string[] | null): string | null {
  if (!names?.length) return null;
  for (const candidate of SM_CANDIDATES) {
    if (names.includes(candidate)) return candidate;
  }
  console.warn(
    `[RiveCat] "${RIVE_CAT_STATE_MACHINE}" not found. Using "${names[0]}". Available:`,
    names
  );
  return names[0];
}
