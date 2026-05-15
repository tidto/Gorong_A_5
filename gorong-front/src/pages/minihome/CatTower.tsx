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
import DecorationModal, { type DecorItem, type SlotType } from "../../components/minihome/DecorationModal";

import { useMiniHomeUserId } from "./hooks/useMiniHomeUserId";
import { createMiniHome, getMiniHomePage } from "../../api/minihome/miniHomeApi";
import { equipItem, getEquipments, getUserItems, unequipSlot } from "../../api/minihome/itemApi";

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
  const [draft, setDraft] = useState<Record<SlotType, DecorItem | null>>({ HEAD: null, BODY: null, ACCESSORY: null });
  const [saving, setSaving] = useState(false);
  const [saveInfo, setSaveInfo] = useState<string | null>(null);

  const equipBySlot = useMemo(() => {
    const map: Record<SlotType, Equipment | null> = { HEAD: null, BODY: null, ACCESSORY: null };
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
      const [owned, equips] = await Promise.all([getUserItems(userId), getEquipments(userId)]);
      setItems(owned);
      setEquipmentsState(equips);

      const byItemId = new Map<number, DecorItem>();
      for (const it of owned) byItemId.set(it.itemId, it);
      setDraft({
        HEAD: equipBySlot.HEAD ? byItemId.get(equipBySlot.HEAD.itemId) ?? null : null,
        BODY: equipBySlot.BODY ? byItemId.get(equipBySlot.BODY.itemId) ?? null : null,
        ACCESSORY: equipBySlot.ACCESSORY ? byItemId.get(equipBySlot.ACCESSORY.itemId) ?? null : null,
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
        if (next == null) await unequipSlot(userId, s);
        else await equipItem(userId, { itemId: next, slotType: s });
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
    { label: "활동 기록", value: page?.stats?.activityCount ?? 0, icon: BarChart3 },
    { label: "갤러리", value: page?.galleries?.length ?? 0, icon: Share2 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">CatTower</h1>
          <p className="text-gray-600 mt-2">{displayName}님의 미니홈피(활동/갤러리/고냥이)를 한 화면에서 확인합니다.</p>
          <p className="text-xs text-gray-400 mt-1">현재 userId: {userId}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate("/events")} disabled={loading || saving}>
            다음 행사 찾기
          </Button>
          <Button variant="secondary" onClick={() => setDecorateOpen(true)} disabled={loading || saving}>
            꾸미기 모드 켜기
          </Button>
          <Button variant="primary" onClick={loadMiniHome} disabled={loading || saving}>
            새로고침
          </Button>
        </div>
      </div>

      {err ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}

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
  );
}

