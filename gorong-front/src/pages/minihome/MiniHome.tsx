import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import GoCatVisual from "../../components/minihome/GoCatVisual";
import GoCatCard from "../../components/minihome/GoCatCard";
import DecorationModal from "../../components/minihome/DecorationModal";
import DecorationCustomizePanel from "../../components/minihome/decoration/DecorationCustomizePanel";
import {
  addGalleryImage,
  completeMyCatSetup,
  createGallery,
  getMiniHomePage,
  createMyMiniHome,
  getMyMiniHomePage,
} from "../../api/minihome/miniHomeApi";
import ActivityHistory from "../../components/minihome/ActivityHistory";
import GallerySection from "../../components/minihome/GallerySection";
import GrowthProgress from "../../components/minihome/GrowthProgress";
import { computeGrowthState } from "../../utils/minihome/growth";
import type { ActivityItem, MiniHomePage } from "../../types/minihome/minihome";
import { useAuth } from "../../contexts/AuthContext";
import { useMiniHomeUserId } from "./hooks/useMiniHomeUserId";
import { useGoCatCustomize } from "./hooks/useGoCatCustomize";
import {
  applyEquipDraftToPage,
  buildEquipBySlotFromDraft,
  enrichEquipItems,
  equipPreviewFromDraft,
  normalizeEquipPreview,
} from "../../utils/minihome/items";
import { loadEquippedDecorDraft } from "../../utils/minihome/gocatEquippedStorage";
import type { DecorItem, SlotType } from "../../components/minihome/DecorationModal";
import DecorateCatPreview from "../../components/minihome/rive/DecorateCatPreview";
import {
  isCatAppearanceConfigured,
  parseCatAppearance,
  toAppearanceApiPayload,
} from "../../utils/minihome/catAppearance";
import { mapMiniHomeApiError } from "../../utils/minihome/minihomeApiError";
import GoCatOnboarding, { type GoCatOnboardingSubmit } from "../../components/minihome/onboarding/GoCatOnboarding";

function 에러메시지(e: unknown) {
  const anyErr = e as { response?: { status?: number; data?: { message?: string } }; message?: string };
  const status = anyErr?.response?.status;
  if (status === 401) return "로그인이 필요합니다.";
  if (status === 403) return "접근 권한이 없습니다.";
  const msg = anyErr?.response?.data?.message;
  if (typeof msg === "string" && msg.trim()) return msg;
  if (typeof anyErr?.message === "string" && anyErr.message.trim()) return anyErr.message;
  return "요청 처리 중 오류가 발생했습니다.";
}

export default function MiniHome() {
  const { userId: routeUserId } = useParams<{ userId?: string }>();
  const { isLoading: authLoading } = useAuth();
  const { userId, displayName, firebaseUser, loadingUserId, userIdError, isReady } = useMiniHomeUserId();
  const navigate = useNavigate();
  const targetUserId = routeUserId ? Number(routeUserId) : null;
  const isReadOnly = targetUserId != null && Number.isFinite(targetUserId) && targetUserId > 0;
  const canEdit = !isReadOnly;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState<MiniHomePage | null>(null);
  const [, setNoMiniHome] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"character" | "activities" | "gallery">("character");
  const [decorateOpen, setDecorateOpen] = useState(false);
  const [equippedDraft, setEquippedDraft] = useState<Record<SlotType, DecorItem | null>>(() =>
    loadEquippedDecorDraft()
  );

  const [galleryTitle, setGalleryTitle] = useState("나의 갤러리");
  const [galleryDesc, setGalleryDesc] = useState("행사 사진 모음");
  const [imageUrl, setImageUrl] = useState("");
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingErr, setOnboardingErr] = useState<string | null>(null);
  const todayIso = useMemo(() => new Date().toISOString(), []);

  async function load() {
    if (!isReady) return;

    setLoading(true);
    setErr(null);
    setNoMiniHome(false);

    try {
      const data = isReadOnly
        ? await getMiniHomePage(targetUserId!)
        : await getMyMiniHomePage();
      setPage({
        ...data,
        activeEquips: enrichEquipItems(data.activeEquips ?? []),
      });
    } catch (e: unknown) {
      console.error("[MiniHome] load failed", e);
      if ((e as Error)?.message === "AUTH_REQUIRED") {
        setErr("로그인이 필요합니다.");
        navigate("/login");
        return;
      }

      const status = (e as { response?: { status?: number } })?.response?.status;

      if (status === 404 && !isReadOnly) {
        try {
          await createMyMiniHome();
          const data = await getMyMiniHomePage();
          setPage({
            ...data,
            activeEquips: enrichEquipItems(data.activeEquips ?? []),
          });
          setNoMiniHome(false);
        } catch (createErr: unknown) {
          console.error("[MiniHome] create failed", createErr);
          setNoMiniHome(true);
          setPage(null);
          setErr(에러메시지(createErr));
        }
      } else if (status === 404 && isReadOnly) {
        setErr("해당 유저의 미니홈피를 찾을 수 없습니다.");
      } else {
        setErr(에러메시지(e));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading || loadingUserId) return;

    if (!firebaseUser) {
      setErr("로그인이 필요합니다.");
      return;
    }

    if (userIdError) {
      setErr(userIdError);
      return;
    }

    if (!isReady) return;

    setPage(null);
    setErr(null);
    setNoMiniHome(false);
    load();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, loadingUserId, isReady, firebaseUser?.uid, userId, userIdError, routeUserId]);

  const cat = page?.miniHome?.cat ?? null;
  const ownerUserId = page?.miniHome?.userId ?? 0;
  const growth = useMemo(() => computeGrowthState(page), [page]);

  const needsOnboarding = useMemo(() => {
    if (!page?.miniHome?.cat) return true;
    const cat = page.miniHome.cat;
    return !isCatAppearanceConfigured(cat.appearanceState, cat.appearanceConfigured);
  }, [page]);

  const showOnboarding =
    canEdit && !authLoading && !loadingUserId && isReady && Boolean(firebaseUser) && !loading && needsOnboarding;

  const handleEquippedSaved = useCallback((draft: Record<SlotType, DecorItem | null>) => {
    setEquippedDraft(draft);
    setPage((prev) => (prev ? applyEquipDraftToPage(prev, draft) : prev));
  }, []);

  const customize = useGoCatCustomize(cat, growth.stage, decorateOpen, {
    pageEquips: page?.activeEquips,
    appearanceState: cat?.appearanceState,
    goCatId: cat?.goCatId,
    canEdit,
    onEquippedSaved: handleEquippedSaved,
  });

  useEffect(() => {
    setEquippedDraft(loadEquippedDecorDraft(page?.activeEquips, cat?.appearanceState));
  }, [page?.activeEquips, cat?.appearanceState]);

  const equippedPreview = useMemo(() => {
    const preview = decorateOpen
      ? customize.equipPreview
      : equipPreviewFromDraft(equippedDraft);
    return normalizeEquipPreview(preview);
  }, [decorateOpen, customize.equipPreview, equippedDraft]);

  const equipBySlot = useMemo(() => buildEquipBySlotFromDraft(equippedDraft), [equippedDraft]);

  async function handleSaveDecoration() {
    const { equipOk, draft } = await customize.saveAll();
    if (equipOk) {
      setEquippedDraft(draft);
      setPage((prev) => (prev ? applyEquipDraftToPage(prev, draft) : prev));
      setDecorateOpen(false);
    }
  }

  async function handleOnboardingSubmit(payload: GoCatOnboardingSubmit) {
    setOnboardingSaving(true);
    setOnboardingErr(null);
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
      setNoMiniHome(false);
      await load();
    } catch (e: unknown) {
      setOnboardingErr(mapMiniHomeApiError(e, "Go냥이 저장에 실패했습니다."));
    } finally {
      setOnboardingSaving(false);
    }
  }

  async function onCreateGallery() {
    if (!canEdit) return;
    setLoading(true);
    setErr(null);
    try {
      if (!ownerUserId) throw new Error("미니홈 사용자 정보가 없습니다.");
      await createGallery(ownerUserId, { title: galleryTitle, description: galleryDesc });
      await load();
    } catch (e: any) {
      setErr(에러메시지(e));
    } finally {
      setLoading(false);
    }
  }

  async function onAddImage(galleryId: number) {
    if (!canEdit) return;
    const url = imageUrl.trim();
    if (!url) {
      setErr("이미지 URL을 입력해 주세요.");
      return;
    }

    setLoading(true);
    setErr(null);
    try {
      await addGalleryImage(galleryId, {
        imageUrl: url,
        locationName: "고롱",
        takenAt: todayIso,
      });
      await load();
    } catch (e: any) {
      setErr(에러메시지(e));
    } finally {
      setLoading(false);
    }
  }

  const activityCount = page?.stats?.activityCount ?? page?.activities?.length ?? 0;
  const galleryCount = page?.galleries?.length ?? 0;
  const equipCount = page?.activeEquips?.length ?? 0;

  function getActivityPostLink(activity: ActivityItem): string | null {
    if (!activity.referenceId) return null;
    const type = (activity.activityType ?? "").toUpperCase();
    if (type.includes("EVENT_PARTICIPATION") || type.includes("EVENT_PARTICIPATED")) {
      return "/group";
    }
    if (type.includes("EVENT") || type.includes("REVIEW")) {
      return `/events/${activity.referenceId}`;
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-pink-50">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-sm font-bold text-orange-700">
              🐱 Gorong MiniHome
            </div>
            <h1 className="mt-4 text-4xl font-extrabold text-slate-900">미니홈피</h1>
            <p className="mt-2 text-sm text-slate-600">
              {(page?.ownerNickname ?? displayName)}님의 활동, 갤러리, 고냥이 상태를 한 공간에서 확인합니다.
            </p>
            {isReadOnly ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                🔒 Read-only 미니홈피
              </div>
            ) : null}
            {firebaseUser ? (
              <p className="mt-2 text-sm font-semibold text-orange-600">
                로그인: {firebaseUser.email || firebaseUser.uid}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {authLoading ? (
              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600">인증 확인 중...</div>
            ) : firebaseUser ? (
              <div className="rounded-full bg-green-50 px-4 py-2 text-sm font-bold text-green-600">
                ✓ 로그인 완료
              </div>
            ) : (
              <div className="rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-600">
                ✗ 로그인 필요
              </div>
            )}

            <div className="rounded-2xl border border-orange-200 bg-white px-4 py-2 shadow-sm">
              <div className="text-sm font-semibold text-slate-700">
                EXP {growth.experience} · Lv.{page?.stats?.level ?? cat?.level ?? 1}
              </div>
            </div>

            <button
              className="rounded-2xl bg-orange-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-orange-700 disabled:opacity-50"
              onClick={load}
              disabled={loading}
            >
              {loading ? "조회 중..." : "조회"}
            </button>
            {isReadOnly ? (
              <button
                type="button"
                className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50"
              >
                신고
              </button>
            ) : null}
          </div>
        </div>

        {err || customize.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {err ?? customize.error}
          </div>
        ) : null}

        {showOnboarding ? (
          <GoCatOnboarding
            growthStage={growth.stage}
            initialCatName={cat?.catName}
            initialAppearance={cat ? parseCatAppearance(cat.appearanceState) : undefined}
            saving={onboardingSaving}
            error={onboardingErr ?? err}
            onSubmit={handleOnboardingSubmit}
          />
        ) : null}

        {page && !needsOnboarding ? (
          <>
            <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-orange-400 via-amber-400 to-pink-400 p-6 text-white shadow-xl">
              <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/20" />
              <div className="absolute bottom-8 right-20 text-4xl opacity-40">♡</div>
              <div className="absolute left-8 top-8 text-2xl opacity-30">✦</div>

              <div className="relative grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-center">
                <div className="space-y-5">
                  <div>
                    <div className="text-sm font-bold text-white/80">MY CAT PROFILE</div>
                    <h2 className="mt-2 text-4xl font-extrabold">
                      {cat?.catName ?? "고냥이"}
                    </h2>
                    <p className="mt-2 text-sm font-semibold text-white/90">
                      {growth.stage} · {growth.stageLabel}
                    </p>
                    <div className="mt-4 max-w-md">
                      <GrowthProgress growth={growth} tone="hero" compact />
                    </div>
                  </div>

                  {canEdit ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-xl bg-white/20 px-4 py-2 text-sm font-bold backdrop-blur hover:bg-white/30"
                        onClick={() => navigate("/group")}
                        type="button"
                      >
                        행사 찾기
                      </button>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="rounded-2xl bg-white/20 p-4 backdrop-blur">
                      <div className="text-2xl font-extrabold">{activityCount}</div>
                      <div className="text-xs font-semibold text-white/80">활동</div>
                    </div>
                    <div className="rounded-2xl bg-white/20 p-4 backdrop-blur">
                      <div className="text-2xl font-extrabold">{galleryCount}</div>
                      <div className="text-xs font-semibold text-white/80">갤러리</div>
                    </div>
                    <div className="rounded-2xl bg-white/20 p-4 backdrop-blur">
                      <div className="text-2xl font-extrabold">{equipCount}</div>
                      <div className="text-xs font-semibold text-white/80">아이템</div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <GoCatVisual
                    stage={growth.stage}
                    variant="hero"
                    equipped={equippedPreview}
                    activityCount={growth.activityCount}
                    interactive
                  />
                </div>
              </div>
            </section>

            <div className="rounded-3xl border border-orange-100 bg-white p-2 shadow-sm">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "character", label: "캐릭터", emoji: "🐾" },
                  { id: "activities", label: "활동", emoji: "📌" },
                  { id: "gallery", label: "갤러리", emoji: "🖼️" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTab(t.id as any)}
                    className={`rounded-2xl px-4 py-3 text-sm font-extrabold transition ${
                      selectedTab === t.id
                        ? "bg-orange-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-orange-50"
                    }`}
                  >
                    <span className="mr-1">{t.emoji}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {selectedTab === "character" ? (
              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
                  <div className="text-lg font-extrabold text-slate-900">캐릭터 성장</div>
                  <p className="mt-1 text-sm text-slate-500">
                    활동 기록에 따라 단계가 올라갑니다.
                  </p>
                  <div className="mt-5">
                    <GrowthProgress growth={growth} tone="card" />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-orange-50 p-3">
                      <div className="text-xs font-bold text-orange-600">레벨 (API)</div>
                      <div className="mt-1 font-extrabold text-slate-900">
                        {page?.stats?.level ?? cat?.level ?? 1}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-orange-50 p-3">
                      <div className="text-xs font-bold text-orange-600">누적 온도</div>
                      <div className="mt-1 font-extrabold text-slate-900">
                        {page?.stats?.temperatureTotal ?? cat?.temperatureTotal ?? 0}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
                  <GoCatCard
                    catName={cat?.catName ?? "고냥이"}
                    growth={growth}
                    isPublic={Boolean(page?.miniHome?.isPublic)}
                    equipBySlot={equipBySlot}
                    onOpenDecoration={() => setDecorateOpen(true)}
                    canDecorate={canEdit}
                  />
                </div>
              </div>
            ) : null}

            {selectedTab === "activities" ? (
              <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
                <div className="text-lg font-extrabold text-slate-900">활동 기록</div>
                <p className="mt-1 text-sm text-slate-500">최신순으로 30개까지 표시됩니다.</p>

                <div className="mt-5">
                  <ActivityHistory
                    activities={page?.activities ?? []}
                    variant="full"
                    emptyMessage="등록된 활동 기록이 없습니다."
                    getActivityLink={isReadOnly ? getActivityPostLink : undefined}
                    activityLinkLabel="관련 글 보기"
                  />
                </div>
              </div>
            ) : null}

            {selectedTab === "gallery" ? (
              <div className="space-y-5">
                {canEdit ? (
                  <>
                    <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
                      <div className="text-lg font-extrabold text-slate-900">갤러리 만들기</div>
                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <input
                          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-300"
                          value={galleryTitle}
                          onChange={(e) => setGalleryTitle(e.target.value)}
                          placeholder="제목"
                        />
                        <input
                          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-300"
                          value={galleryDesc}
                          onChange={(e) => setGalleryDesc(e.target.value)}
                          placeholder="설명"
                        />
                        <button
                          className="rounded-2xl bg-orange-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-orange-700 disabled:opacity-50"
                          onClick={onCreateGallery}
                          disabled={loading}
                        >
                          생성
                        </button>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
                      <div className="text-lg font-extrabold text-slate-900">이미지 URL 추가</div>
                      <input
                        className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-300"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </>
                ) : null}

                <GallerySection
                  galleries={page?.galleries ?? []}
                  variant="full"
                  onAddImage={canEdit ? onAddImage : undefined}
                  addImageDisabled={loading}
                  emptyMessage="등록된 갤러리가 없습니다."
                />
              </div>
            ) : null}
          </>
        ) : null}

        {canEdit ? (
          <DecorationModal
            open={decorateOpen}
            saving={customize.saving}
            error={customize.error}
            canEdit={customize.canEdit}
            growthStage={growth.stage}
            customizePanel={
              <DecorationCustomizePanel
                selectedHeadItem={customize.selectedHeadItem}
                selectedBodyItem={customize.selectedBodyItem}
                selectedAccessoryItem={customize.selectedAccessoryItem}
                setEquipDraft={customize.setEquipDraft}
                itemsLoading={customize.itemsLoading}
                itemsLoadError={customize.itemsLoadError}
                disabled={customize.saving}
                growthStage={growth.stage}
                activityCount={growth.activityCount}
              />
            }
            onClose={() => setDecorateOpen(false)}
            onSave={handleSaveDecoration}
            Preview={
              <DecorateCatPreview
                growthStage={growth.stage}
                activityCount={growth.activityCount}
                equipped={customize.equipPreview}
                interactive
              />
            }
          />
        ) : null}
      </div>
    </div>
  );
}