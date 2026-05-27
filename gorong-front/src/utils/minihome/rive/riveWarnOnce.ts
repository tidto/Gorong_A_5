const warned = new Set<string>();

/** cat.riv 미구현 입력 경고 — 세션당 1회만 */
export function riveWarnOnce(key: string, message: string) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(message);
}
