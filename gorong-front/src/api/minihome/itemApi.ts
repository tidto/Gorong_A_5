import axiosInstance from "../axiosInstance";
import type { Equipment, UserItem } from "../../types/minihome/item";
import type { SlotType } from "../../utils/minihome/gocat/gocatSlots";
import { GOCAT_SLOTS } from "../../utils/minihome/gocat/gocatSlots";
import {
  fetchCachedMyUserItems,
  invalidateUserItemsCache,
} from "../../utils/minihome/core/userItemsCache";
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

export type SlotEquipPayload = {
  slotType: SlotType | string;
  itemId: number | null;
};

export type SaveMyEquipmentsPayload = {
  equipments: SlotEquipPayload[];
};

export function buildEquipmentsPayload(
  slots: Record<SlotType, number | null>
): SaveMyEquipmentsPayload {
  return {
    equipments: GOCAT_SLOTS.map((slotType) => ({
      slotType,
      itemId: slots[slotType],
    })),
  };
}

async function fetchMyUserItemsFromApi(): Promise<UserItem[]> {
  const token = await getFirebaseIdTokenOrThrow();
  const res = await axiosInstance.get(`/minihomes/me/items`, authHeaders(token));
  return res.data;
}

export async function getMyUserItems(): Promise<UserItem[]> {
  return fetchCachedMyUserItems(fetchMyUserItemsFromApi);
}

export async function getUserItems(userId: number): Promise<UserItem[]> {
  const token = await getFirebaseIdTokenOrThrow();
  const res = await axiosInstance.get(`/minihomes/${userId}/items`, authHeaders(token));
  return res.data;
}

export async function getMyEquipments(): Promise<Equipment[]> {
  const token = await getFirebaseIdTokenOrThrow();
  const res = await axiosInstance.get(`/minihomes/me/equipments`, authHeaders(token));
  return res.data;
}

export async function getEquipments(userId: number): Promise<Equipment[]> {
  const token = await getFirebaseIdTokenOrThrow();
  const res = await axiosInstance.get(`/minihomes/${userId}/equipments`, authHeaders(token));
  return res.data;
}

export async function equipItem(
  userId: number,
  payload: { itemId: number; slotType: string }
): Promise<Equipment> {
  const token = await getFirebaseIdTokenOrThrow();
  const res = await axiosInstance.post(`/minihomes/${userId}/equip`, payload, authHeaders(token));
  return res.data;
}

export async function unequipSlot(userId: number, slotType: string): Promise<void> {
  const token = await getFirebaseIdTokenOrThrow();
  await axiosInstance.delete(`/minihomes/${userId}/equip/${slotType}`, authHeaders(token));
}

/** PUT /api/minihomes/me/equipments — DB에 슬롯별 장착 저장 */
export async function saveMyEquipments(payload: SaveMyEquipmentsPayload): Promise<void> {
  const token = await getFirebaseIdTokenOrThrow();
  await axiosInstance.put(`/minihomes/me/equipments`, payload, authHeaders(token));
  invalidateUserItemsCache();
}

export type ItemRewardResponse = {
  granted: boolean;
  itemCode?: string | null;
  itemName?: string | null;
  message?: string | null;
};

export async function grantEventItemReward(payload: {
  eventTitle: string;
  description?: string;
}): Promise<ItemRewardResponse> {
  const token = await getFirebaseIdTokenOrThrow();
  const res = await axiosInstance.post(`/minihomes/me/items/reward`, payload, authHeaders(token));
  return res.data;
}

export async function saveEquipments(
  userId: number,
  payload: SaveMyEquipmentsPayload
): Promise<void> {
  const token = await getFirebaseIdTokenOrThrow();
  await axiosInstance.put(`/minihomes/${userId}/equipments`, payload, authHeaders(token));
}
