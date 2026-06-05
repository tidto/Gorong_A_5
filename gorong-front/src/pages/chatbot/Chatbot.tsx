import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeSanitize from "rehype-sanitize";
import { Bot, Send, Sparkles } from "lucide-react";
import Button from "../../components/Button";
import Input from "../../components/Input";
import ChatbotEventCard from "../../components/chatbot/ChatbotEventCard";
import ChatbotActionBar from "../../components/chatbot/ChatbotActionBar";
import ChatbotQuickReplies from "../../components/chatbot/ChatbotQuickReplies";
import ChatbotTypingIndicator from "../../components/chatbot/ChatbotTypingIndicator";
import { postChatbotMessage } from "../../api/chatbot/chatbotApi";
import type { ChatbotAction, ChatbotRecommendedEvent } from "../../types/chatbot/chatbot";
import { intentLabel } from "../../utils/chatbot/chatbotUi";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  recommendedEvents?: ChatbotRecommendedEvent[];
  actions?: ChatbotAction[];
  intent?: string;
  createdAt: number;
};

const GEMINI_FALLBACK =
  "지금은 AI 답변을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.\n\n" +
  "그동안 **행사**·**그룹**·**리뷰**·**CatTower** 메뉴를 이용하거나, 아래 빠른 질문을 눌러 보세요.";

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function collectExcludeEventIds(messages: ChatMessage[]): number[] {
  const ids = new Set<number>();
  for (const m of messages) {
    if (m.role !== "assistant" || !m.recommendedEvents?.length) continue;
    for (const ev of m.recommendedEvents) {
      if (ev.eventId > 0) ids.add(ev.eventId);
    }
  }
  return Array.from(ids);
}

function normalizeErrorMessage(e: unknown) {
  if (axios.isAxiosError(e)) {
    if (!e.response) {
      return "네트워크 연결이 불안정해요. 잠시 후 다시 시도해줘.";
    }
    const status = e.response.status;
    if (status === 401) return "로그인이 필요해요. 다시 로그인한 뒤 이용해줘.";
    if (status === 403) return "권한이 없어서 요청을 처리할 수 없어요.";
    if (status === 404) return "요청한 API를 찾지 못했어요.";
    if (status === 429) return "요청이 너무 많아. 잠시 후 다시 부탁해줘.";
    if (status >= 500) return GEMINI_FALLBACK;

    const msg = (e.response.data as { message?: string })?.message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  if (e instanceof Error && e.message.trim()) return e.message;
  return GEMINI_FALLBACK;
}

function MarkdownBubble({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed break-words overflow-hidden">
      <ReactMarkdown
        rehypePlugins={[rehypeSanitize]}
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          a: ({ children, ...props }) => (
            <a
              {...props}
              className="font-medium underline underline-offset-2 text-primary-700 hover:text-primary-800 break-words"
              target="_blank"
              rel="noreferrer"
            >
              {children}
            </a>
          ),
          ul: ({ children, ...props }) => (
            <ul {...props} className="list-disc pl-5 space-y-1 my-1">
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol {...props} className="list-decimal pl-5 space-y-1 my-1">
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li {...props} className="break-words">
              {children}
            </li>
          ),
          p: ({ children, ...props }) => (
            <p {...props} className="break-words whitespace-pre-wrap my-1 last:mb-0">
              {children}
            </p>
          ),
          strong: ({ children, ...props }) => (
            <strong {...props} className="font-semibold text-gray-900">
              {children}
            </strong>
          ),
          code: ({ children, ...props }) => (
            <code {...props} className="rounded bg-black/5 px-1 py-0.5 text-[0.92em] break-words">
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
        content:
          "안녕! 나는 **고롱 서비스 도우미 Go냥이**야 🐾\n\n" +
          "행사 추천·근처 행사·그룹 참여·리뷰 작성·CatTower 꾸미기까지 안내할게. " +
          "아래 **카테고리별 빠른 질문**을 누르거나, 편하게 물어봐!",
        actions: [
          { label: "행사 찾기", path: "/events", type: "events" },
          { label: "그룹 보기", path: "/groups", type: "groups" },
          { label: "리뷰 작성", path: "/reviews", type: "review" },
          { label: "CatTower", path: "/cattower", type: "cattower" },
        ],
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
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => scrollToBottom("smooth"));
  }, [messages, isTyping]);

  const canSend = useMemo(() => inputMessage.trim().length > 0 && !isTyping, [inputMessage, isTyping]);
  const showQuickReplies = messages.length <= 3;

  function navigateAction(path: string) {
    if (!path?.trim()) return;
    navigate(path.startsWith("/") ? path : `/${path}`);
  }

  function eventDetailPath(event: ChatbotRecommendedEvent) {
    return event.detailPath?.trim() || `/events/${event.eventId}`;
  }

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
    const excludeEventIds = collectExcludeEventIds(messages);
    setMessages((prev) => [...prev, userMessage]);
    if (source === "input") setInputMessage("");
    setIsTyping(true);

    try {
      const data = await postChatbotMessage({ message: trimmed, excludeEventIds });
      const answer = typeof data?.answer === "string" ? data.answer : "";
      const recommendedEvents = Array.isArray(data?.recommendedEvents) ? data.recommendedEvents : [];
      const actions = Array.isArray(data?.actions) ? data.actions : undefined;

      const botMessage: ChatMessage = {
        id: `a_${Date.now()}`,
        role: "assistant",
        content:
          answer.trim() ||
          "답변을 만들지 못했어요. 조건을 바꿔서 다시 검색하거나, 이용 방법을 물어봐 줄래?",
        recommendedEvents,
        actions,
        intent: data.intent,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (e) {
      const msg = normalizeErrorMessage(e);
      setErr(msg);

      const botMessage: ChatMessage = {
        id: `e_${Date.now()}`,
        role: "assistant",
        content: `${msg}\n\n- **행사**: "이번 주 행사 추천해줘"\n- **그룹**: 그룹 메뉴 또는 "그룹 참여 방법"\n- **리뷰**: /reviews 또는 "리뷰 작성 방법"\n- **CatTower**: "CatTower 꾸미는 방법"`,
        actions: [
          { label: "행사 찾기", path: "/events", type: "events" },
          { label: "그룹 보기", path: "/groups", type: "groups" },
          { label: "CatTower", path: "/cattower", type: "cattower" },
        ],
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-3 py-5 sm:px-4 sm:py-8">
      <div className="flex h-[min(78vh,720px)] min-h-[560px] flex-col overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.08)]">
        <header className="shrink-0 border-b border-primary-600/20 bg-gradient-to-r from-primary-500 via-primary-500 to-emerald-500 px-4 py-4 text-white sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 shadow-inner backdrop-blur-sm">
              <Bot className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-lg font-extrabold sm:text-xl">Go냥이 챗봇</h1>
                <span className="hidden shrink-0 items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold sm:inline-flex">
                  <Sparkles className="h-3 w-3" />
                  AI 도우미
                </span>
              </div>
              <p className="truncate text-xs opacity-90 sm:text-sm">
                행사 추천 · 근처 행사 · 그룹 · 리뷰 · CatTower 안내
              </p>
            </div>
          </div>
        </header>

        {err ? (
          <div className="shrink-0 border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        <div
          ref={listRef}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-gradient-to-b from-slate-50/50 to-white px-3 py-4 sm:px-4"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {m.role === "assistant" ? (
                <div
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700"
                  aria-hidden
                >
                  <Bot className="h-4 w-4" />
                </div>
              ) : (
                <div
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600"
                  aria-hidden
                >
                  나
                </div>
              )}

              <div
                className={`max-w-[min(100%,28rem)] sm:max-w-md lg:max-w-xl ${
                  m.role === "user" ? "items-end" : "items-start"
                } flex flex-col`}
              >
                {m.role === "assistant" && intentLabel(m.intent) ? (
                  <span className="mb-1 inline-flex w-fit rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-primary-700 ring-1 ring-primary-100">
                    {intentLabel(m.intent)}
                  </span>
                ) : null}

                <div
                  className={`rounded-2xl px-4 py-3 shadow-sm ${
                    m.role === "user"
                      ? "rounded-br-md bg-primary-500 text-white"
                      : "rounded-bl-md border border-gray-100 bg-white text-gray-900"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <MarkdownBubble content={m.content} />
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>
                  )}
                </div>

                {m.role === "assistant" ? (
                  <ChatbotActionBar actions={m.actions} onNavigate={navigateAction} />
                ) : null}

                {m.role === "assistant" && m.recommendedEvents?.length ? (
                  <div className="mt-2 w-full space-y-2.5">
                    <p className="text-[11px] font-bold text-gray-500">추천 행사</p>
                    {m.recommendedEvents.map((event, idx) => (
                      <ChatbotEventCard
                        key={`${m.id}_${event.eventId}`}
                        event={event}
                        index={idx}
                        onDetail={() => navigate(eventDetailPath(event))}
                        onGroups={() => navigate(event.groupPath || "/groups")}
                      />
                    ))}
                  </div>
                ) : null}

                {m.role === "assistant" &&
                !m.recommendedEvents?.length &&
                (m.intent === "EVENT_RECOMMENDATION" || m.intent === "LOCATION_RECOMMENDATION") &&
                m.content.includes("찾지 못했") ? (
                  <p className="mt-2 text-[11px] text-gray-500">
                    조건을 바꿔서 다시 검색해 보세요 (지역·키워드·이번 주 등).
                  </p>
                ) : null}

                <p
                  className={`mt-1 text-[10px] text-gray-400 ${
                    m.role === "user" ? "text-right" : "text-left"
                  }`}
                >
                  {formatTime(m.createdAt)}
                </p>
              </div>
            </div>
          ))}

          {isTyping ? <ChatbotTypingIndicator /> : null}
        </div>

        {showQuickReplies ? (
          <ChatbotQuickReplies disabled={isTyping} onSelect={(text) => void sendMessage(text, "quickReply")} />
        ) : null}

        <div className="shrink-0 border-t border-gray-200 bg-white p-3 sm:p-4">
          <div className="flex gap-2 sm:gap-3">
            <Input
              placeholder="행사 추천, 근처 행사, 그룹·리뷰·CatTower 방법을 물어보세요..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage(inputMessage, "input");
                }
              }}
              className="flex-1"
              disabled={isTyping}
            />
            <Button onClick={() => void sendMessage(inputMessage, "input")} disabled={!canSend}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
