import { MapPin, Calendar, Users } from "lucide-react";
import type { ChatbotRecommendedEvent } from "../../types/chatbot/chatbot";

type ChatbotEventCardProps = {
  event: ChatbotRecommendedEvent;
  onDetail: () => void;
  onGroups: () => void;
  onMap: () => void;
};

export default function ChatbotEventCard({ event, onDetail, onGroups, onMap }: ChatbotEventCardProps) {
  const imageUrl = event.imageUrl?.trim();

  return (
    <article className="overflow-hidden rounded-xl border border-primary-100 bg-white shadow-sm transition hover:border-primary-300 hover:shadow-md">
      {imageUrl ? (
        <div className="relative h-28 w-full bg-gray-100">
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

      <div className="p-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {event.category ? (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800">
              {event.category}
            </span>
          ) : null}
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
            추천
          </span>
        </div>

        <h3 className="mt-2 text-sm font-bold text-gray-900 line-clamp-2">{event.title}</h3>

        <div className="mt-2 space-y-1 text-[11px] text-gray-600">
          {event.place ? (
            <p className="flex items-start gap-1">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-gray-400" />
              <span className="line-clamp-2">{event.place}</span>
            </p>
          ) : null}
          {event.date ? (
            <p className="flex items-center gap-1">
              <Calendar className="h-3 w-3 shrink-0 text-gray-400" />
              <span>{event.date}</span>
            </p>
          ) : null}
        </div>

        {event.description ? (
          <p className="mt-2 text-xs leading-relaxed text-gray-600 line-clamp-2">{event.description}</p>
        ) : null}

        <p className="mt-2 text-xs leading-relaxed text-primary-800/90">{event.reason}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={onDetail}
            className="rounded-lg bg-primary-500 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-primary-600"
          >
            이 행사 보러가기
          </button>
          <button
            type="button"
            onClick={onMap}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-gray-700 hover:bg-gray-50"
          >
            상세보기
          </button>
          <button
            type="button"
            onClick={onGroups}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100"
          >
            <Users className="h-3 w-3" />
            그룹 보기
          </button>
        </div>
      </div>
    </article>
  );
}
