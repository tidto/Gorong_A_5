import axiosInstance from "../axiosInstance";
import type { Equipment, UserItem } from "../../types/minihome/item";

export async function getUserItems(userId: number): Promise<UserItem[]> {
  const res = await axiosInstance.get(`/minihomes/${userId}/items`);
  return res.data;
}

export async function getEquipments(userId: number): Promise<Equipment[]> {
  const res = await axiosInstance.get(`/minihomes/${userId}/equipments`);
  return res.data;
}

export async function equipItem(userId: number, payload: { itemId: number; slotType: string }): Promise<Equipment> {
  const res = await axiosInstance.post(`/minihomes/${userId}/equip`, payload);
  return res.data;
}

export async function unequipSlot(userId: number, slotType: string): Promise<void> {
  await axiosInstance.delete(`/minihomes/${userId}/equip/${slotType}`);
}

