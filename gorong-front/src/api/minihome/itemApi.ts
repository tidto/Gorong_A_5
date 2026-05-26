import axiosInstance from "../axiosInstance";
import type { Equipment, UserItem } from "../../types/minihome/item";
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

export type SaveMyEquipmentsPayload = {
  headItemId: number | null;
  bodyItemId: number | null;
  accessoryItemId: number | null;
};

export async function getMyUserItems(): Promise<UserItem[]> {
  const token = await getFirebaseIdTokenOrThrow();
  const res = await axiosInstance.get(`/minihomes/me/items`, authHeaders(token));
  return res.data;
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

/** PUT /api/minihomes/me/equipments — DB에 장착 상태 저장 */
export async function saveMyEquipments(payload: SaveMyEquipmentsPayload): Promise<void> {
  const token = await getFirebaseIdTokenOrThrow();
  await axiosInstance.put(
    `/minihomes/me/equipments`,
    {
      headItemId: payload.headItemId,
      bodyItemId: payload.bodyItemId,
      accessoryItemId: payload.accessoryItemId,
    },
    authHeaders(token)
  );
}

export async function saveEquipments(
  userId: number,
  payload: SaveMyEquipmentsPayload
): Promise<void> {
  const token = await getFirebaseIdTokenOrThrow();
  await axiosInstance.put(
    `/minihomes/${userId}/equipments`,
    {
      headItemId: payload.headItemId,
      bodyItemId: payload.bodyItemId,
      accessoryItemId: payload.accessoryItemId,
    },
    authHeaders(token)
  );
}
