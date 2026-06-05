export const MINIHOME_UNLOCKS_SYNC_EVENT = "gorong:minihome-unlocks-sync";

export function notifyMinihomeUnlocksSync(): void {
  window.dispatchEvent(new CustomEvent(MINIHOME_UNLOCKS_SYNC_EVENT));
}
