import { memo } from "react";
import type { GalleryItem } from "../../../types/minihome/minihome";
import LazyImage from "../../common/LazyImage";
import { getRecentGalleryPhotos, type GalleryPhotoPreview } from "../../../utils/minihome/core/gallery";

type CatTowerGalleryPreviewProps = {
  galleries: GalleryItem[];
  totalCount?: number;
  limit?: number;
  onViewAll?: () => void;
};

function PhotoTile({ photo }: { photo: GalleryPhotoPreview }) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl border border-orange-100/80 bg-orange-50 shadow-sm">
      <LazyImage
        src={photo.imageUrl}
        alt={photo.galleryTitle}
        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-2 py-1.5 opacity-0 transition group-hover:opacity-100">
        <p className="truncate text-[9px] font-bold text-white">{photo.galleryTitle}</p>
      </div>
    </div>
  );
}

/** 갤러리 — 최근 사진 N개 미리보기 */
function CatTowerGalleryPreview({
  galleries,
  totalCount,
  limit = 3,
  onViewAll,
}: CatTowerGalleryPreviewProps) {
  const photos = getRecentGalleryPhotos(galleries, limit);
  const total = totalCount ?? galleries.length;
  const hasMore = total > limit || photos.length > limit;

  return (
    <section className="overflow-hidden rounded-2xl border border-sky-100/80 bg-gradient-to-b from-white/90 to-sky-50/25 p-3.5 shadow-[0_2px_14px_rgba(56,189,248,0.08)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[11px] font-extrabold tracking-wide text-sky-900/80">📸 갤러리</p>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-sky-100/80 px-2.5 py-0.5 text-[9px] font-bold text-sky-700/80">
            {total}개
          </span>
          {hasMore && onViewAll ? (
            <button
              type="button"
              onClick={onViewAll}
              className="rounded-full border border-sky-200 bg-white px-2.5 py-0.5 text-[9px] font-bold text-sky-700 transition hover:bg-sky-50"
            >
              전체보기 →
            </button>
          ) : null}
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sky-200/70 bg-white/60 px-4 py-6 text-center">
          <p className="text-xl opacity-50">🖼️</p>
          <p className="mt-1.5 text-[11px] font-bold text-sky-900/60">아직 사진이 없어요</p>
          <p className="mt-0.5 text-[10px] text-slate-500">행사 참여 후 추억을 담아 보세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <PhotoTile key={photo.galleryImageId} photo={photo} />
          ))}
        </div>
      )}
    </section>
  );
}

export default memo(CatTowerGalleryPreview);
