/** CatTower 3D 방·고양이 화면 크기/위치 — localStorage 저장 */

export type CatTowerRoomDisplayPrefs = {
  /** px */
  canvasHeightMobile: number;
  canvasHeightDesktop: number;
  catBoxPx: number;
  catDisplayScale: number;
  sceneScale: number;
  cameraY: number;
  cameraZ: number;
  cameraFov: number;
  orbitMinDistance: number;
  orbitMaxDistance: number;
  /** 0~1 — 방 안 고양이 가로 위치 (0.5 = 가운데) */
  catAnchorX: number;
  catAnchorY: number;
};

export const DEFAULT_CAT_TOWER_ROOM_DISPLAY: CatTowerRoomDisplayPrefs = {
  canvasHeightMobile: 460,
  canvasHeightDesktop: 560,
  catBoxPx: 228,
  catDisplayScale: 1.28,
  sceneScale: 1.14,
  cameraY: 3.35,
  cameraZ: 5.5,
  cameraFov: 46,
  orbitMinDistance: 3.8,
  orbitMaxDistance: 9,
  catAnchorX: 0.5,
  catAnchorY: 0.1,
};

const STORAGE_KEY = "gorong-cattower-room-display-v4";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function normalize(raw: Partial<CatTowerRoomDisplayPrefs>): CatTowerRoomDisplayPrefs {
  const d = DEFAULT_CAT_TOWER_ROOM_DISPLAY;
  return {
    canvasHeightMobile: clamp(Number(raw.canvasHeightMobile ?? d.canvasHeightMobile), 280, 640),
    canvasHeightDesktop: clamp(Number(raw.canvasHeightDesktop ?? d.canvasHeightDesktop), 320, 720),
    catBoxPx: clamp(Number(raw.catBoxPx ?? d.catBoxPx), 120, 380),
    catDisplayScale: clamp(Number(raw.catDisplayScale ?? d.catDisplayScale), 0.85, 1.65),
    sceneScale: clamp(Number(raw.sceneScale ?? d.sceneScale), 0.9, 1.5),
    cameraY: clamp(Number(raw.cameraY ?? d.cameraY), 2.2, 5),
    cameraZ: clamp(Number(raw.cameraZ ?? d.cameraZ), 3.5, 9),
    cameraFov: clamp(Number(raw.cameraFov ?? d.cameraFov), 38, 58),
    orbitMinDistance: clamp(Number(raw.orbitMinDistance ?? d.orbitMinDistance), 2.5, 7),
    orbitMaxDistance: clamp(Number(raw.orbitMaxDistance ?? d.orbitMaxDistance), 6, 14),
    catAnchorX: clamp(Number(raw.catAnchorX ?? d.catAnchorX), 0.18, 0.82),
    catAnchorY: clamp(Number(raw.catAnchorY ?? d.catAnchorY), 0.04, 0.22),
  };
}

export function getCatTowerRoomDisplayPrefs(): CatTowerRoomDisplayPrefs {
  if (typeof window === "undefined") return DEFAULT_CAT_TOWER_ROOM_DISPLAY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveCatTowerRoomDisplayPrefs(DEFAULT_CAT_TOWER_ROOM_DISPLAY);
      return DEFAULT_CAT_TOWER_ROOM_DISPLAY;
    }
    return normalize(JSON.parse(raw) as Partial<CatTowerRoomDisplayPrefs>);
  } catch {
    return DEFAULT_CAT_TOWER_ROOM_DISPLAY;
  }
}

export function saveCatTowerRoomDisplayPrefs(
  next: Partial<CatTowerRoomDisplayPrefs>
): CatTowerRoomDisplayPrefs {
  const merged = normalize({ ...getCatTowerRoomDisplayPrefs(), ...next });
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  }
  return merged;
}

export function resetCatTowerRoomDisplayPrefs(): CatTowerRoomDisplayPrefs {
  return saveCatTowerRoomDisplayPrefs(DEFAULT_CAT_TOWER_ROOM_DISPLAY);
}
