import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  GOCAT_BODY_ORIGIN,
  gocatBodyFloatAnimate,
  gocatBodyFloatTransition,
  gocatBodyHoverLift,
  gocatBodyHoverScale,
  gocatBodyHoverTransition,
} from "../../../utils/minihome/gocatBodyMotion";

type GoCatAnimatedBodyProps = {
  children: ReactNode;
  /** hover·tap 스케일 */
  interactive?: boolean;
  /** idle 둥실거림 (overlay·Rive 함께) */
  animateFloat?: boolean;
  className?: string;
};

/**
 * 고양이 + PNG overlay 공통 body wrapper
 * - idle: 위아래 둥실
 * - hover: scale 1 ~ 1.03
 * - overlay는 absolute 유지, wrapper transform만 적용
 */
export default function GoCatAnimatedBody({
  children,
  interactive = false,
  animateFloat = true,
  className = "",
}: GoCatAnimatedBodyProps) {
  return (
    <motion.div
      className={`relative h-full w-full ${className}`}
      style={{ transformOrigin: GOCAT_BODY_ORIGIN }}
      data-gocat-body
      animate={animateFloat ? gocatBodyFloatAnimate : undefined}
      transition={animateFloat ? gocatBodyFloatTransition : undefined}
      whileHover={
        interactive
          ? {
              scale: gocatBodyHoverScale,
              y: gocatBodyHoverLift,
              transition: gocatBodyHoverTransition,
            }
          : undefined
      }
      whileTap={interactive ? { scale: 1.03, transition: gocatBodyHoverTransition } : undefined}
    >
      {children}
    </motion.div>
  );
}
