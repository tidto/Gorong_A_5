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
import ChatbotEventCard from "../../components/chatbot/ChatbotEventCard";
import ChatbotActionBar from "../../components/chatbot/ChatbotActionBar";
import { postChatbotMessage } from "../../api/chatbot/chatbotApi";
import type { ChatbotAction, ChatbotRecommendedEvent } from "../../types/chatbot/chatbot";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  recommendedEvents?: ChatbotRecommendedEvent[];
  actions?: ChatbotAction[];
  intent?: string;
  createdAt: number;
};

const quickReplies = [
  "이번 주 갈 만한 행사 추천해줘",
  "내 근처 행사 추천해줘",
  "대구 근처 갈만한 곳 알려줘",
  "그룹 참여 방법 알려줘",
  "CatTower 꾸미는 방법",
  "리뷰 작성 방법",
];

const helpQuickReplies = [
  "행사 찾는 방법",
  "채팅방 이용 방법",
  "다른 유저 CatTower 보는 방법",
];

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
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
    if (status >= 500) return "지금은 추천 정보를 불러오지 못했어요.";

    const msg = (e.response.data as { message?: string })?.message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }

  if (e instanceof Error && e.message.trim()) return e.message;
  return "지금은 추천 정보를 불러오지 못했어요.";
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
        content:
          "안녕! 나는 **고롱 서비스 도우미 Go냥이**야 🐾\n\n행사 추천·근처 행사·그룹/리뷰/CatTower 사용법까지 도와줄게. 아래 빠른 질문을 눌러보거나 편하게 물어봐!",
        actions: [
          { label: "행사 찾기", path: "/events", type: "events" },
          { label: "그룹 보기", path: "/groups", type: "groups" },
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
    setMessages((prev) => [...prev, userMessage]);
    if (source === "input") setInputMessage("");
    setIsTyping(true);

    try {
      const data = await postChatbotMessage({ message: trimmed });
      const answer = typeof data?.answer === "string" ? data.answer : "";
      const recommendedEvents = Array.isArray(data?.recommendedEvents) ? data.recommendedEvents : [];
      const actions = Array.isArray(data?.actions) ? data.actions : undefined;

      const botMessage: ChatMessage = {
        id: `a_${Date.now()}`,
        role: "assistant",
        content:
          answer.trim() ||
          "답변을 만들지 못했어요. 행사 추천이나 이용 방법을 다시 물어봐 줄래?",
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
        content: `${msg}\n\n대신 고롱 이용 방법을 안내해 드릴게요.\n- **행사**: 상단 행사 메뉴 또는 "행사 추천해줘"\n- **그룹**: 그룹 메뉴에서 동행 모집·참여\n- **CatTower**: Go냥이 꾸미기·성장 확인`,
        actions: [
          { label: "행사 찾기", path: "/events", type: "events" },
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
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-[70vh] min-h-[520px] flex flex-col">
        <div className="bg-primary-500 text-white p-4 flex items-center gap-3">
          <Bot className="w-6 h-6" />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold truncate">Go냥이 챗봇</h1>
            <p className="text-xs sm:text-sm opacity-90 truncate">
              고롱 서비스 도우미 · 행사 추천 · 이용 안내
            </p>
          </div>
        </div>

        {err ? (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-2 border-b border-red-100">{err}</div>
        ) : null}

        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[92%] sm:max-w-md lg:max-w-xl">
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

                {m.role === "assistant" ? (
                  <ChatbotActionBar actions={m.actions} onNavigate={navigateAction} />
                ) : null}

                {m.role === "assistant" && m.recommendedEvents?.length ? (
                  <div className="mt-2 space-y-2">
                    {m.recommendedEvents.map((event) => (
                      <ChatbotEventCard
                        key={`${m.id}_${event.eventId}`}
                        event={event}
                        onDetail={() => navigate(eventDetailPath(event))}
                        onGroups={() => navigate(event.groupPath || "/groups")}
                        onMap={() => navigate(event.mapPath || eventDetailPath(event))}
                      />
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
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {messages.length <= 2 ? (
          <div className="px-4 pb-3 space-y-3 border-t border-gray-100 pt-3">
            <div>
              <p className="text-sm text-gray-600 mb-2">행사·추천</p>
              <div className="flex flex-wrap gap-2">
                {quickReplies.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => (isTyping ? null : sendMessage(reply, "quickReply"))}
                    disabled={isTyping}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-full text-sm text-gray-700 transition-colors"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">이용 방법</p>
              <div className="flex flex-wrap gap-2">
                {helpQuickReplies.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => (isTyping ? null : sendMessage(reply, "quickReply"))}
                    disabled={isTyping}
                    className="px-3 py-2 bg-primary-50 hover:bg-primary-100 disabled:opacity-50 rounded-full text-sm text-primary-800 transition-colors"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div className="border-t border-gray-200 p-4">
          <div className="flex gap-3">
            <Input
              placeholder="행사 추천, 근처 행사, 이용 방법을 물어보세요..."
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
