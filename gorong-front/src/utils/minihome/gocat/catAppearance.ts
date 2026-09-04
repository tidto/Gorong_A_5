/**
 * Go냥이 외형 — UI는 색상만, API/DB는 bodyType·pattern 고정값 유지
 */

export type CatColor = "ORANGE" | "CREAM" | "BLACK" | "GRAY" | "WHITE";

/** 앱에서 사용하는 외형 (색상만) */
export type CatAppearance = {
  color: CatColor;
};

export const FIXED_BODY_TYPE = "NORMAL" as const;
export const FIXED_PATTERN = "SOLID" as const;

export const DEFAULT_CAT_APPEARANCE: CatAppearance = {
  color: "CREAM",
};

export const COLOR_OPTIONS: {
  id: CatColor;
  label: string;
  hex: string;
  emoji: string;
}[] = [
  { id: "ORANGE", label: "주황", hex: "#FB923C", emoji: "🟠" },
  { id: "CREAM", label: "크림", hex: "#F4E4BC", emoji: "🟡" },
  { id: "BLACK", label: "검정", hex: "#1F2937", emoji: "⚫" },
  { id: "GRAY", label: "회색", hex: "#9CA3AF", emoji: "🩶" },
  { id: "WHITE", label: "흰색", hex: "#F8FAFC", emoji: "⚪" },
];

const LEGACY_COLOR_ALIASES: Record<string, CatColor> = {
  CHEESE: "CREAM",
  CALICO: "ORANGE",
  BROWN: "ORANGE",
};

export function isColor(v: string): v is CatColor {
  return COLOR_OPTIONS.some((c) => c.id === v);
}

export function normalizeCatColor(raw: string | null | undefined): CatColor {
  const upper = String(raw ?? "")
    .trim()
    .toUpperCase();
  if (isColor(upper)) return upper;
  return LEGACY_COLOR_ALIASES[upper] ?? DEFAULT_CAT_APPEARANCE.color;
}

export const APPEARANCE_CONFIGURED_KEY = "appearanceConfigured";

function readAppearanceConfiguredFlag(state: Record<string, unknown>): boolean | null {
  const v = state[APPEARANCE_CONFIGURED_KEY];
  if (v === true || v === "true") return true;
  if (v === false || v === "false") return false;
  return null;
}

export function isCatAppearanceConfigured(
  state: Record<string, unknown> | null | undefined,
  appearanceConfigured?: boolean | null
): boolean {
  if (appearanceConfigured === true) return true;
  if (appearanceConfigured === false) return false;
  if (!state) return false;
  const flag = readAppearanceConfiguredFlag(state);
  if (flag === true) return true;
  if (flag === false) return false;
  return false;
}

export function withAppearanceConfiguredState(
  state: Record<string, unknown> | null | undefined,
  appearance?: CatAppearance
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...(state ?? {}) };
  if (appearance) {
    next.bodyType = FIXED_BODY_TYPE;
    next.pattern = FIXED_PATTERN;
    next.color = appearance.color;
  }
  next[APPEARANCE_CONFIGURED_KEY] = true;
  return next;
}

/** appearance_state → 색상만 추출 */
export function parseCatAppearance(state: Record<string, unknown> | null | undefined): CatAppearance {
  if (!state) return { ...DEFAULT_CAT_APPEARANCE };
  return { color: normalizeCatColor(String(state.color ?? "")) };
}

/** API 저장용 payload */
export function toAppearanceApiPayload(appearance: CatAppearance) {
  return {
    bodyType: FIXED_BODY_TYPE,
    pattern: FIXED_PATTERN,
    color: appearance.color,
  };
}

/** Rive catColor input 없을 때만 쓰는 CSS 폴백 */
export function colorFilterClass(color: CatColor): string {
  switch (color) {
    case "ORANGE":
      return "hue-rotate-[18deg] saturate-[1.45] brightness-[1.05]";
    case "CREAM":
      return "sepia-[0.25] hue-rotate-[-12deg] saturate-[1.2] brightness-[1.08]";
    case "BLACK":
      return "brightness-[0.55] contrast-[1.15] saturate-[0.35]";
    case "WHITE":
      return "brightness-[1.2] saturate-[0.15] contrast-[0.92]";
    case "GRAY":
      return "grayscale-[0.55] brightness-[0.95]";
    default:
      return "";
  }
}

export function appearanceReactionMessage(appearance: CatAppearance): string {
  const label = COLOR_OPTIONS.find((c) => c.id === appearance.color)?.label;
  return label ? `${label} 냥이가 됐어요!` : "색이 바뀌었어요!";
}

export function appearanceSummary(a: CatAppearance): string {
  return COLOR_OPTIONS.find((c) => c.id === a.color)?.label ?? a.color;
}
