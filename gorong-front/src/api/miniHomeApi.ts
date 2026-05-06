import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export interface GoCat {
  goCatId: number;
  catName: string;
  characterType: string;
  appearanceState: string;
}

export interface MiniHome {
  miniHomeId: number;
  userId: number;
  description: string;
  themeCode: string;
  isPublic: boolean;
  cat: GoCat;
}

export const getMiniHome = async (userId: number): Promise<MiniHome> => {
  const res = await axios.get(`${API_BASE_URL}/api/minihomes/${userId}`);
  return res.data;
};

export const createMiniHome = async (userId: number): Promise<MiniHome> => {
  const res = await axios.post(`${API_BASE_URL}/api/minihomes/${userId}`);
  return res.data;
};
