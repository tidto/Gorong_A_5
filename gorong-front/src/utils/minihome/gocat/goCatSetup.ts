import type { MiniHomePage } from "../../../types/minihome/minihome";
import { isCatAppearanceConfigured } from "./catAppearance";

/** 본인 미니홈 — Go냥이 최초 생성·이름 설정이 아직 필요한지 */
export function needsGoCatSetup(page: MiniHomePage | null | undefined): boolean {
  const cat = page?.miniHome?.cat;
  if (!cat) return true;
  return !isCatAppearanceConfigured(cat.appearanceState, cat.appearanceConfigured);
}
