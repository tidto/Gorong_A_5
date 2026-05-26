import { useMemo } from "react";
import type { GalleryItem } from "../../types/minihome/minihome";
import {
  formatGalleryDate,
  getGalleryCoverUrl,
  getRecentGalleries,
} from "../../utils/minihome/gallery";

export type GallerySectionProps = {
  galleries: GalleryItem[];
  /** 미지정 시 전체 목록 */
  limit?: number;
  /** preview: CatTower 최근 N개 카드 / full: MiniHome 전체 + 이미지 그리드 */
  variant?: "preview" | "full";
  emptyMessage?: string;
  onAddImage?: (galleryId: number) => void;
  addImageDisabled?: boolean;
};

function GalleryEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-orange-100 bg-orange-50 px-6 py-10 text-center">
      <div className="text-3xl">🖼️</div>
      <p className="mt-3 text-sm font-semibold text-slate-600">{message}</p>
      <p className="mt-1 text-xs text-slate-500">행사 사진을 담은 갤러리를 만들어 보세요.</p>
    </div>
  );
}

function GalleryPreviewCard({ gallery }: { gallery: GalleryItem }) {
  const coverUrl = getGalleryCoverUrl(gallery);
  const title = gallery.title?.trim() || `갤러리 #${gallery.galleryId}`;

  return (
    <article className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-sm">
      {coverUrl ? (
        <img src={coverUrl} alt={title} className="aspect-[4/3] w-full object-cover" />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-orange-50 text-sm font-semibold text-slate-500">
          이미지 없음
        </div>
      )}
      <div className="border-t border-orange-100 p-4">
        <h3 className="truncate text-sm font-extrabold text-slate-900">{title}</h3>
        <p className="mt-1 text-xs text-slate-500">생성일 {formatGalleryDate(gallery.createAt)}</p>
        {gallery.images.length > 0 ? (
          <p className="mt-1 truncate text-[11px] text-slate-400">{gallery.images[0].imageUrl}</p>
        ) : null}
      </div>
    </article>
  );
}

function GalleryFullBlock({
  gallery,
  onAddImage,
  addImageDisabled,
}: {
  gallery: GalleryItem;
  onAddImage?: (galleryId: number) => void;
  addImageDisabled?: boolean;
}) {
  const title = gallery.title?.trim() || `갤러리 #${gallery.galleryId}`;

  return (
    <article className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-extrabold text-slate-900">{title}</h3>
          {gallery.description ? (
            <p className="mt-1 text-sm text-slate-500">{gallery.description}</p>
          ) : null}
          <p className="mt-2 text-xs text-slate-500">생성일 {formatGalleryDate(gallery.createAt)}</p>
        </div>
        {onAddImage ? (
          <button
            type="button"
            className="shrink-0 rounded-2xl bg-orange-100 px-4 py-3 text-sm font-extrabold text-orange-800 hover:bg-orange-200 disabled:opacity-50"
            onClick={() => onAddImage(gallery.galleryId)}
            disabled={addImageDisabled}
          >
            이미지 추가
          </button>
        ) : null}
      </div>

      {gallery.images.length === 0 ? (
        <div className="mt-5 rounded-2xl bg-orange-50 p-5 text-center text-sm font-semibold text-slate-600">
          등록된 이미지가 없습니다.
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {gallery.images.map((img) => (
            <div
              key={img.galleryImageId}
              className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm"
            >
              <img
                src={img.imageUrl}
                alt={title}
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="space-y-1 px-3 py-2">
                <p className="truncate text-[11px] font-semibold text-slate-700">{img.imageUrl}</p>
                <p className="text-[11px] text-slate-500">
                  생성일 {formatGalleryDate(img.createAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export default function GallerySection({
  galleries,
  limit,
  variant = "preview",
  emptyMessage = "갤러리가 없습니다.",
  onAddImage,
  addImageDisabled = false,
}: GallerySectionProps) {
  const visible = useMemo(
    () => getRecentGalleries(galleries ?? [], limit),
    [galleries, limit]
  );

  if (!visible.length) {
    return <GalleryEmpty message={emptyMessage} />;
  }

  if (variant === "full") {
    return (
      <div className="space-y-5">
        {visible.map((g) => (
          <GalleryFullBlock
            key={g.galleryId}
            gallery={g}
            onAddImage={onAddImage}
            addImageDisabled={addImageDisabled}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((g) => (
        <GalleryPreviewCard key={g.galleryId} gallery={g} />
      ))}
    </div>
  );
}
