import { Calendar, ChevronRight, MapPin, Sparkles, Users } from "lucide-react";
import type { ChatbotRecommendedEvent } from "../../types/chatbot/chatbot";

type ChatbotEventCardProps = {
  event: ChatbotRecommendedEvent;
  index?: number;
  onDetail: () => void;
  onGroups: () => void;
};

export default function ChatbotEventCard({ event, index = 0, onDetail, onGroups }: ChatbotEventCardProps) {
  const imageUrl = event.imageUrl?.trim();

  return (
    <article className="overflow-hidden rounded-2xl border border-orange-100/90 bg-white shadow-[0_4px_20px_rgba(251,146,60,0.12)] transition hover:border-orange-200 hover:shadow-md">
      <div className="flex gap-0 sm:gap-0">
        {imageUrl ? (
          <div className="relative hidden h-auto w-24 shrink-0 bg-gray-100 sm:block sm:w-28">
            <img
              src={imageUrl}
              alt=""
              className="h-full min-h-[7rem] w-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        ) : null}

        <div className="min-w-0 flex-1 p-3.5 sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-primary-500 px-2 py-0.5 text-[10px] font-bold text-white">
                추천 {index + 1}
              </span>
              {event.category ? (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800">
                  {event.category}
                </span>
              ) : null}
            </div>
            <Sparkles className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
          </div>

          <h3 className="mt-2 text-sm font-extrabold leading-snug text-gray-900 line-clamp-2">
            {event.title}
          </h3>

          <div className="mt-2 space-y-1 text-[11px] text-gray-600">
            {event.place ? (
              <p className="flex items-start gap-1.5">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-400" />
                <span className="line-clamp-2">{event.place}</span>
              </p>
            ) : null}
            {event.date ? (
              <p className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-orange-400" />
                <span>{event.date}</span>
              </p>
            ) : null}
          </div>

          {event.description ? (
            <p className="mt-2 text-xs leading-relaxed text-gray-600 line-clamp-2">{event.description}</p>
          ) : null}

          <p className="mt-2.5 rounded-lg bg-orange-50/80 px-2.5 py-2 text-xs leading-relaxed text-orange-900/90">
            {event.reason}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onDetail}
              className="inline-flex items-center gap-1 rounded-xl bg-primary-500 px-3 py-2 text-[11px] font-bold text-white shadow-sm hover:bg-primary-600"
            >
              상세 보기
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onGroups}
              className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100"
            >
              <Users className="h-3.5 w-3.5" />
              그룹 보기
            </button>
          </div>
        </div>
      </div>

      {imageUrl ? (
        <div className="relative h-32 w-full bg-gray-100 sm:hidden">
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      ) : null}
    </article>
  );
}
