import { useState } from "react";
import { QUICK_REPLY_CATEGORIES } from "../../utils/chatbot/chatbotUi";

type Props = {
  disabled?: boolean;
  onSelect: (text: string) => void;
};

export default function ChatbotQuickReplies({ disabled, onSelect }: Props) {
  const [activeId, setActiveId] = useState(QUICK_REPLY_CATEGORIES[0]?.id ?? "events");
  const active = QUICK_REPLY_CATEGORIES.find((c) => c.id === activeId) ?? QUICK_REPLY_CATEGORIES[0];

  return (
    <div className="space-y-3 border-t border-gray-100 bg-gradient-to-b from-gray-50/80 to-white px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">빠른 질문</p>
      <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {QUICK_REPLY_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            disabled={disabled}
            onClick={() => setActiveId(cat.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
              activeId === cat.id
                ? "bg-primary-500 text-white shadow-sm"
                : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>
      {active ? (
        <div className="flex flex-wrap gap-2">
          {active.replies.map((reply) => (
            <button
              key={reply}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(reply)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-[12px] font-medium text-gray-700 shadow-sm transition hover:border-primary-200 hover:bg-primary-50/50 disabled:opacity-50"
            >
              {reply}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
