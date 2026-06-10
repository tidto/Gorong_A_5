import { memo } from "react";

/** CatTower 프로필 — 전 사용자 공통 Go냥이 이미지 */
export const GOCAT_PROFILE_IMAGE = "/assets/cat/gocat-profile.png";

type Props = {
  loading?: boolean;
};

function AvatarFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 text-2xl">
      🐱
    </div>
  );
}

function CatTowerProfileAvatar({ loading }: Props) {
  if (loading) {
    return (
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-orange-200/80 shadow-sm">
        <AvatarFallback />
      </div>
    );
  }

  return (
    <div
      className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-orange-200/80 bg-[#fff8e8] shadow-sm"
      aria-label="Go냥이 프로필"
    >
      <img
        src={GOCAT_PROFILE_IMAGE}
        alt="Go냥이"
        className="h-full w-full object-contain"
        draggable={false}
      />
    </div>
  );
}

export default memo(CatTowerProfileAvatar);
