import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useMiniHomeUserId } from "./hooks/useMiniHomeUserId";

function fmt(iso?: string | null) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

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
  const { isLoading: authLoading } = useAuth();
  const { userId, displayName, firebaseUser } = useMiniHomeUserId();
  const navigate = useNavigate();

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
      if (e?.message === "AUTH_REQUIRED") {
        setErr("로그인이 필요합니다.");
        navigate("/login");
        return;
      }

      const status = e?.response?.status;

      if (status === 404) {
        try {
          await createMiniHome(userId);
          const data = await getMiniHomePage(userId);
          setPage(data);
          setNoMiniHome(false);
        } catch (createErr: any) {
          setNoMiniHome(true);
          setPage(null);
          setErr(에러메시지(createErr));
        }
      } else {
        setErr(에러메시지(e));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;

    if (!firebaseUser) {
      setErr("로그인이 필요합니다.");
      return;
    }

    setPage(null);
    setErr(null);
    setNoMiniHome(false);
    load();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, firebaseUser?.uid, firebaseUser?.email, userId]);

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
      await addGalleryImage(galleryId, {
        imageUrl,
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

  const activityCount = page?.activities?.length ?? 0;
  const galleryCount = page?.galleries?.length ?? 0;
  const equipCount = page?.activeEquips?.length ?? 0;

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
              {displayName}님의 활동, 갤러리, 고냥이 상태를 한 공간에서 확인합니다.
            </p>
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
              <div className="text-[11px] font-bold text-slate-500">현재 userId</div>
              <input
                className="w-32 bg-transparent text-sm font-semibold outline-none"
                value={userId}
                readOnly
              />
            </div>

            <button
              className="rounded-2xl bg-orange-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-orange-700 disabled:opacity-50"
              onClick={load}
              disabled={loading}
            >
              {loading ? "조회 중..." : "조회"}
            </button>
          </div>
        </div>

        {err ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {err}
          </div>
        ) : null}

        {noMiniHome ? (
          <div className="rounded-3xl border border-orange-200 bg-white p-6 shadow-sm">
            <div className="text-lg font-extrabold text-slate-900">미니홈피가 없습니다.</div>
            <div className="mt-1 text-sm text-slate-600">
              현재 사용자 기준으로 미니홈피를 생성할 수 있습니다.
            </div>
            <button
              className="mt-4 rounded-2xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50"
              onClick={onCreateMiniHome}
              disabled={loading}
            >
              미니홈피 생성
            </button>
          </div>
        ) : null}

        {page ? (
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
                      타입 {캐릭터타입표시값(cat?.characterType)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-xl bg-white/20 px-4 py-2 text-sm font-bold backdrop-blur hover:bg-white/30 disabled:opacity-50"
                      onClick={() => onAddActivity("REVIEW_WRITTEN")}
                      disabled={loading}
                    >
                      후기 작성
                    </button>
                    <button
                      className="rounded-xl bg-white/20 px-4 py-2 text-sm font-bold backdrop-blur hover:bg-white/30 disabled:opacity-50"
                      onClick={() => onAddActivity("EVENT_PARTICIPATED")}
                      disabled={loading}
                    >
                      행사 참여
                    </button>
                  </div>

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
                  <div className="relative flex h-64 w-64 items-center justify-center rounded-full bg-white/30 p-4 shadow-inner backdrop-blur">
                    <div className="absolute inset-5 rounded-full bg-white/70 shadow-lg" />
                    <div className="relative h-56 w-56 overflow-visible">
                      <RiveCharacter stateMachine="happy" message="미니홈피" />
                    </div>
                  </div>
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
                  <div className="text-lg font-extrabold text-slate-900">캐릭터 상태</div>
                  <p className="mt-1 text-sm text-slate-500">고냥이 성장 정보를 확인합니다.</p>
                  <pre className="mt-4 max-h-72 overflow-auto rounded-2xl bg-slate-50 p-4 text-xs text-slate-700">
                    {JSON.stringify(cat?.appearanceState ?? {}, null, 2)}
                  </pre>
                </div>

                <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
                  <div className="text-lg font-extrabold text-slate-900">장착 아이템</div>
                  <p className="mt-1 text-sm text-slate-500">현재 활성화된 아이템입니다.</p>

                  <div className="mt-4 space-y-3">
                    {(page?.activeEquips ?? []).length === 0 ? (
                      <div className="rounded-2xl bg-orange-50 p-5 text-sm font-semibold text-slate-600">
                        장착 중인 아이템이 없습니다.
                      </div>
                    ) : (
                      (page?.activeEquips ?? []).map((e) => (
                        <div
                          key={e.catEquipId}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-orange-100 p-4"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-extrabold text-slate-900">
                              {e.itemName ?? `itemId=${e.itemId}`}
                            </div>
                            <div className="text-xs text-slate-500">
                              슬롯: {e.slotType} | 장착일: {fmt(e.equippedAt)}
                            </div>
                          </div>
                          {e.imageUrl ? (
                            <img
                              src={e.imageUrl}
                              alt="아이템"
                              className="h-12 w-12 rounded-xl border border-orange-100 object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-xl">
                              🎀
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {selectedTab === "activities" ? (
              <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
                <div className="text-lg font-extrabold text-slate-900">활동 기록</div>
                <p className="mt-1 text-sm text-slate-500">최신순으로 30개까지 표시됩니다.</p>

                <div className="mt-5 divide-y divide-orange-100 overflow-hidden rounded-2xl border border-orange-100">
                  {(page?.activities ?? []).length === 0 ? (
                    <div className="p-5 text-sm font-semibold text-slate-600">활동 기록이 없습니다.</div>
                  ) : (
                    (page?.activities ?? []).map((a) => (
                      <div key={a.activityId} className="bg-white p-4 hover:bg-orange-50">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs font-extrabold text-orange-700">
                              {활동타입표시값(a.activityType)}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">
                              변화량: {a.temperatureChange}
                            </div>
                            <div className="text-xs text-slate-500">
                              참조 ID: {a.referenceId ?? "-"}
                            </div>
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
              <div className="space-y-5">
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

                {(page?.galleries ?? []).length === 0 ? (
                  <div className="rounded-3xl border border-orange-100 bg-orange-50 p-6 text-sm font-semibold text-slate-700">
                    갤러리가 없습니다.
                  </div>
                ) : (
                  (page?.galleries ?? []).map((g) => (
                    <div key={g.galleryId} className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-lg font-extrabold text-slate-900">
                            {g.title ?? `galleryId=${g.galleryId}`}
                          </div>
                          <div className="text-sm text-slate-500">{g.description ?? ""}</div>
                        </div>
                        <button
                          className="rounded-2xl bg-orange-100 px-4 py-3 text-sm font-extrabold text-orange-800 hover:bg-orange-200 disabled:opacity-50"
                          onClick={() => onAddImage(g.galleryId)}
                          disabled={loading}
                        >
                          이미지 추가
                        </button>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {g.images.map((img) => (
                          <div
                            key={img.galleryImageId}
                            className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm"
                          >
                            <img
                              src={img.imageUrl}
                              alt="갤러리 이미지"
                              className="aspect-[4/3] w-full object-cover"
                            />
                            <div className="px-3 py-2 text-[11px] text-slate-600">
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
    </div>
  );
}