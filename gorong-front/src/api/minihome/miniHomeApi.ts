import axiosInstance from "../axiosInstance";
import type { ActivityItem, GalleryImageItem, GalleryItem, MiniHome, MiniHomePage } from "../../types/minihome/minihome";

export async function getMiniHomePage(userId: number): Promise<MiniHomePage> {
  const res = await axiosInstance.get(`/minihomes/${userId}/page`);
  return res.data;
}

export async function createMiniHome(userId: number): Promise<MiniHome> {
  const res = await axiosInstance.post(`/minihomes/${userId}`);
  return res.data;
}

export async function createActivity(
  userId: number,
  payload: { activityType: string; referenceId?: number; temperatureChange?: number }
): Promise<ActivityItem> {
  const res = await axiosInstance.post(`/minihomes/${userId}/activities`, payload);
  return res.data;
}

export async function createGallery(userId: number, payload: { title: string; description?: string }): Promise<GalleryItem> {
  const res = await axiosInstance.post(`/minihomes/${userId}/galleries`, payload);
  return res.data;
}

export async function addGalleryImage(
  galleryId: number,
  payload: { imageUrl: string; locationName?: string; takenAt?: string }
): Promise<GalleryImageItem> {
  const res = await axiosInstance.post(`/minihomes/galleries/${galleryId}/images`, payload);
  return res.data;
}

