import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type {
  PostHistoryCategory,
  UserPostHistoryItem,
} from "../../../api/minihome/miniHomeApi";
import { formatActivityDate } from "../../../utils/minihome/core/activity";

const CATEGORY_TABS: { id: PostHistoryCategory; label: string }[] = [
  { id: "ALL", label: "전체" },
  { id: "REVIEW", label: "리뷰" },
  { id: "RECRUITMENT", label: "모집" },
];

function categoryStyle(category: string, categoryLabel?: string) {
  if (category === "REVIEW") {
    return {
      badge: "bg-sky-100 text-sky-700",
      accent: "border-sky-100/90 from-sky-50/80 to-white",
      emoji: "✍️",
    };
  }
  if (categoryLabel === "참여") {
    return {
      badge: "bg-emerald-100 text-emerald-700",
      accent: "border-emerald-100/90 from-emerald-50/80 to-white",
      emoji: "🤝",
    };
  }
  return {
    badge: "bg-violet-100 text-violet-700",
    accent: "border-violet-100/90 from-violet-50/80 to-white",
    emoji: "📢",
  };
}

type PostHistoryRowProps = {
  item: UserPostHistoryItem;
  index?: number;
  compact?: boolean;
  onNavigate?: (linkPath: string) => void;
};

function PostHistoryRow({ item, index = 0, compact, onNavigate }: PostHistoryRowProps) {
  const style = categoryStyle(item.category, item.categoryLabel);

  const handleClick = () => {
    if (item.linkPath) onNavigate?.(item.linkPath);
  };

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.22 }}
    >
      <button
        type="button"
        onClick={handleClick}
        className={`group flex w-full items-center gap-3 rounded-2xl border bg-gradient-to-r px-3.5 py-2.5 text-left shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md ${style.accent}`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/95 text-base shadow-[0_2px_6px_rgba(0,0,0,0.06)] ring-1 ring-white/80">
          {style.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${style.badge}`}>
              {item.categoryLabel}
            </span>
            <p className={`truncate font-bold text-slate-700 ${compact ? "text-xs" : "text-sm"}`}>
              {item.title}
            </p>
          </div>
          {item.summary ? (
            <p className="mt-0.5 line-clamp-2 text-[11px] font-medium text-slate-500">{item.summary}</p>
          ) : null}
        </div>
        {!compact && item.createdAt ? (
          <span className="shrink-0 text-[10px] font-medium text-slate-400">
            {formatActivityDate(item.createdAt)}
          </span>
        ) : null}
      </button>
    </motion.li>
  );
}

type CatTowerPostHistoryPreviewProps = {
  items: UserPostHistoryItem[];
  totalCount: number;
  loading?: boolean;
  error?: string | null;
  onViewAll?: () => void;
  embedded?: boolean;
};

/** 히스토리 탭 미리보기 */
export function CatTowerPostHistoryPreview({
  items,
  totalCount,
  loading,
  error,
  onViewAll,
  embedded = false,
}: CatTowerPostHistoryPreviewProps) {
  const navigate = useNavigate();
  const hasMore = totalCount > items.length;

  const header = (
    <div className="mb-3 flex items-center justify-between gap-2">
      {!embedded ? (
        <p className="text-[11px] font-extrabold tracking-wide text-orange-900/80">📝 작성 글</p>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
            totalCount === 0 ? "bg-slate-100 text-slate-500/80" : "bg-orange-100/80 text-orange-700/80"
          }`}
        >
          {totalCount}건
        </span>
        {hasMore && onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="rounded-full border border-orange-200/80 bg-white px-2.5 py-0.5 text-[9px] font-bold text-orange-700 transition hover:bg-orange-50"
          >
            전체보기
          </button>
        ) : null}
      </div>
    </div>
  );

  if (loading && items.length === 0) {
    return (
      <div>
        {header}
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        {header}
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-5 text-center text-xs font-semibold text-red-600">
          {error}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div>
        {header}
        <div className="rounded-xl border border-dashed border-orange-200/70 bg-white/60 px-4 py-6 text-center">
          <p className="text-xl opacity-50">📝</p>
          <p className="mt-1.5 text-xs font-bold text-orange-900/70">아직 작성한 글이 없어요</p>
          <p className="mt-0.5 text-xs text-slate-500">리뷰 작성이나 모집글 참여 기록이 여기에 쌓여요</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {header}
      <ul className="space-y-2">
        {items.map((item, index) => (
          <PostHistoryRow
            key={`${item.category}-${item.postId}`}
            item={item}
            index={index}
            compact
            onNavigate={(path) => navigate(path)}
          />
        ))}
      </ul>
    </div>
  );
}

type CatTowerPostHistoryModalBodyProps = {
  items: UserPostHistoryItem[];
  category: PostHistoryCategory;
  page: number;
  totalPages: number;
  totalElements: number;
  reviewCount: number;
  recruitmentCount: number;
  loading?: boolean;
  error?: string | null;
  onCategoryChange: (category: PostHistoryCategory) => void;
  onPageChange: (page: number) => void;
  onItemNavigate?: (linkPath: string) => void;
};

/** 히스토리 전체보기 — 카테고리 탭 + 페이징 */
export function CatTowerPostHistoryModalBody({
  items,
  category,
  page,
  totalPages,
  totalElements,
  reviewCount,
  recruitmentCount,
  loading,
  error,
  onCategoryChange,
  onPageChange,
  onItemNavigate,
}: CatTowerPostHistoryModalBodyProps) {
  const navigate = useNavigate();

  const handleNavigate = (linkPath: string) => {
    if (onItemNavigate) onItemNavigate(linkPath);
    else navigate(linkPath);
  };

  const tabCount = (id: PostHistoryCategory) => {
    if (id === "REVIEW") return reviewCount;
    if (id === "RECRUITMENT") return recruitmentCount;
    return reviewCount + recruitmentCount;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {CATEGORY_TABS.map((tab) => {
          const active = category === tab.id;
          const count = tabCount(tab.id);
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onCategoryChange(tab.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                active
                  ? "bg-orange-500 text-white shadow-sm"
                  : "border border-orange-100 bg-white text-slate-600 hover:bg-orange-50"
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 ${active ? "text-white/85" : "text-slate-400"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {loading && items.length === 0 ? (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-8 text-center text-sm font-semibold text-red-600">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 px-6 py-10 text-center">
          <p className="text-2xl opacity-60">📝</p>
          <p className="mt-2 text-sm font-bold text-slate-600">해당 카테고리에 작성 글이 없어요</p>
        </div>
      ) : (
        <ul className="divide-y divide-orange-100 overflow-hidden rounded-2xl border border-orange-100 bg-white">
          {items.map((item, index) => (
            <li key={`${item.category}-${item.postId}`} className="p-1">
              <PostHistoryRow
                item={item}
                index={index}
                onNavigate={handleNavigate}
              />
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-white px-4 py-3">
          <button
            type="button"
            disabled={page <= 0 || loading}
            onClick={() => onPageChange(page - 1)}
            className="rounded-full border border-orange-200 px-3 py-1.5 text-xs font-bold text-orange-700 transition enabled:hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            이전
          </button>
          <p className="text-xs font-semibold text-slate-500">
            {page + 1} / {totalPages}
            <span className="ml-2 text-slate-400">총 {totalElements}건</span>
          </p>
          <button
            type="button"
            disabled={page >= totalPages - 1 || loading}
            onClick={() => onPageChange(page + 1)}
            className="rounded-full border border-orange-200 px-3 py-1.5 text-xs font-bold text-orange-700 transition enabled:hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            다음
          </button>
        </div>
      ) : null}
    </div>
  );
}
