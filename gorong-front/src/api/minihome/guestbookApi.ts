import axiosInstance from "../axiosInstance";

export type GuestbookEntry = {
  guestbookId: number;
  roomOwnerUserId: number;
  authorUserId: number;
  authorNickname: string;
  authorProfileImageUrl: string | null;
  content: string;
  parentGuestbookId: number | null;
  createAt: string;
};

export async function fetchGuestbooks(roomOwnerId: number): Promise<GuestbookEntry[]> {
  const res = await axiosInstance.get<GuestbookEntry[]>(`/guestbook/${roomOwnerId}`);
  return res.data ?? [];
}

export async function createGuestbook(
  roomOwnerId: number,
  content: string
): Promise<GuestbookEntry> {
  const res = await axiosInstance.post<GuestbookEntry>("/guestbook", {
    roomOwnerId,
    content,
  });
  return res.data;
}

export async function deleteGuestbook(guestbookId: number): Promise<void> {
  await axiosInstance.delete(`/guestbook/${guestbookId}`);
}
