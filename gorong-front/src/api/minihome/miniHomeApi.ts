import axiosInstance from "../axiosInstance";
import type { ActivityItem, GalleryImageItem, GalleryItem, MiniHome, MiniHomePage } from "../../types/minihome/minihome";
import { getAuth } from "firebase/auth";

async function getFirebaseIdTokenOrThrow(): Promise<string> {
  const user = getAuth().currentUser;
  if (!user || typeof (user as any).getIdToken !== "function") {
    throw new Error("AUTH_REQUIRED");
  }
  return user.getIdToken();
}

export async function getMiniHomePage(userId: number): Promise<MiniHomePage> {
  const token = await getFirebaseIdTokenOrThrow();
  const res = await axiosInstance.get(`/minihomes/${userId}/page`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function createMiniHome(userId: number): Promise<MiniHome> {
  const token = await getFirebaseIdTokenOrThrow();
  const res = await axiosInstance.post(
    `/minihomes/${userId}`,
    undefined,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

export async function createActivity(
  userId: number,
  payload: { activityType: string; referenceId?: number; temperatureChange?: number }
): Promise<ActivityItem> {
  const token = await getFirebaseIdTokenOrThrow();
  const res = await axiosInstance.post(`/minihomes/${userId}/activities`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function createGallery(userId: number, payload: { title: string; description?: string }): Promise<GalleryItem> {
  const token = await getFirebaseIdTokenOrThrow();
  const res = await axiosInstance.post(`/minihomes/${userId}/galleries`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function addGalleryImage(
  galleryId: number,
  payload: { imageUrl: string; locationName?: string; takenAt?: string }
): Promise<GalleryImageItem> {
  const token = await getFirebaseIdTokenOrThrow();
  const res = await axiosInstance.post(`/minihomes/galleries/${galleryId}/images`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

