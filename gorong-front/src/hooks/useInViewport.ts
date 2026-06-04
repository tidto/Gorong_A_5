import { useEffect, useRef, useState } from "react";

type Options = {
  rootMargin?: string;
  threshold?: number;
  /** false면 observer 미등록 */
  enabled?: boolean;
};

/** 뷰포트 진입 시 lazy load 트리거 */
export function useInViewport<T extends Element = HTMLDivElement>(options: Options = {}) {
  const { rootMargin = "120px", threshold = 0, enabled = true } = options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setInView(false);
      return;
    }
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, rootMargin, threshold]);

  return { ref, inView };
}
