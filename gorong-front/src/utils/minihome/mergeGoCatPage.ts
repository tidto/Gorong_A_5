import type { GoCat, MiniHomePage } from "../../types/minihome/minihome";
import type { CatAppearance } from "./catAppearance";
import { withAppearanceConfiguredState } from "./catAppearance";

/** 온보딩·외형 저장 후 페이지 cat 동기화 */
export function applyConfiguredGoCat(
  cat: GoCat,
  appearance?: CatAppearance
): GoCat {
  return {
    ...cat,
    appearanceConfigured: true,
    appearanceState: withAppearanceConfiguredState(cat.appearanceState, appearance),
  };
}

export function mergeGoCatIntoPage(
  page: MiniHomePage | null,
  updated: GoCat,
  appearance?: CatAppearance
): MiniHomePage | null {
  if (!page?.miniHome?.cat) return page;

  const current = page.miniHome.cat;
  if (updated.goCatId && current.goCatId && updated.goCatId !== current.goCatId) {
    console.warn(
      "[mergeGoCatIntoPage] goCatId mismatch — page cat kept",
      current.goCatId,
      updated.goCatId
    );
    return {
      ...page,
      miniHome: {
        ...page.miniHome,
        cat: applyConfiguredGoCat(current, appearance),
      },
    };
  }

  const merged: GoCat = applyConfiguredGoCat(
    { ...current, ...updated },
    appearance
  );

  return {
    ...page,
    miniHome: {
      ...page.miniHome,
      cat: merged,
    },
  };
}
