import { Bot } from "lucide-react";

export default function ChatbotTypingIndicator() {
  return (
    <div className="flex justify-start gap-2">
      <div
        className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700"
        aria-hidden
      >
        <Bot className="h-4 w-4" />
      </div>
      <div className="rounded-2xl rounded-bl-md border border-gray-100 bg-white px-4 py-3 shadow-sm">
        <p className="text-[11px] font-semibold text-gray-500">Go냥이가 답변 작성 중</p>
        <div className="mt-2 flex items-center gap-1" aria-label="typing">
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary-400 [animation-delay:0ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary-400 [animation-delay:120ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary-400 [animation-delay:240ms]" />
        </div>
      </div>
    </div>
  );
}
