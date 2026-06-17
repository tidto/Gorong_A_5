import { useEffect, useState } from "react";

/** 탭 비활성·요소 숨김 시 Rive/WebGL 등 재생 중지 */
export function usePlaybackActive(active = true): boolean {
  const [docVisible, setDocVisible] = useState(
    () => typeof document === "undefined" || document.visibilityState === "visible"
  );

  useEffect(() => {
    const onVisibility = () => setDocVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return active && docVisible;
}
