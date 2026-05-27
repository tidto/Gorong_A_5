import type { CSSProperties } from "react";
import { CUSTOMIZE_CAT_BOX_PX } from "./catPreviewBox";

/** 420×420 기준 — 튜닝이 필요한 아이템만 */
export type PositionedItemOverlay = {
  top: number;
  width: number;
  zIndex: number;
};

const POSITIONED_OVERLAYS: Record<string, PositionedItemOverlay> = {
  pink_bow_head: { top: 88, width: 90, zIndex: 40 },
};

/** round_glasses_aligned.png — 420 캔버스에 안경만 배치됨 → full-canvas + 눈 위치 미세조정 */
export type GlassesOverlayTune = {
  /** 420 기준 px — 양수면 아래로 */
  offsetY: number;
  scale: number;
  /** transform-origin Y (0–1, 캔버스 높이 비율) */
  originY: number;
};

export const ROUND_GLASSES_TUNE: GlassesOverlayTune = {
  offsetY: 6,
  scale: 1.14,
  originY: 0.36,
};

/** 목 리본 — 420 aligned PNG 안 그래픽이 작아 scale로 확대 */
export const NECK_BOW_TUNE: GlassesOverlayTune = {
  offsetY: 32,
  scale: 1.2,
  originY: 0.52,
};

/** 하얀 앞치마 — 턱 아래·가슴만 (얼굴 가리지 않게 아래로) */
export const WHITE_DRESS_TUNE: GlassesOverlayTune = {
  offsetY: 66,
  scale: 1.08,
  originY: 0.64,
};

export function getPositionedOverlay(itemCode?: string | null): PositionedItemOverlay | undefined {
  if (!itemCode?.trim()) return undefined;
  return POSITIONED_OVERLAYS[itemCode.trim().toLowerCase()];
}

export function isRoundGlasses(itemCode?: string | null): boolean {
  return itemCode?.trim().toLowerCase() === "round_glasses";
}

export function isNeckBow(itemCode?: string | null): boolean {
  return itemCode?.trim().toLowerCase() === "pink_bow";
}

export function neckBowOverlayToStyle(boxPx: number = CUSTOMIZE_CAT_BOX_PX): CSSProperties {
  const ratio = boxPx / CUSTOMIZE_CAT_BOX_PX;
  const { offsetY, scale, originY } = NECK_BOW_TUNE;
  return {
    zIndex: 38,
    transform: `translateY(${offsetY * ratio}px) scale(${scale})`,
    transformOrigin: `50% ${originY * 100}%`,
  };
}

export function isWhiteDress(itemCode?: string | null): boolean {
  return itemCode?.trim().toLowerCase() === "white_dress";
}

export function bodyDressOverlayToStyle(boxPx: number = CUSTOMIZE_CAT_BOX_PX): CSSProperties {
  const ratio = boxPx / CUSTOMIZE_CAT_BOX_PX;
  const { offsetY, scale, originY } = WHITE_DRESS_TUNE;
  return {
    zIndex: 20,
    transform: `translateY(${offsetY * ratio}px) scale(${scale})`,
    transformOrigin: `50% ${originY * 100}%`,
  };
}

export function glassesOverlayToStyle(boxPx: number = CUSTOMIZE_CAT_BOX_PX): CSSProperties {
  const ratio = boxPx / CUSTOMIZE_CAT_BOX_PX;
  const { offsetY, scale, originY } = ROUND_GLASSES_TUNE;
  return {
    zIndex: 40,
    transform: `translateY(${offsetY * ratio}px) scale(${scale})`,
    transformOrigin: `50% ${originY * 100}%`,
  };
}

export function positionedOverlayToStyle(overlay: PositionedItemOverlay): CSSProperties {
  const box = CUSTOMIZE_CAT_BOX_PX;
  return {
    top: `${(overlay.top / box) * 100}%`,
    left: "50%",
    width: `${(overlay.width / box) * 100}%`,
    transform: "translateX(-50%)",
    zIndex: overlay.zIndex,
  };
}
