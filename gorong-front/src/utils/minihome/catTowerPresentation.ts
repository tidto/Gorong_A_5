/** CatTower UI — 오늘의 한마디·말풍선·appearance payload */

import type { DecorItem, SlotType } from "../../components/minihome/DecorationModal";
import type { CatAppearancePayload } from "../../api/minihome/miniHomeApi";
import { findGoCatItemByCode } from "../../data/gocatItems";
import { goCatItemToDecorItem } from "./decorItemCatalog";
import { emptyDraft } from "./items";

export const CAT_SPEECH_BUBBLES = [
  "오늘도 와줘서 고마워! 🐾",
  "Go냥이 방에 놀러 왔어요 ✨",
  "우리 집, 예쁘지? 🏡",
  "여기서 편히 쉬어가~ 💕",
  "배고파… 간식 주세요 🍪",
  "오늘 기분 최고야~ 😸",
  "같이 놀자! 🎮",
  "방 꾸미는 거 좋아해요 🎀",
];

export const DAILY_QUOTES = [
  "오늘도 Go냥이와 행복한 하루 되세요 🌸",
  "작은 활동이 큰 성장을 만듭니다 🌱",
  "나만의 미니홈피, 천천히 꾸며가요 🏡",
  "고양이는 세상에서 가장 귀여운 존재 🐱",
  "벚꽃처럼 따뜻한 하루 보내세요 🌸",
  "오늘의 작은 모험을 기록해 보세요 ✨",
  "Go냥이가 응원하고 있어요! 💪",
  "방문해 주셔서 감사해요 🐾",
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** 날짜 + catName 기반 — 하루 동안 동일 문구 */
export function pickDailyQuote(catName: string, date = new Date()): string {
  const key = `${date.toISOString().slice(0, 10)}-${catName}`;
  return DAILY_QUOTES[hashString(key) % DAILY_QUOTES.length];
}

export function pickSpeechBubble(seed: string): string {
  return CAT_SPEECH_BUBBLES[hashString(seed) % CAT_SPEECH_BUBBLES.length];
}

export function nextSpeechBubble(current: string): string {
  const idx = CAT_SPEECH_BUBBLES.indexOf(current);
  const next = idx >= 0 ? (idx + 1) % CAT_SPEECH_BUBBLES.length : 0;
  return CAT_SPEECH_BUBBLES[next];
}

/** 말풍선 살짝 기울이기 (-3° ~ 3°) */
export function speechBubbleTilt(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return ((Math.abs(hash) % 7) - 3) * 0.85;
}

/** appearanceState → 장착 draft */
export function equipDraftFromAppearanceState(
  state: Record<string, unknown> | null | undefined
): Record<SlotType, DecorItem | null> {
  const draft = emptyDraft();
  if (!state) return draft;

  const headRaw = state.headItemCode ?? state.headItem;
  const accRaw = state.accessoryItemCode ?? state.accessoryItem;

  if (typeof headRaw === "string" && headRaw.trim()) {
    const item = findGoCatItemByCode(headRaw);
    if (item) draft.HEAD = goCatItemToDecorItem(item);
  }
  if (typeof accRaw === "string" && accRaw.trim()) {
    const item = findGoCatItemByCode(accRaw);
    if (item) draft.ACCESSORY = goCatItemToDecorItem(item);
  }
  return draft;
}

/** 장착 draft → API appearance payload */
export function toPresentationAppearancePayload(
  draft: Record<SlotType, DecorItem | null>
): CatAppearancePayload {
  return {
    headItemCode: draft.HEAD?.itemCode?.trim() || undefined,
    accessoryItemCode: draft.ACCESSORY?.itemCode?.trim() || undefined,
  };
}
