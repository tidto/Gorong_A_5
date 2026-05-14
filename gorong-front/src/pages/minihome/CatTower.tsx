import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { BarChart3, Share2 } from "lucide-react";
import { useRive, Layout, Fit, Alignment } from "@rive-app/react-canvas";

import SummaryCards from "../../components/minihome/SummaryCards";
import GoCatCard from "../../components/minihome/GoCatCard";
import ActivityHistory from "../../components/minihome/ActivityHistory";
import GallerySection from "../../components/minihome/GallerySection";
import DecorationModal, {
  type DecorItem,
  type SlotType,
} from "../../components/minihome/DecorationModal";

import { useMiniHomeUserId } from "./hooks/useMiniHomeUserId";
import { createMiniHome, getMiniHomePage } from "../../api/minihome/miniHomeApi";
import {
  equipItem,
  getEquipments,
  getUserItems,
  unequipSlot,
} from "../../api/minihome/itemApi";

import type { MiniHomePage } from "../../types/minihome/minihome";
import type { Equipment, UserItem } from "../../types/minihome/item";

const SLOTS: SlotType[] = ["HEAD", "BODY", "ACCESSORY"];

const MOCK_ITEMS: (UserItem & { slotType: SlotType })[] = [
  {
    userItemId: -1,
    itemId: -101,
    itemCode: "MOCK_RIBBON",
    itemName: "리본",
    itemType: "HEAD",
    imageUrl: null,
    acquiredAt: new Date(0).toISOString(),
    slotType: "HEAD",
  },
  {
    userItemId: -2,
    itemId: -102,
    itemCode: "MOCK_HAT",
    itemName: "모자",
    itemType: "BODY",
    imageUrl: null,
    acquiredAt: new Date(0).toISOString(),
    slotType: "BODY",
  },
  {
    userItemId: -3,
    itemId: -103,
    itemCode: "MOCK_NECKLACE",
    itemName: "목걸이",
    itemType: "ACCESSORY",
    imageUrl: null,
    acquiredAt: new Date(0).toISOString(),
    slotType: "ACCESSORY",
  },
];

function errorMessage(e: any) {
  const msg = e?.response?.data?.message;
  if (typeof msg === "string" && msg.trim()) return msg;
  if (typeof e?.message === "string" && e.message.trim()) return e.message;
  return "요청 처리 중 오류가 발생했습니다.";
}

function GoCatPreview() {
  const [failed, setFailed] = useState(false);

  const { RiveComponent } = useRive({
    src: "/rive/cat.riv",
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    onLoadError: () => setFailed(true),
  });

  if (failed || !RiveComponent) {
    return (
      <div className="flex h-28 w-28 items-center justify-center rounded-full border border-orange-200 bg-orange-100 text-4xl">
        🐾
      </div>
    );
  }

  return (
    <div className="h-28 w-28 overflow-hidden rounded-full border border-orange-200 bg-orange-50">
      <RiveComponent />
    </div>
  );
}

export default function CatTower() {
  const navigate = useNavigate();
  const { userId, displayName } = useMiniHomeUserId();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState<MiniHomePage | null>(null);

  const [decorateOpen, setDecorateOpen] = useState(false);
  const [slot, setSlot] = useState<SlotType>("HEAD");
  const [items, setItems] = useState<UserItem[]>([]);
  const [equipments, setEquipmentsState] = useState<Equipment[]>([]);
  const [draft, setDraft] = useState<Record<SlotType, DecorItem | null>>({
    HEAD: null,
    BODY: null,
    ACCESSORY: null,
  });
  const [saving, setSaving] = useState(false);
  const [saveInfo, setSaveInfo] = useState<string | null>(null);

  const equipBySlot = useMemo(() => {
    const map: Record<SlotType, Equipment | null> = {
      HEAD: null,
      BODY: null,
      ACCESSORY: null,
    };

    for (const e of equipments) {
      const s = (e.slotType || "").toUpperCase();
      if (s === "HEAD" || s === "BODY" || s === "ACCESSORY") {
        if (!map[s]) map[s] = e;
      }
    }

    return map;
  }, [equipments]);

  const usingMock = items.length === 0;

  const itemsForSlot: DecorItem[] = useMemo(() => {
    if (usingMock) return MOCK_ITEMS.filter((m) => m.slotType === slot);
    return items;
  }, [usingMock, items, slot]);

  async function loadMiniHome() {
    setLoading(true);
    setErr(null);

    try {
      const data = await getMiniHomePage(userId);
      setPage(data);
    } catch (e: any) {
      const status = e?.response?.status;

      if (status === 404) {
        await createMiniHome(userId);
        const data = await getMiniHomePage(userId);
        setPage(data);
      } else {
        setErr(errorMessage(e));
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadDecoration() {
    setErr(null);
    setSaveInfo(null);

    try {
      const [owned, equips] = await Promise.all([
        getUserItems(userId),
        getEquipments(userId),
      ]);

      setItems(owned);
      setEquipmentsState(equips);

      const byItemId = new Map<number, DecorItem>();
      for (const it of owned) byItemId.set(it.itemId, it);

      const map: Record<SlotType, Equipment | null> = {
        HEAD: null,
        BODY: null,
        ACCESSORY: null,
      };

      for (const e of equips) {
        const s = (e.slotType || "").toUpperCase();
        if (s === "HEAD" || s === "BODY" || s === "ACCESSORY") {
          if (!map[s]) map[s] = e;
        }
      }

      setDraft({
        HEAD: map.HEAD ? byItemId.get(map.HEAD.itemId) ?? null : null,
        BODY: map.BODY ? byItemId.get(map.BODY.itemId) ?? null : null,
        ACCESSORY: map.ACCESSORY
          ? byItemId.get(map.ACCESSORY.itemId) ?? null
          : null,
      });
    } catch (e: any) {
      setErr(errorMessage(e));
      setItems([]);
      setEquipmentsState([]);
      setDraft({ HEAD: null, BODY: null, ACCESSORY: null });
    }
  }

  async function saveDecoration() {
    setSaving(true);
    setErr(null);
    setSaveInfo(null);

    try {
      for (const s of SLOTS) {
        const current = equipBySlot[s]?.itemId ?? null;
        const next = draft[s]?.itemId ?? null;

        if (current === next) continue;

        if (next == null) {
          await unequipSlot(userId, s);
        } else {
          await equipItem(userId, { itemId: next, slotType: s });
        }
      }

      await loadDecoration();
      await loadMiniHome();
      setDecorateOpen(false);
    } catch {
      setSaveInfo("백엔드 연결 전이라 임시 저장되었습니다");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadMiniHome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (decorateOpen) loadDecoration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decorateOpen]);

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
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex rounded-full bg-white/20 px-4 py-2 text-sm font-bold backdrop-blur">
                  🐱 CatTower Dashboard
                </div>

                <h1 className="mt-4 text-4xl font-extrabold">CatTower</h1>

                <p className="mt-2 text-sm font-semibold text-white/90">
                  {displayName}님의 미니홈피, 활동 기록, 갤러리, 고냥이를 한 화면에서 확인합니다.
                </p>

                <p className="mt-1 text-xs text-white/70">현재 userId: {userId}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
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
                {page?.miniHome?.cat?.catName ?? "고냥이"}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                타입 {page?.miniHome?.cat?.characterType ?? "BASIC"}
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
        </div>

        {err ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {err}
          </div>
        ) : null}

        <Card title="요약">
          <SummaryCards items={summary} />
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="고냥이">
            <GoCatCard
              catName={page?.miniHome?.cat?.catName ?? "고냥이"}
              catType={page?.miniHome?.cat?.characterType ?? "-"}
              isPublic={Boolean(page?.miniHome?.isPublic)}
              equipBySlot={equipBySlot}
              onOpenDecoration={() => setDecorateOpen(true)}
            />
          </Card>

          <Card title="활동 기록(최근 30개)">
            <ActivityHistory activities={page?.activities ?? []} />
          </Card>
        </div>

        <Card title="나만의 갤러리">
          <GallerySection galleries={page?.galleries ?? []} />
        </Card>

        <DecorationModal
          open={decorateOpen}
          saving={saving}
          saveInfo={saveInfo}
          slot={slot}
          setSlot={setSlot}
          draft={draft}
          setDraft={setDraft}
          items={itemsForSlot}
          usingMock={usingMock}
          onClose={() => setDecorateOpen(false)}
          onSave={saveDecoration}
          Preview={<GoCatPreview />}
        />
      </div>
    </div>
  );
}