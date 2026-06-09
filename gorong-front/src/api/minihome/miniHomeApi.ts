import axiosInstance from "../axiosInstance";
import type {
  ActivityItem,
  GalleryImageItem,
  GalleryItem,
  GoCat,
  MiniHome,
  MiniHomePage,
} from "../../types/minihome/minihome";
import { getAuth } from "firebase/auth";

async function requireAuthUser() {
  const auth = getAuth();
  if (auth.currentUser?.getIdToken) return auth.currentUser;

  const user = await new Promise<typeof auth.currentUser>((resolve, reject) => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (u) {
        unsub();
        resolve(u);
      }
    });
    window.setTimeout(() => {
      unsub();
      if (auth.currentUser) resolve(auth.currentUser);
      else reject(new Error("AUTH_REQUIRED"));
    }, 3000);
  });

  if (!user?.getIdToken) throw new Error("AUTH_REQUIRED");
  return user;
}

/** 로그인 사용자 — 없으면 자동 생성 후 페이지 반환 */
export async function getMyMiniHomePage(): Promise<MiniHomePage> {
  await requireAuthUser();
  const res = await axiosInstance.get(`/minihomes/me/page`);
  return res.data;
}

export async function getMiniHomePage(userId: number): Promise<MiniHomePage> {
  await requireAuthUser();
  const res = await axiosInstance.get(`/minihomes/${userId}/page`);
  return res.data;
}

export type CatAppearancePayload = {
  bodyType?: string;
  pattern?: string;
  color?: string;
  catName?: string;
  roomBackground?: string;
  headItemCode?: string;
  faceItemCode?: string;
  neckItemCode?: string;
  badgeItemCode?: string;
  /** @deprecated face/neck/badge로 분리 */
  accessoryItemCode?: string;
};

/**
 * Go냥이 외형 저장 — 단일 엔드포인트
 * PATCH /api/minihomes/me/cat/appearance
 */
export async function updateMyCatAppearance(payload: CatAppearancePayload): Promise<GoCat> {
  const user = await requireAuthUser();
  await user.getIdToken(true);

  const path = `/minihomes/me/cat/appearance`;

  const attempt = async (method: "patch" | "put" | "post") => {
    if (method === "patch") return axiosInstance.patch(path, payload);
    if (method === "put") return axiosInstance.put(path, payload);
    return axiosInstance.post(path, payload);
  };

  const methods: Array<"patch" | "put" | "post"> = ["patch", "put", "post"];
  let lastError: unknown;

  for (const method of methods) {
    try {
      const res = await attempt(method);
      return res.data as GoCat;
    } catch (e: unknown) {
      lastError = e;
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 403 || status === 405 || status === 404) continue;
      throw e;
    }
  }

  try {
    const res = await axiosInstance.post(`/minihomes/me`, payload);
    const mini = res.data as MiniHome;
    if (mini?.cat) return mini.cat;
  } catch {
    /* fall through */
  }

  throw lastError;
}

export type GoCatSetupPayload = {
  bodyType: string;
  pattern: string;
  color: string;
  catName?: string;
};

export type MiniHomeSettingsPayload = {
  isPublic?: boolean;
  description?: string;
  themeCode?: string;
};

/** API가 isPublic을 생략하면 undefined — Boolean(undefined)는 false라 UI만 비공개로 보이는 버그 방지 */
export function resolveMiniHomeIsPublic(
  value: boolean | undefined | null,
  fallback = true
): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeMiniHomeResponse(
  data: MiniHome,
  fallbackIsPublic?: boolean
): MiniHome {
  return {
    ...data,
    isPublic: resolveMiniHomeIsPublic(data?.isPublic, fallbackIsPublic),
  };
}

function shouldFallbackMiniHomeUpdate(status: number | undefined): boolean {
  // /me 미배포·서버 오류 시 /{userId} 재시도
  return status === 404 || status === 405 || status === 500;
}

function throwIsPublicSaveFailed(): never {
  const err = new Error("IS_PUBLIC_SAVE_FAILED") as Error & {
    response?: { status?: number; data?: { message?: string } };
  };
  err.response = {
    status: 500,
    data: { message: "공개 설정이 서버에 저장되지 않았습니다. 잠시 후 다시 시도해 주세요." },
  };
  throw err;
}

/** 본인 설정 확인 — GET /me (비공개여도 주인은 항상 조회 가능) */
async function verifyMiniHomeIsPublic(userId: number, expected: boolean): Promise<MiniHome> {
  const res = await axiosInstance.get(`/minihomes/me`);
  const verified = normalizeMiniHomeResponse(res.data as MiniHome);
  if (verified.userId !== userId || verified.isPublic !== expected) {
    throwIsPublicSaveFailed();
  }
  return verified;
}

async function patchOrPutMiniHome(
  path: string,
  userId: number,
  payload: MiniHomeSettingsPayload
): Promise<MiniHome> {
  const methods: Array<"patch" | "put"> = ["patch", "put"];
  let lastError: unknown;

  for (const method of methods) {
    try {
      const res =
        method === "patch"
          ? await axiosInstance.patch(path, payload)
          : await axiosInstance.put(path, payload);
      const updated = normalizeMiniHomeResponse(res.data as MiniHome);

      if (typeof payload.isPublic === "boolean") {
        if (updated.isPublic === payload.isPublic) return updated;
        return verifyMiniHomeIsPublic(userId, payload.isPublic);
      }

      return updated;
    } catch (e: unknown) {
      lastError = e;
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 405) continue;
      throw e;
    }
  }

  throw lastError;
}

/** PATCH — 공개·소개·테마 (/me 우선, 실패 시 /{userId} 폴백) */
export async function updateMyMiniHome(
  userId: number,
  payload: MiniHomeSettingsPayload
): Promise<MiniHome> {
  const user = await requireAuthUser();
  await user.getIdToken(true);

  const paths = [`/minihomes/${userId}`, `/minihomes/me`];
  let lastError: unknown;

  for (const path of paths) {
    try {
      return await patchOrPutMiniHome(path, userId, payload);
    } catch (e: unknown) {
      lastError = e;
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (shouldFallbackMiniHomeUpdate(status)) continue;
      throw e;
    }
  }

  throw lastError;
}

/** 미니홈·Go냥이 최초 생성 (고냥이 없을 때만) */
export async function createMyMiniHome(payload?: GoCatSetupPayload): Promise<MiniHome> {
  await requireAuthUser();
  const res = await axiosInstance.post(`/minihomes/me`, payload ?? undefined);
  return res.data;
}

/** 최초 외형 설정 완료 — PATCH /me/cat/appearance */
export async function completeMyCatSetup(payload: GoCatSetupPayload): Promise<GoCat> {
  return updateMyCatAppearance(payload);
}

export async function createMiniHome(userId: number): Promise<MiniHome> {
  await requireAuthUser();
  const res = await axiosInstance.post(`/minihomes/${userId}`, undefined);
  return res.data;
}

export async function createActivity(
  userId: number,
  payload: {
    activityType: string;
    referenceId?: number;
    temperatureChange?: number;
    title?: string;
    description?: string;
  }
): Promise<ActivityItem> {
  await requireAuthUser();
  const res = await axiosInstance.post(`/minihomes/${userId}/activities`, payload);
  return res.data;
}

export async function getUserActivities(userId: number): Promise<ActivityItem[]> {
  const page = await getMiniHomePage(userId);
  return page.activities ?? [];
}

export async function createGallery(
  userId: number,
  payload: { title: string; description?: string }
): Promise<GalleryItem> {
  await requireAuthUser();
  const res = await axiosInstance.post(`/minihomes/${userId}/galleries`, payload);
  return res.data;
}

export async function getUserGalleries(userId: number): Promise<GalleryItem[]> {
  const page = await getMiniHomePage(userId);
  return page.galleries ?? [];
}

export {
  getMyUserItems,
  getUserItems,
  getMyEquipments,
  getEquipments,
  equipItem,
  unequipSlot,
  saveMyEquipments,
  saveEquipments,
  grantEventItemReward,
} from "./itemApi";

export async function addGalleryImage(
  galleryId: number,
  payload: { imageUrl: string; locationName?: string; takenAt?: string }
): Promise<GalleryImageItem> {
  await requireAuthUser();
  const res = await axiosInstance.post(`/minihomes/galleries/${galleryId}/images`, payload);
  return res.data;
}

/** 리뷰 작성 후 활동·갤러리 연동 */
export async function recordReviewActivity(
  userId: number,
  payload: {
    reviewText: string;
    imageUrl?: string;
    eventId?: number;
    galleryTitle?: string;
  }
): Promise<void> {
  await createActivity(userId, {
    activityType: "REVIEW_WRITTEN",
    referenceId: payload.eventId,
    title: "리뷰 작성",
    description: payload.reviewText,
  });

  if (!payload.imageUrl?.trim()) return;

  const gallery = await createGallery(userId, {
    title: payload.galleryTitle ?? "리뷰 갤러리",
    description: payload.reviewText.slice(0, 200),
  });
  await addGalleryImage(gallery.galleryId, {
    imageUrl: payload.imageUrl.trim(),
    locationName: "리뷰",
    takenAt: new Date().toISOString(),
  });
}
