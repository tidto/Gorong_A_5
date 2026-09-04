import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

/** frameloop="demand" — 유휴 시 GPU 정지, 애니메이션만 주기적 갱신 */
export function SceneDemandDriver({
  animateAmbient = false,
  fps = 12,
}: {
  animateAmbient?: boolean;
  fps?: number;
}) {
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    invalidate();
  }, [invalidate]);

  useEffect(() => {
    if (!animateAmbient) return;
    const interval = window.setInterval(() => invalidate(), Math.max(50, Math.round(1000 / fps)));
    return () => window.clearInterval(interval);
  }, [animateAmbient, fps, invalidate]);

  return null;
}
