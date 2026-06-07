import { useState, type ImgHTMLAttributes } from "react";

type LazyImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  wrapperClassName?: string;
};

/** 네이티브 lazy + 로드 전 플레이스홀더 */
export default function LazyImage({
  wrapperClassName = "",
  className = "",
  alt = "",
  loading = "lazy",
  decoding = "async",
  onLoad,
  ...rest
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <span className={`relative inline-block overflow-hidden ${wrapperClassName}`}>
      {!loaded ? (
        <span
          className="absolute inset-0 animate-pulse bg-slate-200/60"
          aria-hidden
        />
      ) : null}
      <img
        {...rest}
        alt={alt}
        loading={loading}
        decoding={decoding}
        className={`${className} ${loaded ? "opacity-100" : "opacity-0"} transition-opacity duration-200`}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
      />
    </span>
  );
}
