import axiosInstance from "./axiosInstance";

export type EventParticipationType = "SOLO" | "GROUP";

export type EventParticipationRecord = {
  id: number;
  eventContentId: string;
  eventTitle: string;
  groupPostId: number | null;
  groupPostTitle: string | null;
  participationType: EventParticipationType;
  visitDate: string | null;
  appliedAt: string;
};

export async function fetchMyEventParticipations(): Promise<EventParticipationRecord[]> {
  const res = await axiosInstance.get<EventParticipationRecord[]>("/event-participation/me");
  return res.data ?? [];
}
