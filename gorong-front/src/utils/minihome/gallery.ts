import type { GalleryItem } from "../../types/minihome/minihome";

export function formatGalleryDate(iso?: string | null): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** API는 createAt 내림차순 — 최신 N개 갤러리 */
export function getRecentGalleries(galleries: GalleryItem[], limit?: number): GalleryItem[] {
  const list = galleries ?? [];
  if (limit == null || limit <= 0) return list;
  return list.slice(0, limit);
}

export function getGalleryCoverUrl(gallery: GalleryItem): string | null {
  const first = gallery.images?.[0];
  return first?.imageUrl?.trim() ? first.imageUrl : null;
}
