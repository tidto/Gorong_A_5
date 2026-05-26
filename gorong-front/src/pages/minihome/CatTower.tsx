import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/Card";
import { BarChart3, Share2 } from "lucide-react";
import GoCatVisual from "../../components/minihome/GoCatVisual";

import SummaryCards from "../../components/minihome/SummaryCards";
import GoCatCard from "../../components/minihome/GoCatCard";
import ActivityHistory from "../../components/minihome/ActivityHistory";
import GallerySection from "../../components/minihome/GallerySection";
import DecorationModal from "../../components/minihome/DecorationModal";

import { useMiniHomeUserId } from "./hooks/useMiniHomeUserId";
import { useGoCatDecoration } from "./hooks/useGoCatDecoration";
import { getMyMiniHomePage } from "../../api/minihome/miniHomeApi";

import GrowthProgress from "../../components/minihome/GrowthProgress";
import CatTowerProfileCard from "../../components/minihome/CatTowerProfileCard";
import type { MiniHomePage } from "../../types/minihome/minihome";
import { computeGrowthState } from "../../utils/minihome/growth";
import { equipPreviewFromDraft } from "../../utils/minihome/items";

function errorMessage(e: any) {
  const msg = e?.response?.data?.message;
  if (typeof msg === "string" && msg.trim()) return msg;
  if (typeof e?.message === "string" && e.message.trim()) return e.message;
  return "요청 처리 중 오류가 발생했습니다.";
}

export default function CatTower() {
  const navigate = useNavigate();
  const { userId, displayName, firebaseUser, loadingUserId, userIdError, isReady } = useMiniHomeUserId();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState<MiniHomePage | null>(null);

  const [decorateOpen, setDecorateOpen] = useState(false);

  const growth = useMemo(() => computeGrowthState(page), [page]);
  const ownerUserId = page?.miniHome?.userId ?? 0;

  const decoration = useGoCatDecoration(ownerUserId, growth.stage, decorateOpen, {
    pageEquips: page?.activeEquips,
    goCatId: page?.miniHome?.cat?.goCatId,
    canEdit: true,
  });

  const {
    slot,
    setSlot,
    selectedEquipment,
    setSelectedEquipment,
    equipBySlot,
    itemsForSlot,
    saving,
    saveInfo,
    decorationErr,
    saveDecoration,
  } = decoration;

  async function loadMiniHome() {
    if (!isReady) return;

    setLoading(true);
    setErr(null);

    try {
      const data = await getMyMiniHomePage();
      setPage(data);
    } catch (e: unknown) {
      console.error("[CatTower] load failed", e);
      setErr(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveDecoration() {
    const ok = await saveDecoration();
    if (ok) {
      await loadMiniHome();
      setDecorateOpen(false);
    }
  }

  useEffect(() => {
    if (loadingUserId || !isReady) return;
    if (!firebaseUser) {
      setErr("로그인이 필요합니다.");
      return;
    }
    if (userIdError) {
      setErr(userIdError);
      return;
    }
    loadMiniHome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isReady, loadingUserId, firebaseUser?.uid, userIdError]);

  const catName = page?.miniHome?.cat?.catName ?? "고냥이";
  const profileLevel = page?.stats?.level ?? page?.miniHome?.cat?.level ?? 1;

  const summary = [
    {
      label: "활동 기록",
      value: page?.stats?.activityCount ?? 0,
      icon: BarChart3,
    },
    {
      label: "갤러리",
      value: page?.galleries?.length ?? 0,
      icon: Share2,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-pink-50">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
        <div className="overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-orange-400 via-amber-400 to-pink-400 px-6 py-8 text-white">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1 space-y-4">
                <div>
                  <div className="inline-flex rounded-full bg-white/20 px-4 py-2 text-sm font-bold backdrop-blur">
                    🐱 CatTower Dashboard
                  </div>
                  <h1 className="mt-4 text-4xl font-extrabold">CatTower</h1>
                  <p className="mt-2 max-w-xl text-sm font-semibold text-white/90">
                    미니홈피, 활동 기록, 갤러리, Go냥이를 한 화면에서 관리하세요.
                  </p>
                </div>
                <CatTowerProfileCard
                  nickname={displayName}
                  catName={catName}
                  growth={growth}
                  level={profileLevel}
                  isPublic={Boolean(page?.miniHome?.isPublic)}
                  loading={loading && !page}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap xl:shrink-0">
                <button
                  onClick={() => navigate("/minihome")}
                  disabled={loading || saving}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-orange-700 shadow-sm hover:bg-orange-50 disabled:opacity-50"
                >
                  미니홈 관리
                </button>

                <button
                  onClick={() => navigate("/events")}
                  disabled={loading || saving}
                  className="rounded-2xl bg-white/20 px-5 py-3 text-sm font-bold text-white backdrop-blur hover:bg-white/30 disabled:opacity-50"
                >
                  다음 행사 찾기
                </button>

                <button
                  onClick={() => setDecorateOpen(true)}
                  disabled={loading || saving}
                  className="rounded-2xl bg-white/20 px-5 py-3 text-sm font-bold text-white backdrop-blur hover:bg-white/30 disabled:opacity-50"
                >
                  꾸미기 모드
                </button>

                <button
                  onClick={loadMiniHome}
                  disabled={loading || saving}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
                >
                  {loading ? "불러오는 중" : "새로고침"}
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-3">
            <div className="rounded-3xl bg-orange-50 p-5">
              <div className="text-xs font-bold text-orange-600">CAT NAME</div>
              <div className="mt-2 text-2xl font-extrabold text-slate-900">
                {catName}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {growth.stage} · {growth.stageLabel}
              </div>
            </div>

            <div className="rounded-3xl bg-pink-50 p-5">
              <div className="text-xs font-bold text-pink-600">ACTIVITIES</div>
              <div className="mt-2 text-2xl font-extrabold text-slate-900">
                {page?.stats?.activityCount ?? 0}
              </div>
              <div className="mt-1 text-sm text-slate-500">최근 활동 기록</div>
            </div>

            <div className="rounded-3xl bg-amber-50 p-5">
              <div className="text-xs font-bold text-amber-600">GALLERY</div>
              <div className="mt-2 text-2xl font-extrabold text-slate-900">
                {page?.galleries?.length ?? 0}
              </div>
              <div className="mt-1 text-sm text-slate-500">나만의 갤러리</div>
            </div>
          </div>

          <div className="border-t border-orange-100 px-6 pb-6 pt-2">
            <GrowthProgress growth={growth} tone="card" />
          </div>
        </div>

        {err || decorationErr ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {err ?? decorationErr}
          </div>
        ) : null}

        <Card title="요약">
          <SummaryCards items={summary} />
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="고냥이">
            <GoCatCard
              catName={catName}
              growth={growth}
              isPublic={Boolean(page?.miniHome?.isPublic)}
              equipBySlot={equipBySlot}
              onOpenDecoration={() => setDecorateOpen(true)}
            />
          </Card>

          <Card title="활동 기록 (최근 10개)">
            <ActivityHistory
              activities={page?.activities ?? []}
              limit={10}
              variant="preview"
              emptyMessage="등록된 활동 기록이 없습니다."
            />
          </Card>
        </div>

        <Card title="나만의 갤러리 (최근 3개)">
          <GallerySection
            galleries={page?.galleries ?? []}
            limit={3}
            variant="preview"
            emptyMessage="등록된 갤러리가 없습니다."
          />
        </Card>

        <DecorationModal
          open={decorateOpen}
          saving={saving}
          saveInfo={saveInfo}
          slot={slot}
          setSlot={setSlot}
          draft={selectedEquipment}
          setDraft={setSelectedEquipment}
          items={itemsForSlot}
          itemsLoading={decoration.itemsLoading}
          itemsEmpty={decoration.itemsEmpty}
          itemsLoadError={decoration.itemsLoadError}
          decorationErr={decoration.decorationErr}
          canEdit={decoration.canEdit}
          growthStage={growth.stage}
          onClose={() => setDecorateOpen(false)}
          onSave={handleSaveDecoration}
          Preview={
            <GoCatVisual
              stage={growth.stage}
              equipped={equipPreviewFromDraft(selectedEquipment)}
            />
          }
        />
      </div>
    </div>
  );
}