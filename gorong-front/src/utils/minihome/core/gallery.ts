import type { GalleryItem } from "../../../types/minihome/minihome";

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

export type GalleryPhotoPreview = {
  galleryImageId: number;
  imageUrl: string;
  galleryTitle: string;
  createAt: string;
};

/** 모든 갤러리에서 최신 사진 N장 (createAt 내림차순) */
export function getRecentGalleryPhotos(
  galleries: GalleryItem[],
  limit = 3
): GalleryPhotoPreview[] {
  const flat = (galleries ?? []).flatMap((gallery) => {
    const title = gallery.title?.trim() || `갤러리 #${gallery.galleryId}`;
    return (gallery.images ?? []).map((img) => ({
      galleryImageId: img.galleryImageId,
      imageUrl: img.imageUrl,
      galleryTitle: title,
      createAt: img.createAt,
    }));
  });

  flat.sort((a, b) => new Date(b.createAt).getTime() - new Date(a.createAt).getTime());
  return flat.slice(0, limit);
}
