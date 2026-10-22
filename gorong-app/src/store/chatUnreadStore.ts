import { create } from 'zustand'

interface ChatUnreadState {
  hasNewMessages: boolean
  markNewMessage: () => void
  clearNewMessages: () => void
}

export const useChatUnreadStore = create<ChatUnreadState>((set) => ({
  hasNewMessages: false,
  markNewMessage: () => set({ hasNewMessages: true }),
  clearNewMessages: () => set({ hasNewMessages: false }),
}))
