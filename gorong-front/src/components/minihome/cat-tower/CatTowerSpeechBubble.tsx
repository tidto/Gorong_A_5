import { memo, useEffect, useState } from "react";
import {
  nextSpeechBubble,
  pickSpeechBubble,
  speechBubbleTilt,
} from "../../../utils/minihome/cat-tower/catTowerPresentation";

type CatTowerSpeechBubbleProps = {
  catName: string;
  isDark: boolean;
  /** false면 7초 타이머 비활성 (성능) */
  animate?: boolean;
};

/** 말풍선만 갱신 — RoomStage 전체 리렌더 방지 */
function CatTowerSpeechBubble({ catName, isDark, animate = true }: CatTowerSpeechBubbleProps) {
  const [speech, setSpeech] = useState(() => pickSpeechBubble(catName));
  const speechTilt = speechBubbleTilt(speech);

  useEffect(() => {
    if (!animate) return;
    const timer = window.setInterval(() => {
      setSpeech((prev) => nextSpeechBubble(prev));
    }, 7000);
    return () => window.clearInterval(timer);
  }, [animate]);

  const bubbleClass = isDark
    ? "border-indigo-300/30 bg-indigo-950/75 text-indigo-50/95"
    : "border-white/90 bg-white/95 text-rose-900/90";
  const tailClass = isDark ? "border-indigo-300/30 bg-indigo-950/75" : "border-white/90 bg-white/95";

  return (
    <div className="relative max-w-[148px]" style={{ transform: `rotate(${speechTilt}deg)` }}>
      <div
        className={`rounded-2xl rounded-bl-md border px-3 py-2 text-xs font-bold leading-snug shadow-[0_4px_14px_rgba(0,0,0,0.1)] backdrop-blur-md ${bubbleClass}`}
      >
        {speech}
      </div>
      <span
        className={`absolute -bottom-1.5 left-3 h-2.5 w-2.5 rotate-45 border-b border-l shadow-sm ${tailClass}`}
        aria-hidden
      />
    </div>
  );
}

export default memo(CatTowerSpeechBubble);
