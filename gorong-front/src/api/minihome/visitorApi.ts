import axiosInstance from "../axiosInstance";

export type VisitorStats = {
  todayCount: number;
  totalCount: number;
};

export async function fetchVisitorStats(roomOwnerId: number): Promise<VisitorStats> {
  const res = await axiosInstance.get<VisitorStats>(`/cattower/${roomOwnerId}/visitors/stats`);
  return res.data;
}

export async function recordCatTowerVisit(roomOwnerId: number): Promise<VisitorStats> {
  const res = await axiosInstance.post<VisitorStats>(`/cattower/${roomOwnerId}/visitors`);
  return res.data;
}
