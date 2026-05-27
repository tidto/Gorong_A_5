import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { normalizeEquipPreview, type EquipPreview } from "../../../utils/minihome/items";
import type { GrowthStage } from "../../../utils/minihome/growth";
import { growthStageScaleClass } from "../../../utils/minihome/growthStageVisual";
import { CUSTOMIZE_CAT_BOX_PX } from "../../../utils/minihome/catPreviewBox";
import GrowthStageBadge from "../growth/GrowthStageBadge";
import GrowthStageEffects from "../growth/GrowthStageEffects";
import GoCatBodyStage from "./GoCatBodyStage";

const TAP_MESSAGES = ["냥!", "좋아!", "기분 좋다냥~", "더 만져줘!", "간식 줘!"];

type DecorateCatPreviewProps = {
  growthStage: GrowthStage;
  activityCount?: number;
  equipped?: EquipPreview | null;
  interactive?: boolean;
  className?: string;
};

export default function DecorateCatPreview({
  growthStage,
  activityCount,
  equipped,
  interactive = true,
  className = "",
}: DecorateCatPreviewProps) {
  const [bubble, setBubble] = useState<string | null>(null);
  const safeEquipped = normalizeEquipPreview(equipped);
  const isMaster = growthStage === "MASTER";
  const scaleClass = growthStageScaleClass(growthStage);
  const box = CUSTOMIZE_CAT_BOX_PX;

  const onTap = useCallback(() => {
    setBubble(TAP_MESSAGES[Math.floor(Math.random() * TAP_MESSAGES.length)]);
    window.setTimeout(() => setBubble(null), 2200);
  }, []);

  return (
    <div className={`flex w-full max-w-[560px] flex-col items-center ${className}`}>
      <AnimatePresence>
        {bubble ? (
          <motion.div
            key={bubble}
            className="absolute left-1/2 top-0 z-40 -translate-x-1/2 rounded-2xl border-2 border-amber-200 bg-white px-4 py-2 text-sm font-extrabold text-amber-950 shadow-lg"
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            {bubble}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="relative flex min-h-[min(480px,88vw)] w-full items-center justify-center overflow-visible">
        {isMaster ? <GrowthStageEffects /> : null}

        <div
          className={`relative origin-bottom transition-transform duration-500 ease-out ${scaleClass}`}
          style={{
            width: box,
            height: box,
            maxWidth: `min(92vw, ${box}px)`,
            maxHeight: `min(92vw, ${box}px)`,
          }}
          data-gocat-wrapper
          data-box-px={box}
        >
          <GoCatBodyStage
            boxPx={box}
            growthStage={growthStage}
            equipped={safeEquipped}
            interactive={interactive}
            showCrown={isMaster && !safeEquipped.HEAD}
            onTap={onTap}
          />
        </div>
      </div>

      <div className="relative z-20 mt-3">
        <GrowthStageBadge stage={growthStage} activityCount={activityCount} />
      </div>
    </div>
  );
}
