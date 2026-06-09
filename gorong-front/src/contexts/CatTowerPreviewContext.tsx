import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { fetchCachedMyUserId } from "../utils/minihome/core/miniHomeMeCache";
import { catTowerUserPath } from "../utils/minihome/cat-tower/catTowerNavigation";

const CatTowerPreviewOverlay = lazy(
  () => import("../components/minihome/cat-tower/CatTowerPreviewOverlay")
);

type CatTowerPreviewContextValue = {
  /** 다른 유저 캣타워 — 미리보기 오버레이 (본인이면 바로 이동) */
  openCatTower: (userId?: number | null) => void;
  /** 미리보기 없이 상세 페이지로 이동 */
  navigateToCatTower: (userId: number) => void;
  closePreview: () => void;
};

const CatTowerPreviewContext = createContext<CatTowerPreviewContextValue | undefined>(
  undefined
);

export function useCatTowerPreview() {
  const ctx = useContext(CatTowerPreviewContext);
  if (!ctx) {
    throw new Error("useCatTowerPreview must be used within CatTowerPreviewProvider");
  }
  return ctx;
}

export function CatTowerPreviewProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [previewUserId, setPreviewUserId] = useState<number | null>(null);
  const myUserIdRef = useRef<number | null>(null);
  const myUserIdPromiseRef = useRef<Promise<number | null> | null>(null);

  const resolveMyUserId = useCallback(async (): Promise<number | null> => {
    if (myUserIdRef.current != null) return myUserIdRef.current;
    if (!myUserIdPromiseRef.current) {
      myUserIdPromiseRef.current = fetchCachedMyUserId()
        .then((id) => {
          if (id != null) myUserIdRef.current = id;
          return id;
        })
        .finally(() => {
          myUserIdPromiseRef.current = null;
        });
    }
    return myUserIdPromiseRef.current;
  }, []);

  const navigateToCatTower = useCallback(
    (userId: number) => {
      const path = catTowerUserPath(userId);
      if (!path) return;
      setPreviewUserId(null);
      navigate(path);
    },
    [navigate]
  );

  const closePreview = useCallback(() => {
    setPreviewUserId(null);
  }, []);

  const openCatTower = useCallback(
    (userId?: number | null) => {
      if (userId == null || !Number.isFinite(userId) || userId <= 0) return;

      void resolveMyUserId().then((myId) => {
        if (myId != null && myId === userId) {
          setPreviewUserId(null);
          navigate("/cattower");
          return;
        }
        setPreviewUserId(Math.trunc(userId));
      });
    },
    [navigate, resolveMyUserId]
  );

  const value = useMemo(
    () => ({ openCatTower, navigateToCatTower, closePreview }),
    [openCatTower, navigateToCatTower, closePreview]
  );

  return (
    <CatTowerPreviewContext.Provider value={value}>
      {children}
      {previewUserId != null ? (
        <Suspense fallback={null}>
          <CatTowerPreviewOverlay
            userId={previewUserId}
            onClose={closePreview}
            onViewDetail={navigateToCatTower}
          />
        </Suspense>
      ) : null}
    </CatTowerPreviewContext.Provider>
  );
}
