import { useState } from "react";

// ─── 샘플 데이터 ───────────────────────────────────────────────
const SAMPLE_REVIEWS = [
  {
    id: 1,
    nickname: "행복한고양이",
    initial: "행",
    date: "2024-04-15",
    score: 5,
    content: "정말 좋은 행사였어요! Go냥이와 함께해서 더 즐거웠습니다.",
    images: ["https://via.placeholder.com/200x150?text=Review+1"],
    catName: "나비",
    likes: 12,
    verified: true,
  },
  {
    id: 2,
    nickname: "스포츠러버",
    initial: "스",
    date: "2024-04-12",
    score: 4,
    content: "시설이 깔끔하고 참가자들이 친절했어요.",
    images: [],
    catName: "모카",
    likes: 5,
    verified: true,
  },
  {
    id: 3,
    nickname: "요가초보",
    initial: "요",
    date: "2024-04-10",
    score: 5,
    content: "초보자도 쉽게 따라할 수 있었어요. 추천합니다!",
    images: ["https://via.placeholder.com/200x150?text=Review+2"],
    catName: "하루",
    likes: 31,
    verified: true,
  },
];

// ─── 젤리(육구) 별점 컴포넌트 (0.5 단위) ──────────────────────
function JellyStars({ score, size = "sm", interactive = false, onChange }) {
  const [hover, setHover] = useState(0);
  const sizeClass = size === "lg" ? "text-2xl" : "text-sm";
  const pixelSize = size === "lg" ? 32 : 16;
  const active = interactive ? (hover || score) : score;

  // 각 발바닥을 full / half / empty 로 렌더링
  const PawIcon = ({ index }) => {
    const full = active >= index;
    const half = !full && active >= index - 0.5;

    if (!interactive) {
      // 표시 전용: SVG clip으로 반쪽 채우기
      const clipId = `clip-${index}-${size}`;
      return (
        <svg width={pixelSize} height={pixelSize} viewBox="0 0 32 32" style={{ flexShrink: 0 }}>
          {half && (
            <defs>
              <clipPath id={clipId}>
                <rect x="0" y="0" width="16" height="32" />
              </clipPath>
            </defs>
          )}
          {/* 빈 발바닥 (회색) */}
          <g fill="#D1D5DB">
            <ellipse cx="16" cy="20" rx="8" ry="7" />
            <ellipse cx="9" cy="13" rx="3.2" ry="4" />
            <ellipse cx="23" cy="13" rx="3.2" ry="4" />
            <ellipse cx="13" cy="10" rx="2.5" ry="3.2" />
            <ellipse cx="19" cy="10" rx="2.5" ry="3.2" />
          </g>
          {/* 채운 발바닥 */}
          {(full || half) && (
            <g fill="#D97706" clipPath={half ? `url(#${clipId})` : undefined}>
              <ellipse cx="16" cy="20" rx="8" ry="7" />
              <ellipse cx="9" cy="13" rx="3.2" ry="4" />
              <ellipse cx="23" cy="13" rx="3.2" ry="4" />
              <ellipse cx="13" cy="10" rx="2.5" ry="3.2" />
              <ellipse cx="19" cy="10" rx="2.5" ry="3.2" />
            </g>
          )}
        </svg>
      );
    }

    // 인터랙티브: 발바닥 하나를 왼/오른쪽 두 영역으로 나눠 감지
    return (
      <div style={{ position: "relative", width: pixelSize, height: pixelSize, flexShrink: 0 }}>
        <svg width={pixelSize} height={pixelSize} viewBox="0 0 32 32">
          <g fill="#D1D5DB">
            <ellipse cx="16" cy="20" rx="8" ry="7" />
            <ellipse cx="9" cy="13" rx="3.2" ry="4" />
            <ellipse cx="23" cy="13" rx="3.2" ry="4" />
            <ellipse cx="13" cy="10" rx="2.5" ry="3.2" />
            <ellipse cx="19" cy="10" rx="2.5" ry="3.2" />
          </g>
          {(full || half) && (
            <>
              {half && (
                <defs>
                  <clipPath id={`hi-${index}`}>
                    <rect x="0" y="0" width="16" height="32" />
                  </clipPath>
                </defs>
              )}
              <g fill="#D97706" clipPath={half ? `url(#hi-${index})` : undefined}>
                <ellipse cx="16" cy="20" rx="8" ry="7" />
                <ellipse cx="9" cy="13" rx="3.2" ry="4" />
                <ellipse cx="23" cy="13" rx="3.2" ry="4" />
                <ellipse cx="13" cy="10" rx="2.5" ry="3.2" />
                <ellipse cx="19" cy="10" rx="2.5" ry="3.2" />
              </g>
            </>
          )}
        </svg>
        {/* 왼쪽 절반 → index - 0.5 */}
        <div
          style={{ position: "absolute", top: 0, left: 0, width: "50%", height: "100%", cursor: "pointer" }}
          onMouseEnter={() => setHover(index - 0.5)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange?.(index - 0.5)}
        />
        {/* 오른쪽 절반 → index */}
        <div
          style={{ position: "absolute", top: 0, right: 0, width: "50%", height: "100%", cursor: "pointer" }}
          onMouseEnter={() => setHover(index)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange?.(index)}
        />
      </div>
    );
  };

  return (
    <div style={{ display: "flex", gap: size === "lg" ? 6 : 3, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((i) => <PawIcon key={i} index={i} />)}
      {interactive && (
        <span style={{ fontSize: 13, color: "#D97706", marginLeft: 6, minWidth: 24 }}>
          {(hover || score) > 0 ? `${hover || score}` : ""}
        </span>
      )}
    </div>
  );
}

// ─── 별점 분포 컴포넌트 ────────────────────────────────────────
function ScoreDistribution({ reviews }) {
  const total = reviews.length;
  const dist = [5, 4, 3, 2, 1].map((s) => ({
    score: s,
    count: reviews.filter((r) => r.score === s).length,
  }));

  return (
    <div className="space-y-2">
      {dist.map(({ score, count }) => (
        <div key={score} className="flex items-center gap-3">
          <span className="text-sm w-10">{score}젤리</span>
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-500 h-2 rounded-full transition-all duration-500"
              style={{ width: total ? `${(count / total) * 100}%` : "0%" }}
            />
          </div>
          <span className="text-sm text-gray-600 w-6 text-right">{count}</span>
        </div>
      ))}
    </div>
  );
}

// ─── 리뷰 카드 컴포넌트 ────────────────────────────────────────
function ReviewCard({ review, onLike, onReport }) {
  const [liked, setLiked] = useState(false);

  const handleLike = () => {
    setLiked((prev) => !prev);
    onLike?.(review.id, !liked);
  };

  return (
    <div className="card cursor-pointer hover:shadow-md transition-shadow">
      <div className="space-y-4">
        {/* 작성자 정보 */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center relative">
              <span className="text-sm font-semibold text-primary-700">
                {review.initial}
              </span>
              {review.verified && (
                <span className="absolute -bottom-1 -right-1 text-xs">🐾</span>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{review.nickname}</p>
              <p className="text-xs text-primary-500">{review.catName} 고냥이</p>
              <p className="text-sm text-gray-500">{review.date}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <JellyStars score={review.score} />
            <button
              className="text-gray-400 hover:text-red-500 p-1 transition-colors"
              onClick={() => onReport?.(review.id)}
              title="신고"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" x2="4" y1="22" y2="15" />
              </svg>
            </button>
          </div>
        </div>

        {/* 본문 */}
        <p className="text-gray-700">{review.content}</p>

        {/* 이미지 */}
        {review.images.length > 0 && (
          <div className="flex gap-2 overflow-x-auto">
            {review.images.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`리뷰 이미지 ${i + 1}`}
                className="w-32 h-24 object-cover rounded-lg flex-shrink-0"
              />
            ))}
          </div>
        )}

        {/* 좋아요 */}
        <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
          <button
            className={`flex items-center gap-1.5 text-sm transition-colors ${
              liked ? "text-primary-600" : "text-gray-400 hover:text-primary-500"
            }`}
            onClick={handleLike}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={liked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span>{review.likes + (liked ? 1 : 0)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 리뷰 작성 모달 ────────────────────────────────────────────
function WriteModal({ isOpen, onClose, onSubmit }) {
  const [score, setScore] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const handleSubmit = () => {
    if (!score) return showToast("젤리 점수를 선택해주세요 🐾");
    if (!title.trim()) return showToast("한 줄 평을 입력해주세요");
    onSubmit({ score, title, body });
    setScore(0);
    setTitle("");
    setBody("");
    onClose();
    showToast("펫쿠키 1개를 받았다냥! 🍪");
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center md:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-lg rounded-t-2xl md:rounded-2xl p-6 space-y-4">
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto md:hidden" />
        <h2 className="text-lg font-bold text-gray-900">골골송 남기기 🐾</h2>

        {/* 젤리 점수 */}
        <div>
          <p className="text-sm text-gray-600 mb-2">젤리 점수</p>
          <JellyStars score={score} size="lg" interactive onChange={setScore} />
        </div>

        {/* 한 줄 평 */}
        <input
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 transition-colors"
          placeholder="한 줄 평을 남겨주세요 (최대 50자)"
          maxLength={50}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* 상세 */}
        <textarea
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 transition-colors resize-none h-24"
          placeholder="자세한 후기를 남겨주세요 (선택)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        <button
          type="button"
          className="btn-primary w-full"
          onClick={handleSubmit}
        >
          펫쿠키 받고 제출하기 🍪
        </button>
      </div>

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-5 py-2.5 rounded-full z-[60] whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  );
}

// ─── 메인 ReviewPage 컴포넌트 ──────────────────────────────────
export default function ReviewPage() {
  const [reviews, setReviews] = useState(SAMPLE_REVIEWS);
  const [filter, setFilter] = useState("all"); // all | photo | text
  const [sort, setSort] = useState("latest");   // latest | high | low
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  // 필터 + 정렬 적용
  const displayed = reviews
    .filter((r) => {
      if (filter === "photo") return r.images.length > 0;
      if (filter === "text") return r.images.length === 0;
      return true;
    })
    .sort((a, b) => {
      if (sort === "high") return b.score - a.score;
      if (sort === "low") return a.score - b.score;
      return new Date(b.date) - new Date(a.date); // latest
    });

  const avgScore =
    reviews.length
      ? (reviews.reduce((s, r) => s + r.score, 0) / reviews.length).toFixed(1)
      : "0.0";

  const handleSubmit = ({ score, title, body }) => {
    const newReview = {
      id: Date.now(),
      nickname: "나",
      initial: "나",
      date: new Date().toISOString().split("T")[0],
      score,
      content: body ? `${title}\n${body}` : title,
      images: [],
      catName: "뭉치",
      likes: 0,
      verified: true,
    };
    setReviews((prev) => [newReview, ...prev]);
    showToast("펫쿠키 1개를 받았다냥! 🍪");
  };

  const handleReport = () => showToast("신고가 접수되었습니다.");

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

      {/* 헤더 */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">💬 리뷰</h1>
          <p className="text-gray-600 mt-2">행사 참여자들의 솔직한 후기</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setModalOpen(true)}
        >
          리뷰 작성
        </button>
      </div>

      {/* 요약 카드 2열 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* 평균 젤리 점수 */}
        <div className="card">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold text-gray-900">평균 젤리 점수</h3>
          </div>
          <div className="mt-3 text-center">
            <div className="text-4xl font-bold text-primary-600 mb-2">
              {avgScore}
            </div>
            <div className="flex items-center justify-center gap-1 mb-4">
              <JellyStars score={Math.round(Number(avgScore))} />
            </div>
            <p className="text-sm text-gray-600">{reviews.length}개의 리뷰</p>
          </div>
        </div>

        {/* 점수 분포 */}
        <div className="card">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold text-gray-900">젤리 점수 분포</h3>
          </div>
          <div className="mt-3">
            <ScoreDistribution reviews={reviews} />
          </div>
        </div>
      </div>

      {/* 사진 모아보기 */}
      {reviews.some((r) => r.images.length > 0) && (
        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            📷 사진 모아보기
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {reviews
              .flatMap((r) => r.images)
              .map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`리뷰 사진 ${i + 1}`}
                  className="w-20 h-20 object-cover rounded-xl flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                />
              ))}
          </div>
        </div>
      )}

      {/* 필터 & 정렬 */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "all", label: "전체" },
          { key: "photo", label: "사진 포함" },
          { key: "text", label: "텍스트만" },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === key
                ? "bg-primary-500 text-white border-primary-500"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
        <select
          className="ml-auto border border-gray-200 rounded-full px-4 py-1.5 text-sm text-gray-600 bg-white cursor-pointer focus:outline-none focus:border-primary-400"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="latest">최신순</option>
          <option value="high">별점 높은순</option>
          <option value="low">별점 낮은순</option>
        </select>
      </div>

      {/* 리뷰 목록 */}
      <div className="space-y-4">
        {displayed.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🐾</p>
            <p className="text-sm">해당하는 리뷰가 없습니다.</p>
          </div>
        ) : (
          displayed.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onReport={handleReport}
            />
          ))
        )}
      </div>

      {/* 리뷰 작성 모달 */}
      <WriteModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-5 py-2.5 rounded-full z-50 whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  );
}
