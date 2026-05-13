import React, { useEffect, useMemo, useState } from "react";
import RiveCharacter from "../../components/RiveCharacter";
import {
  addGalleryImage,
  createActivity,
  createGallery,
  createMiniHome,
  getMiniHomePage,
} from "../../api/minihome/miniHomeApi";
import type { ActivityItem, MiniHomePage } from "../../types/minihome/minihome";
import { useAuth } from "../../contexts/AuthContext";

function intOr(v: string, fallback: number) {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function fmt(iso?: string | null) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

// 기존 동작/레이아웃 유지 목적: 이 파일은 이전 MiniHome.tsx 로직을 그대로 옮긴 것입니다.
function 캐릭터타입표시값(code?: string | null) {
  const t = (code ?? "BASIC").toUpperCase();
  if (t === "BASIC") return "기본";
  if (t === "TEEN") return "성장 1";
  if (t === "ADULT") return "성장 2";
  if (t === "MASTER") return "마스터";
  return t;
}

function 활동타입표시값(code?: string | null) {
  const t = (code ?? "").toUpperCase();
  if (t === "REVIEW_WRITTEN") return "후기 작성";
  if (t === "EVENT_PARTICIPATED") return "행사 참여";
  return code ?? "-";
}

function 에러메시지(e: any) {
  const msg = e?.response?.data?.message;
  if (typeof msg === "string" && msg.trim()) return msg;
  if (typeof e?.message === "string" && e.message.trim()) return e.message;
  return "요청 처리 중 오류가 발생했습니다.";
}

export default function MiniHome() {
  const { firebaseUser, isLoading: authLoading } = useAuth();
  // 로그인한 사용자의 UID를 숫자로 변환하여 사용 (또는 테스트용으로 직접 입력)
  const [userId, setUserId] = useState<number>(() => {
    if (firebaseUser?.uid) {
      const hashCode = firebaseUser.uid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return Math.abs(hashCode % 1000000) || 1;
    }
    return 1;
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState<MiniHomePage | null>(null);
  const [noMiniHome, setNoMiniHome] = useState(false);

  const [selectedTab, setSelectedTab] = useState<"character" | "activities" | "gallery">("character");

  const [galleryTitle, setGalleryTitle] = useState("나의 갤러리");
  const [galleryDesc, setGalleryDesc] = useState("행사 사진 모음");
  const [imageUrl, setImageUrl] = useState("https://via.placeholder.com/400x300?text=Gorong");
  const todayIso = useMemo(() => new Date().toISOString(), []);

  async function load() {
    setLoading(true);
    setErr(null);
    setNoMiniHome(false);
    try {
      const data = await getMiniHomePage(userId);
      setPage(data);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404) {
        setNoMiniHome(true);
        setPage(null);
      } else {
        setErr(에러메시지(e));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cat = page?.miniHome?.cat ?? null;

  async function onCreateMiniHome() {
    setLoading(true);
    setErr(null);
    try {
      await createMiniHome(userId);
      await load();
    } catch (e: any) {
      setErr(에러메시지(e));
    } finally {
      setLoading(false);
    }
  }

  async function onAddActivity(activityType: ActivityItem["activityType"]) {
    setLoading(true);
    setErr(null);
    try {
      await createActivity(userId, { activityType: activityType ?? "REVIEW_WRITTEN" });
      await load();
    } catch (e: any) {
      setErr(에러메시지(e));
    } finally {
      setLoading(false);
    }
  }

  async function onCreateGallery() {
    setLoading(true);
    setErr(null);
    try {
      await createGallery(userId, { title: galleryTitle, description: galleryDesc });
      await load();
    } catch (e: any) {
      setErr(에러메시지(e));
    } finally {
      setLoading(false);
    }
  }

  async function onAddImage(galleryId: number) {
    setLoading(true);
    setErr(null);
    try {
      await addGalleryImage(galleryId, { imageUrl, locationName: "고롱", takenAt: todayIso });
      await load();
    } catch (e: any) {
      setErr(에러메시지(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-orange-700">미니홈피</h1>
          <p className="text-sm text-slate-600">PostgreSQL 테이블 구조 기반</p>
          {firebaseUser && (
            <p className="text-sm text-orange-600 font-medium mt-2">
              로그인: {firebaseUser.email || firebaseUser.uid}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-col sm:flex-row">
          {authLoading ? (
            <div className="text-sm text-slate-600">인증 확인 중...</div>
          ) : firebaseUser ? (
            <div className="text-sm text-green-600 font-medium">
              ✓ 로그인 완료
            </div>
          ) : (
            <div className="text-sm text-red-600 font-medium">
              ✗ 로그인 필요
            </div>
          )}
          <div className="rounded-lg border border-orange-200 bg-white px-3 py-2">
            <div className="text-[11px] font-semibold text-slate-600">사용자 ID</div>
            <input
              className="w-28 text-sm outline-none"
              value={userId}
              onChange={(e) => setUserId(intOr(e.target.value, 1))}
              inputMode="numeric"
            />
          </div>
          <button
            className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
            onClick={load}
            disabled={loading}
          >
            조회
          </button>
        </div>
      </div>

      {err ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div> : null}

      {noMiniHome ? (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-6 text-slate-800">
          <div className="text-sm font-bold">미니홈피가 없습니다.</div>
          <div className="mt-1 text-sm text-slate-700">실제 DB에 생성되므로, 필요한 경우에만 생성 버튼을 눌러주세요.</div>
          <div className="mt-4">
            <button
              className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
              onClick={onCreateMiniHome}
              disabled={loading}
            >
              미니홈피 생성
            </button>
          </div>
        </div>
      ) : null}

      {page ? (
        <>
          <div className="bg-gradient-to-r from-orange-400 via-amber-400 to-pink-400 rounded-2xl p-8 text-white">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1">
                <h2 className="text-2xl font-extrabold mb-2">{cat?.catName ?? "고냥이"}</h2>
                <p className="text-sm opacity-90 mb-4">타입 {캐릭터타입표시값(cat?.characterType)}</p>

                <div className="flex gap-2">
                  <button
                    className="rounded-md bg-white/20 px-3 py-2 text-sm font-semibold hover:bg-white/30 disabled:opacity-50"
                    onClick={() => onAddActivity("REVIEW_WRITTEN")}
                    disabled={loading}
                  >
                    후기 작성
                  </button>
                  <button
                    className="rounded-md bg-white/20 px-3 py-2 text-sm font-semibold hover:bg-white/30 disabled:opacity-50"
                    onClick={() => onAddActivity("EVENT_PARTICIPATED")}
                    disabled={loading}
                  >
                    행사 참여
                  </button>
                </div>
              </div>

              <div className="flex-1 flex justify-center">
                <RiveCharacter stateMachine="happy" message="미니홈피" />
              </div>
            </div>
          </div>

          <div className="flex gap-4 border-b border-gray-200">
            {[
              { id: "character", label: "캐릭터" },
              { id: "activities", label: "활동" },
              { id: "gallery", label: "갤러리" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTab(t.id as any)}
                className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                  selectedTab === t.id ? "border-orange-500 text-orange-700" : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {selectedTab === "character" ? (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
                <div className="text-sm font-bold text-slate-900">캐릭터 상태(JSONB)</div>
                <pre className="mt-3 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-800">
                  {JSON.stringify(cat?.appearanceState ?? {}, null, 2)}
                </pre>
              </div>
              <div className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
                <div className="text-sm font-bold text-slate-900">장착 아이템(활성)</div>
                <div className="mt-3 space-y-2">
                  {(page?.activeEquips ?? []).length === 0 ? (
                    <div className="text-sm text-slate-600">장착 중인 아이템이 없습니다.</div>
                  ) : (
                    (page?.activeEquips ?? []).map((e) => (
                      <div key={e.catEquipId} className="flex items-center justify-between gap-3 rounded-lg border border-orange-100 p-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">{e.itemName ?? `itemId=${e.itemId}`}</div>
                          <div className="text-xs text-slate-500">
                            슬롯: {e.slotType} | 장착일: {fmt(e.equippedAt)}
                          </div>
                        </div>
                        {e.imageUrl ? <img src={e.imageUrl} alt="아이템" className="h-12 w-12 rounded-md border border-orange-100 object-cover" /> : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {selectedTab === "activities" ? (
            <div className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
              <div className="text-sm font-bold text-slate-900">활동 기록</div>
              <div className="mt-2 text-xs text-slate-500">최신순으로 30개까지 표시됩니다.</div>
              <div className="mt-4 divide-y divide-orange-100 rounded-lg border border-orange-100">
                {(page?.activities ?? []).length === 0 ? (
                  <div className="p-4 text-sm text-slate-600">활동 기록이 없습니다.</div>
                ) : (
                  (page?.activities ?? []).map((a) => (
                    <div key={a.activityId} className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-orange-700">{활동타입표시값(a.activityType)}</div>
                          <div className="text-sm text-slate-900">변화량: {a.temperatureChange}</div>
                          <div className="text-xs text-slate-500">참조 ID: {a.referenceId ?? "-"}</div>
                        </div>
                        <div className="text-xs text-slate-500">{fmt(a.createAt)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}

          {selectedTab === "gallery" ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
                <div className="text-sm font-bold text-slate-900">갤러리 만들기</div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <input
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-300"
                    value={galleryTitle}
                    onChange={(e) => setGalleryTitle(e.target.value)}
                    placeholder="제목"
                  />
                  <input
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-300"
                    value={galleryDesc}
                    onChange={(e) => setGalleryDesc(e.target.value)}
                    placeholder="설명"
                  />
                  <button
                    className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                    onClick={onCreateGallery}
                    disabled={loading}
                  >
                    생성
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
                <div className="text-sm font-bold text-slate-900">이미지 URL 추가</div>
                <div className="mt-3 flex gap-2">
                  <input
                    className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-300"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>

              {(page?.galleries ?? []).length === 0 ? (
                <div className="rounded-xl border border-orange-100 bg-orange-50 p-5 text-sm text-slate-700">갤러리가 없습니다.</div>
              ) : (
                (page?.galleries ?? []).map((g) => (
                  <div key={g.galleryId} className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-900">{g.title ?? `galleryId=${g.galleryId}`}</div>
                        <div className="text-xs text-slate-500">{g.description ?? ""}</div>
                      </div>
                      <button
                        className="rounded-md bg-orange-100 px-3 py-2 text-sm font-semibold text-orange-800 hover:bg-orange-200 disabled:opacity-50"
                        onClick={() => onAddImage(g.galleryId)}
                        disabled={loading}
                      >
                        이미지 추가
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                      {g.images.map((img) => (
                        <div key={img.galleryImageId} className="overflow-hidden rounded-lg border border-orange-100">
                          <img src={img.imageUrl} alt="갤러리 이미지" className="aspect-[4/3] w-full object-cover" />
                          <div className="px-2 py-1 text-[11px] text-slate-600">
                            {img.locationName ?? "-"} | {fmt(img.takenAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

