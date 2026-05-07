import React, { useEffect, useRef, useState } from "react";
import Button from "../components/Button";
import Input from "../components/Input";
import { Bot, Send } from "lucide-react";
import axiosInstance from "../api/axiosInstance";

type ChatMessage = {
  id: number;
  type: "user" | "bot";
  content: string;
  time: string;
};

const quickReplies = ["행사 추천해줘", "동행 모집 찾아줘", "길찾기 도와줘", "리뷰 작성 방법 알려줘", "프로필 수정 방법 알려줘"];

function nowTime() {
  return new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function errorMessage(e: any) {
  const msg = e?.response?.data?.message;
  if (typeof msg === "string" && msg.trim()) return msg;
  if (typeof e?.message === "string" && e.message.trim()) return e.message;
  return "현재 챗봇 서버가 응답하지 않습니다. 잠시 후 다시 시도해주세요.";
}

export default function Chatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      type: "bot",
      content: "안녕하세요. Go냥이 AI 어시스턴트입니다. 무엇을 도와드릴까요?",
      time: nowTime(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    setErr(null);
    const userMessage: ChatMessage = {
      id: Date.now(),
      type: "user",
      content: trimmed,
      time: nowTime(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    try {
      const res = await axiosInstance.post("/chatbot/chat", { message: trimmed });
      const answer = typeof res.data?.answer === "string" ? res.data.answer : "";
      const botMessage: ChatMessage = {
        id: Date.now() + 1,
        type: "bot",
        content: answer?.trim() || "답변을 생성하지 못했습니다. 잠시 후 다시 시도해주세요.",
        time: nowTime(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (e: any) {
      setErr(errorMessage(e));
      const botMessage: ChatMessage = {
        id: Date.now() + 2,
        type: "bot",
        content: "죄송해요. 지금은 답변을 제공하기 어려워요.",
        time: nowTime(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl shadow-lg overflow-hidden h-[600px] flex flex-col">
        <div className="bg-primary-500 text-white p-4 flex items-center gap-3">
          <Bot className="w-6 h-6" />
          <div>
            <h1 className="text-xl font-bold">Go냥이 AI 어시스턴트</h1>
            <p className="text-sm opacity-90">행사 추천, 길찾기, 후기 작성 등 궁금한 점을 물어보세요.</p>
          </div>
        </div>

        {err ? <div className="bg-red-50 text-red-700 text-sm px-4 py-2 border-b border-red-100">{err}</div> : null}

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-xs lg:max-w-md ${message.type === "user" ? "order-first" : ""}`}>
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    message.type === "user" ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">{message.time}</p>
              </div>
            </div>
          ))}

          {isTyping ? (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                </div>
              </div>
            </div>
          ) : null}

          <div ref={messagesEndRef} />
        </div>

        {messages.length === 1 ? (
          <div className="px-4 pb-4">
            <p className="text-sm text-gray-600 mb-3">빠른 질문:</p>
            <div className="flex flex-wrap gap-2">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  onClick={() => setInputMessage(reply)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors"
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
                if (e.key === "Enter") sendMessage(inputMessage);
              }}
              className="flex-1"
            />
            <Button onClick={() => sendMessage(inputMessage)} disabled={!inputMessage.trim() || isTyping}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

