import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeSanitize from "rehype-sanitize";
import { Bot, Send } from "lucide-react";
import Button from "../../components/Button";
import Input from "../../components/Input";
import { postChatRecommend } from "../../api/chatbot/chatbotApi";
import type { ChatbotRecommendedEvent } from "../../types/chatbot/chatbot";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  recommendedEvents?: ChatbotRecommendedEvent[];
  createdAt: number;
};

const quickReplies = [
  "혼자 가기 좋은 행사 추천해줘",
  "사진 찍기 좋은 행사 알려줘",
  "비 오는 날 실내 행사 추천해줘",
  "이번 주말 갈 만한 행사 추천해줘",
];

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function normalizeErrorMessage(e: unknown) {
  if (axios.isAxiosError(e)) {
    // No response: CORS/network/DNS/offline.
    if (!e.response) {
      return "네트워크 연결이 불안정해요. 잠시 후 다시 시도해줘.";
    }

    const status = e.response.status;
    if (status === 401) return "로그인이 필요해요. 다시 로그인한 뒤 이용해줘.";
    if (status === 403) return "권한이 없어서 요청을 처리할 수 없어요. 다시 로그인하거나 권한을 확인해줘.";
    if (status === 404) return "요청한 API를 찾지 못했어. (주소/포트 확인)";
    if (status === 429) return "요청이 너무 많아. 잠시 쉬었다가 다시 부탁해줘.";
    if (status >= 500) return "AI 추천을 불러오지 못했습니다.";

    const msg = (e.response.data as any)?.message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }

  if (e instanceof Error && e.message.trim()) return e.message;
  return "AI 추천을 불러오지 못했습니다.";
}

function MarkdownBubble({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed break-words overflow-hidden">
      <ReactMarkdown
        // XSS safety: we do NOT enable raw HTML rendering. Additionally sanitize any HTML nodes.
        rehypePlugins={[rehypeSanitize]}
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          a: ({ children, ...props }) => (
            <a
              {...props}
              className="underline underline-offset-2 text-primary-700 hover:text-primary-800 break-words"
              target="_blank"
              rel="noreferrer"
            >
              {children}
            </a>
          ),
          ul: ({ children, ...props }) => (
            <ul {...props} className="list-disc pl-5 space-y-1">
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol {...props} className="list-decimal pl-5 space-y-1">
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li {...props} className="break-words">
              {children}
            </li>
          ),
          p: ({ children, ...props }) => (
            <p {...props} className="break-words whitespace-pre-wrap">
              {children}
            </p>
          ),
          strong: ({ children, ...props }) => (
            <strong {...props} className="font-semibold">
              {children}
            </strong>
          ),
          code: ({ children, ...props }) => (
            <code {...props} className="px-1 py-0.5 rounded bg-black/5 text-[0.95em] break-words">
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default function Chatbot() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const now = Date.now();
    return [
      {
        id: `a_${now}`,
        role: "assistant",
        content: "안녕! 나는 Go냥이야. DB에 등록된 행사 안에서만 맞춤 행사를 추천해줄게. 어떤 행사를 찾고 있어?",
        createdAt: now,
      },
    ];
  });
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  };

  useEffect(() => {
    scrollToBottom("auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => scrollToBottom("smooth"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isTyping]);

  const canSend = useMemo(() => inputMessage.trim().length > 0 && !isTyping, [inputMessage, isTyping]);

  async function sendMessage(text: string, source: "input" | "quickReply" = "input") {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    setErr(null);

    const now = Date.now();
    const userMessage: ChatMessage = {
      id: `u_${now}`,
      role: "user",
      content: trimmed,
      createdAt: now,
    };
    setMessages((prev) => [...prev, userMessage]);
    if (source === "input") setInputMessage("");
    setIsTyping(true);

    try {
      const data = await postChatRecommend({ message: trimmed });
      const answer = typeof data?.answer === "string" ? data.answer : "";
      const recommendedEvents = Array.isArray(data?.recommendedEvents) ? data.recommendedEvents : [];

      const botMessage: ChatMessage = {
        id: `a_${Date.now()}`,
        role: "assistant",
        content: answer.trim() || "답변 생성에 실패했어. 한 번만 더 물어봐줄래?",
        recommendedEvents,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (e) {
      const msg = normalizeErrorMessage(e);
      setErr(msg);

      const botMessage: ChatMessage = {
        id: `e_${Date.now()}`,
        role: "assistant",
        content: msg,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-[70vh] min-h-[520px] flex flex-col">
        <div className="bg-primary-500 text-white p-4 flex items-center gap-3">
          <Bot className="w-6 h-6" />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold truncate">Go냥이 챗봇</h1>
            <p className="text-xs sm:text-sm opacity-90 truncate">행사 추천, 리뷰, 동행 서비스에 특화된 도우미</p>
          </div>
        </div>

        {err ? (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-2 border-b border-red-100">{err}</div>
        ) : null}

        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[85%] sm:max-w-md lg:max-w-xl">
                <div
                  className={`rounded-2xl px-4 py-3 shadow-sm ${
                    m.role === "user"
                      ? "bg-primary-500 text-white rounded-br-md"
                      : "bg-gray-100 text-gray-900 rounded-bl-md"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <MarkdownBubble content={m.content} />
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>
                  )}
                </div>
                {m.role === "assistant" && m.recommendedEvents?.length ? (
                  <div className="mt-2 space-y-2">
                    {m.recommendedEvents.map((event) => (
                      <button
                        key={`${m.id}_${event.eventId}`}
                        type="button"
                        onClick={() => navigate(`/events/${event.eventId}`)}
                        className="block w-full rounded-xl border border-primary-100 bg-white px-4 py-3 text-left shadow-sm transition hover:border-primary-300 hover:bg-primary-50"
                      >
                        <div className="text-sm font-bold text-gray-900">{event.title}</div>
                        <div className="mt-1 text-[11px] text-gray-500">
                          {[event.place, event.date].filter(Boolean).join(" · ")}
                        </div>
                        <div className="mt-1 text-xs leading-relaxed text-gray-600">{event.reason}</div>
                      </button>
                    ))}
                  </div>
                ) : null}
                <p className={`text-[11px] text-gray-500 mt-1 ${m.role === "user" ? "text-right" : "text-left"}`}>
                  {formatTime(m.createdAt)}
                </p>
              </div>
            </div>
          ))}

          {isTyping ? (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-4 py-3 rounded-bl-md shadow-sm">
                <p className="text-xs text-gray-600 mb-2">Go냥이가 답변 작성 중...</p>
                <div className="flex space-x-1" aria-label="typing">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {messages.length === 1 ? (
          <div className="px-4 pb-4">
            <p className="text-sm text-gray-600 mb-3">빠른 질문</p>
            <div className="flex flex-wrap gap-2">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  onClick={() => (isTyping ? null : sendMessage(reply, "quickReply"))}
                  disabled={isTyping}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-gray-100 rounded-full text-sm text-gray-700 transition-colors"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="border-t border-gray-200 p-4">
          <div className="flex gap-3">
            <Input
              placeholder="메시지를 입력하세요..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage(inputMessage, "input");
              }}
              className="flex-1"
              disabled={isTyping}
            />
            <Button onClick={() => sendMessage(inputMessage, "input")} disabled={!canSend}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

