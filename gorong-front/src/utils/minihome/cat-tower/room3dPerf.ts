/** 모바일·저사양에서 3D 렌더 비용 절감 */
export function prefersLightweight3D(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 767px)").matches
  );
}
