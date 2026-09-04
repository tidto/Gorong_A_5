import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import GoCatOnboarding, { type GoCatOnboardingSubmit } from "../../components/minihome/onboarding/GoCatOnboarding";
import { useMiniHomeUserId } from "./hooks/useMiniHomeUserId";
import { useCatTowerView } from "./hooks/useCatTowerView";
import {
  completeMyCatSetup,
  createMyMiniHome,
} from "../../api/minihome/miniHomeApi";
import { computeGrowthState } from "../../utils/minihome/growth/growth";
import {
  parseCatAppearance,
  toAppearanceApiPayload,
} from "../../utils/minihome/gocat/catAppearance";
import { needsGoCatSetup } from "../../utils/minihome/gocat/goCatSetup";
import { mapMiniHomeApiError } from "../../utils/minihome/core/minihomeApiError";

/**
 * Go냥이 최초 생성·이름 설정 (1회)
 * 완료 후 /cattower 로 이동. 이미 설정된 사용자는 캣타워로 리다이렉트.
 */
export default function CatTowerCreatePage() {
  const navigate = useNavigate();
  const { firebaseUser, loadingUserId, userIdError, isReady } = useMiniHomeUserId();
  const { page, loading, err, canEdit, loadPage, setErr } = useCatTowerView({
    routeUserId: undefined,
    isReady,
  });

  const [saving, setSaving] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  const growth = useMemo(() => computeGrowthState(page), [page]);
  const needsSetup = useMemo(() => needsGoCatSetup(page), [page]);
  const cat = page?.miniHome?.cat ?? null;

  const gateReady =
    !loadingUserId && isReady && Boolean(firebaseUser) && !loading && Boolean(page);

  useEffect(() => {
    if (!isReady || loadingUserId) return;
    if (!firebaseUser) {
      setErr("로그인이 필요합니다.");
      return;
    }
    if (userIdError) {
      setErr(userIdError);
      return;
    }
    void loadPage();
  }, [isReady, loadingUserId, firebaseUser?.uid, userIdError, loadPage, setErr]);

  useEffect(() => {
    if (!gateReady) return;
    if (!needsSetup) {
      navigate("/cattower", { replace: true });
    }
  }, [gateReady, needsSetup, navigate]);

  async function handleSubmit(payload: GoCatOnboardingSubmit) {
    if (!canEdit) return;

    setSaving(true);
    setSubmitErr(null);
    try {
      const body = {
        ...toAppearanceApiPayload(payload.appearance),
        catName: payload.catName,
      };
      if (!page?.miniHome?.cat) {
        await createMyMiniHome(body);
      } else {
        await completeMyCatSetup(body);
      }
      navigate("/cattower", { replace: true });
    } catch (e: unknown) {
      setSubmitErr(mapMiniHomeApiError(e, "Go냥이 저장에 실패했습니다."));
    } finally {
      setSaving(false);
    }
  }

  if (!gateReady || !needsSetup) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-gradient-to-b from-[#f0faf2] via-[#fffaf5] to-[#fef6ee]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#f0faf2] via-[#fffaf5] to-[#fef6ee]">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-20 top-20 h-64 w-64 rounded-full bg-emerald-200/20 blur-3xl" />
        <div className="absolute -right-16 top-40 h-56 w-56 rounded-full bg-orange-200/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <GoCatOnboarding
          growthStage={growth.stage}
          initialCatName={cat?.catName}
          initialAppearance={cat ? parseCatAppearance(cat.appearanceState) : undefined}
          saving={saving}
          error={submitErr ?? err}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
