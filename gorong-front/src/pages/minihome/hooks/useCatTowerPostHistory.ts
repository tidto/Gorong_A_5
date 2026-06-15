import { useCallback, useEffect, useState } from "react";
import {
  getUserPostHistory,
  type PostHistoryCategory,
  type UserPostHistoryPage,
} from "../../../api/minihome/miniHomeApi";
import { mapMiniHomeApiError } from "../../../utils/minihome/core/minihomeApiError";

const PREVIEW_SIZE = 6;
const MODAL_PAGE_SIZE = 10;

type Options = {
  roomOwnerId: number | null | undefined;
  enabled?: boolean;
  refreshToken?: number;
};

export function useCatTowerPostHistory({
  roomOwnerId,
  enabled = true,
  refreshToken = 0,
}: Options) {
  const [preview, setPreview] = useState<UserPostHistoryPage | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [modalData, setModalData] = useState<UserPostHistoryPage | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [category, setCategory] = useState<PostHistoryCategory>("ALL");
  const [page, setPage] = useState(0);

  const loadPreview = useCallback(async () => {
    if (roomOwnerId == null) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const data = await getUserPostHistory(roomOwnerId, {
        category: "ALL",
        page: 0,
        size: PREVIEW_SIZE,
      });
      setPreview(data);
    } catch (e: unknown) {
      setPreview(null);
      setPreviewError(mapMiniHomeApiError(e, "작성 글 목록을 불러오지 못했습니다."));
    } finally {
      setPreviewLoading(false);
    }
  }, [roomOwnerId]);

  const loadModalPage = useCallback(
    async (nextCategory: PostHistoryCategory, nextPage: number) => {
      if (roomOwnerId == null) return;
      setModalLoading(true);
      setModalError(null);
      try {
        const data = await getUserPostHistory(roomOwnerId, {
          category: nextCategory,
          page: nextPage,
          size: MODAL_PAGE_SIZE,
        });
        setModalData(data);
      } catch (e: unknown) {
        setModalData(null);
        setModalError(mapMiniHomeApiError(e, "작성 글 목록을 불러오지 못했습니다."));
      } finally {
        setModalLoading(false);
      }
    },
    [roomOwnerId]
  );

  useEffect(() => {
    if (!enabled || roomOwnerId == null) return;

    let cancelled = false;
    const run = () => {
      if (!cancelled) void loadPreview();
    };

    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(run, { timeout: 1800 });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    }

    const id = window.setTimeout(run, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [enabled, roomOwnerId, loadPreview, refreshToken]);

  const openModal = useCallback(() => {
    setCategory("ALL");
    setPage(0);
    void loadModalPage("ALL", 0);
  }, [loadModalPage]);

  const changeCategory = useCallback(
    (next: PostHistoryCategory) => {
      setCategory(next);
      setPage(0);
      void loadModalPage(next, 0);
    },
    [loadModalPage]
  );

  const changePage = useCallback(
    (nextPage: number) => {
      setPage(nextPage);
      void loadModalPage(category, nextPage);
    },
    [category, loadModalPage]
  );

  const reviewCount = preview?.reviewCount ?? modalData?.reviewCount ?? 0;
  const recruitmentCount = preview?.recruitmentCount ?? modalData?.recruitmentCount ?? 0;
  const totalPostCount = reviewCount + recruitmentCount;

  return {
    previewItems: preview?.content ?? [],
    previewLoading,
    previewError,
    totalPostCount,
    reviewCount,
    recruitmentCount,
    openModal,
    modalCategory: category,
    setModalCategory: changeCategory,
    modalPage: page,
    setModalPage: changePage,
    modalItems: modalData?.content ?? [],
    modalTotalPages: modalData?.totalPages ?? 0,
    modalTotalElements: modalData?.totalElements ?? 0,
    modalLast: modalData?.last ?? true,
    modalLoading,
    modalError,
    modalReviewCount: modalData?.reviewCount ?? reviewCount,
    modalRecruitmentCount: modalData?.recruitmentCount ?? recruitmentCount,
  };
}
