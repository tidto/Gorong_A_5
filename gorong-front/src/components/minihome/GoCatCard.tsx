import React, { useState } from "react";
import { Shirt } from "lucide-react";
import { useRive, Layout, Fit, Alignment } from "@rive-app/react-canvas";
import type { Equipment } from "../../types/minihome/item";

type SlotType = "HEAD" | "BODY" | "ACCESSORY";

function GoCatRiveOrFallback() {
  const [failed, setFailed] = useState(false);
  const { RiveComponent } = useRive({
    src: "/rive/cat.riv",
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    onLoadError: () => setFailed(true),
  });

  if (failed || !RiveComponent) {
    return (
      <div className="w-28 h-28 rounded-full bg-primary-100 border border-primary-200 flex items-center justify-center text-4xl">
        🐾
      </div>
    );
  }

  return (
    <div className="w-28 h-28 rounded-full bg-primary-50 border border-primary-200 overflow-hidden">
      <RiveComponent />
    </div>
  );
}

export default function GoCatCard(props: {
  catName: string;
  catType: string;
  isPublic: boolean;
  equipBySlot: Record<SlotType, Equipment | null>;
  onOpenDecoration: () => void;
}) {
  const { catName, catType, isPublic, equipBySlot, onOpenDecoration } = props;
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-xl font-bold text-gray-900 truncate">{catName}</div>
        <div className="text-sm text-gray-600 mt-1">타입: {catType}</div>
        <div className="text-xs text-gray-500 mt-2">미니홈피 공개 여부: {isPublic ? "공개" : "비공개"}</div>
        <div className="mt-3 grid grid-cols-1 gap-1 text-xs text-gray-600">
          <div>현재 착용(머리): {equipBySlot.HEAD?.itemName ?? "-"}</div>
          <div>현재 착용(몸): {equipBySlot.BODY?.itemName ?? "-"}</div>
          <div>현재 착용(액세서리): {equipBySlot.ACCESSORY?.itemName ?? "-"}</div>
        </div>
        <div className="mt-3">
          <button
            type="button"
            onClick={onOpenDecoration}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            <Shirt className="w-4 h-4" />
            꾸미기
          </button>
        </div>
      </div>
      <GoCatRiveOrFallback />
    </div>
  );
}

