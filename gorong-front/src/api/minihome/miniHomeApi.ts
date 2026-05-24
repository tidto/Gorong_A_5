import axiosInstance from "../axiosInstance";
import type { ActivityItem, GalleryImageItem, GalleryItem, MiniHome, MiniHomePage } from "../../types/minihome/minihome";
import { getAuth } from "firebase/auth";

async function getFirebaseIdTokenOrThrow(): Promise<string> {
  const user = getAuth().currentUser;
  if (!user || typeof (user as { getIdToken?: () => Promise<string> }).getIdToken !== "function") {
    throw new Error("AUTH_REQUIRED");
  }
  return user.getIdToken();
}

function authHeaders(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

/** 로그인 사용자 — 없으면 자동 생성 후 페이지 반환 */
export async function getMyMiniHomePage(): Promise<MiniHomePage> {
  const token = await getFirebaseIdTokenOrThrow();
  console.info('[MiniHome API] getMyMiniHomePage token length=', token.length);
  const res = await axiosInstance.get(`/minihomes/me/page`, authHeaders(token));
  return res.data;
}

export async function getMiniHomePage(userId: number): Promise<MiniHomePage> {
  const token = await getFirebaseIdTokenOrThrow();
  const res = await axiosInstance.get(`/minihomes/${userId}/page`, authHeaders(token));
  return res.data;
}

export async function createMyMiniHome(): Promise<MiniHome> {
  const token = await getFirebaseIdTokenOrThrow();
  const res = await axiosInstance.post(`/minihomes/me`, undefined, authHeaders(token));
  return res.data;
}

export async function createMiniHome(userId: number): Promise<MiniHome> {
  const token = await getFirebaseIdTokenOrThrow();
  const res = await axiosInstance.post(`/minihomes/${userId}`, undefined, authHeaders(token));
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
  const token = await getFirebaseIdTokenOrThrow();
  const res = await axiosInstance.post(`/minihomes/${userId}/activities`, payload, authHeaders(token));
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
  const token = await getFirebaseIdTokenOrThrow();
  const res = await axiosInstance.post(`/minihomes/${userId}/galleries`, payload, authHeaders(token));
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
} from "./itemApi";

export async function addGalleryImage(
  galleryId: number,
  payload: { imageUrl: string; locationName?: string; takenAt?: string }
): Promise<GalleryImageItem> {
  const token = await getFirebaseIdTokenOrThrow();
  const res = await axiosInstance.post(
    `/minihomes/galleries/${galleryId}/images`,
    payload,
    authHeaders(token)
  );
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
