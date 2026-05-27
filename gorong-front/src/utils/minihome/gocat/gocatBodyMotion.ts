import type { Transition, Variants } from "framer-motion";

/** body wrapper — bottom 고정, overlay·Rive 동시 이동 */
export const GOCAT_BODY_ORIGIN = "50% 100%";

export const gocatBodyFloatTransition: Transition = {
  duration: 4.8,
  repeat: Infinity,
  ease: "easeInOut",
};

/** 닌텐도/다마고치 느낌 — 작은 둥실거림 (±4px @420) */
export const gocatBodyFloatAnimate = {
  y: [0, -4, -1, -4, 0],
};

export const gocatBodyHoverScale = 1.02;

export const gocatBodyHoverLift = -4;

export const gocatBodyHoverTransition: Transition = {
  type: "spring",
  stiffness: 220,
  damping: 24,
  mass: 0.8,
};

export const gocatBodyTapVariants: Variants = {
  idle: { scale: 1 },
  tap: { scale: 1.03 },
};
