import React, { useMemo } from "react";
import type { GalleryItem } from "../../types/minihome/minihome";

function fmt(iso?: string | null) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function GallerySection({ galleries }: { galleries: GalleryItem[] }) {
  const images = useMemo(() => (galleries ?? []).flatMap((g) => g.images ?? []).slice(0, 12), [galleries]);

  if (!galleries || galleries.length === 0) {
    return <div className="text-center py-8 text-gray-500">갤러리가 없습니다.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((img) => (
          <div key={img.galleryImageId} className="overflow-hidden rounded-3xl bg-gray-100 shadow-sm border border-gray-200">
            <img src={img.imageUrl} alt="갤러리 이미지" className="w-full h-40 object-cover" />
            <div className="p-3 border-t border-gray-200 bg-white">
              <p className="text-xs text-gray-500 truncate">
                {img.locationName ?? "-"} | {fmt(img.takenAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

