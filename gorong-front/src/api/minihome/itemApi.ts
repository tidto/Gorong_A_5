import axiosInstance from "../axiosInstance";
import type { Equipment, UserItem } from "../../types/minihome/item";
import { getAuth } from "firebase/auth";

async function getFirebaseIdTokenOrThrow(): Promise<string> {
  const user = getAuth().currentUser;
  if (!user || typeof (user as any).getIdToken !== "function") {
    throw new Error("AUTH_REQUIRED");
  }
  return user.getIdToken();
}

export async function getUserItems(userId: number): Promise<UserItem[]> {
  const token = await getFirebaseIdTokenOrThrow();
  const res = await axiosInstance.get(`/minihomes/${userId}/items`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function getEquipments(userId: number): Promise<Equipment[]> {
  const token = await getFirebaseIdTokenOrThrow();
  const res = await axiosInstance.get(`/minihomes/${userId}/equipments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function equipItem(userId: number, payload: { itemId: number; slotType: string }): Promise<Equipment> {
  const token = await getFirebaseIdTokenOrThrow();
  const res = await axiosInstance.post(`/minihomes/${userId}/equip`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function unequipSlot(userId: number, slotType: string): Promise<void> {
  const token = await getFirebaseIdTokenOrThrow();
  await axiosInstance.delete(`/minihomes/${userId}/equip/${slotType}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

