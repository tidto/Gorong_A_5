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

  return (
    <div
      className={`rounded-2xl rounded-bl-sm border px-3 py-2 text-[9px] font-bold leading-snug shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-opacity duration-300 ${
        isDark
          ? "border-indigo-300/25 bg-indigo-950/70 text-indigo-100/90 backdrop-blur-md"
          : "border-white/85 bg-white/90 text-rose-800/85 backdrop-blur-md"
      }`}
      style={{ transform: `rotate(${speechTilt}deg)` }}
    >
      {speech}
    </div>
  );
}

export default memo(CatTowerSpeechBubble);
