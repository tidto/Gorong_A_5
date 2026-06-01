import { AnimatePresence, motion } from "framer-motion";
import type { SlotType } from "../mini-home/DecorationModal";
import type { EquipPreview, EquipPreviewItem } from "../../../utils/minihome/gocat/items";
import { getItemDisplayEmoji, normalizeEquipPreview, resolveEquipImageUrl } from "../../../utils/minihome/gocat/items";
import {
  bodyDressOverlayToStyle,
  getPositionedOverlay,
  glassesOverlayToStyle,
  isNeckBow,
  isRoundGlasses,
  isWhiteDress,
  neckBowOverlayToStyle,
  positionedOverlayToStyle,
} from "../../../utils/minihome/gocat/gocatItemOverlayPositions";
import { CUSTOMIZE_CAT_BOX_PX } from "../../../utils/minihome/gocat/catPreviewBox";

export type EquipSlot = SlotType;
export type OverlayLayer = "behind" | "body" | "front";

const FRONT_SLOTS: EquipSlot[] = ["HEAD", "ACCESSORY"];
const BODY_SLOTS: EquipSlot[] = ["BODY"];

function slotsForLayer(layer: OverlayLayer): EquipSlot[] {
  if (layer === "body") return BODY_SLOTS;
  if (layer === "behind") return [];
  return FRONT_SLOTS;
}

type CatEquipOverlaysProps = {
  equipped?: EquipPreview | null;
  layer: OverlayLayer;
  boxPx?: number;
  showCrown?: boolean;
  className?: string;
};

/** 일부 아이템만 420 기준 px 배치 (pink_bow 목, pink_bow_head, …) */
function PositionedOverlayImage({ item, slot }: { item: EquipPreviewItem; slot: EquipSlot }) {
  const src = resolveEquipImageUrl(item);
  const positioned = getPositionedOverlay(item.itemCode);
  if (!src?.trim() || !positioned) return null;

  return (
    <motion.img
      src={src}
      alt={item.itemName ?? ""}
      className="pointer-events-none absolute h-auto object-contain"
      style={positionedOverlayToStyle(positioned)}
      draggable={false}
      data-overlay-slot={slot}
      data-overlay-mode="positioned"
      data-overlay-code={item.itemCode ?? undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    />
  );
}

/** 420×420 aligned PNG — 캔버스 전체 (모자·원피스 등) */
function AlignedOverlayImage({ item, slot }: { item: EquipPreviewItem; slot: EquipSlot }) {
  const src = resolveEquipImageUrl(item);
  if (!src?.trim()) return null;
  return (
    <motion.img
      src={src}
      alt={item.itemName ?? ""}
      className="pointer-events-none absolute inset-0 h-full w-full object-contain"
      draggable={false}
      data-overlay-slot={slot}
      data-overlay-mode="aligned"
      data-overlay-code={item.itemCode ?? undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    />
  );
}

/** 하얀 앞치마 — aligned 420 + scale·위치 (고양이 가슴·턱 아래) */
function BodyDressOverlayImage({
  item,
  slot,
  boxPx,
}: {
  item: EquipPreviewItem;
  slot: EquipSlot;
  boxPx: number;
}) {
  const src = resolveEquipImageUrl(item);
  if (!src?.trim()) return null;

  return (
    <motion.img
      src={src}
      alt={item.itemName ?? ""}
      className="pointer-events-none absolute inset-0 h-full w-full object-contain"
      style={bodyDressOverlayToStyle(boxPx)}
      draggable={false}
      data-overlay-slot={slot}
      data-overlay-mode="body-dress-aligned"
      data-overlay-code={item.itemCode ?? undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    />
  );
}

/** 목 리본 — aligned 420 + scale (캔버스 안 리본이 작음) */
function NeckBowOverlayImage({
  item,
  slot,
  boxPx,
}: {
  item: EquipPreviewItem;
  slot: EquipSlot;
  boxPx: number;
}) {
  const src = resolveEquipImageUrl(item);
  if (!src?.trim()) return null;

  return (
    <motion.img
      src={src}
      alt={item.itemName ?? ""}
      className="pointer-events-none absolute inset-0 h-full w-full object-contain"
      style={neckBowOverlayToStyle(boxPx)}
      draggable={false}
      data-overlay-slot={slot}
      data-overlay-mode="neck-bow-aligned"
      data-overlay-code={item.itemCode ?? undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    />
  );
}

/** 안경 — aligned 420 PNG 전체 + 눈 높이 맞춤 (참고 UI 스크린샷 기준) */
function GlassesOverlayImage({
  item,
  slot,
  boxPx,
}: {
  item: EquipPreviewItem;
  slot: EquipSlot;
  boxPx: number;
}) {
  const src = resolveEquipImageUrl(item);
  if (!src?.trim()) return null;

  return (
    <motion.img
      src={src}
      alt={item.itemName ?? ""}
      className="pointer-events-none absolute inset-0 h-full w-full object-contain"
      style={glassesOverlayToStyle(boxPx)}
      draggable={false}
      data-overlay-slot={slot}
      data-overlay-mode="glasses-aligned"
      data-overlay-code={item.itemCode ?? undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    />
  );
}

function EquipOverlayImage({
  item,
  slot,
  boxPx,
}: {
  item: EquipPreviewItem;
  slot: EquipSlot;
  boxPx: number;
}) {
  if (isWhiteDress(item.itemCode)) {
    return <BodyDressOverlayImage item={item} slot={slot} boxPx={boxPx} />;
  }
  if (isRoundGlasses(item.itemCode)) {
    return <GlassesOverlayImage item={item} slot={slot} boxPx={boxPx} />;
  }
  if (isNeckBow(item.itemCode)) {
    return <NeckBowOverlayImage item={item} slot={slot} boxPx={boxPx} />;
  }
  if (getPositionedOverlay(item.itemCode)) {
    return <PositionedOverlayImage item={item} slot={slot} />;
  }
  return <AlignedOverlayImage item={item} slot={slot} />;
}

export default function CatEquipOverlays({
  equipped,
  layer,
  boxPx = CUSTOMIZE_CAT_BOX_PX,
  showCrown = false,
  className = "",
}: CatEquipOverlaysProps) {
  const safeEquipped = normalizeEquipPreview(equipped);
  const slots = slotsForLayer(layer);

  return (
    <div
      className={`pointer-events-none absolute inset-0 ${className}`}
      aria-hidden
      data-overlay-layer={layer}
    >
      <AnimatePresence mode="sync">
        {slots.map((slot) => {
          const item = safeEquipped[slot];
          if (!item) return null;
          const src = resolveEquipImageUrl(item);
          if (!src?.trim()) {
            return (
              <motion.span
                key={`${slot}-emoji`}
                className="absolute inset-0 flex items-center justify-center text-2xl drop-shadow-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {getItemDisplayEmoji(item)}
              </motion.span>
            );
          }
          return (
            <EquipOverlayImage
              key={`${slot}-${item.itemCode ?? item.itemId ?? slot}`}
              item={item}
              slot={slot}
              boxPx={boxPx}
            />
          );
        })}
      </AnimatePresence>

      {layer === "front" && showCrown && !safeEquipped.HEAD ? (
        <motion.span
          className="pointer-events-none absolute left-1/2 top-[10%] z-10 -translate-x-1/2 text-xl drop-shadow-sm"
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          aria-hidden
        >
          👑
        </motion.span>
      ) : null}
    </div>
  );
}
