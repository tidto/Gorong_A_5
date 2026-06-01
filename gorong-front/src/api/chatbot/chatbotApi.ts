import axios from "axios";
import axiosInstance from "../axiosInstance";
import type {
  ChatbotChatRequest,
  ChatbotChatResponse,
  ChatbotRecommendResponse,
} from "../../types/chatbot/chatbot";

function isNotFound(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

/** 신규 엔드포인트 404 시 레거시 /chat/recommend 로 폴백 (백엔드 재시작 전 호환) */
async function postWithRecommendFallback(
  path: string,
  payload: ChatbotChatRequest
): Promise<ChatbotRecommendResponse> {
  try {
    const res = await axiosInstance.post<ChatbotRecommendResponse>(path, payload);
    return res.data;
  } catch (error) {
    if (!isNotFound(error)) {
      throw error;
    }
    const legacy = await axiosInstance.post<ChatbotRecommendResponse>("/chat/recommend", payload);
    return legacy.data;
  }
}

export async function postChatbotMessage(
  payload: ChatbotChatRequest
): Promise<ChatbotRecommendResponse> {
  return postWithRecommendFallback("/chatbot/message", payload);
}

export async function postChatbotRecommendEvents(
  payload: ChatbotChatRequest
): Promise<ChatbotRecommendResponse> {
  return postWithRecommendFallback("/chatbot/recommend/events", payload);
}

export async function postChatbotRecommendNearby(
  payload: ChatbotChatRequest
): Promise<ChatbotRecommendResponse> {
  return postWithRecommendFallback("/chatbot/recommend/nearby", payload);
}

export async function getChatbotHelp(message?: string): Promise<ChatbotRecommendResponse> {
  try {
    const res = await axiosInstance.get<ChatbotRecommendResponse>("/chatbot/help", {
      params: message ? { message } : undefined,
    });
    return res.data;
  } catch (error) {
    if (!isNotFound(error)) {
      throw error;
    }
    const res = await axiosInstance.post<ChatbotRecommendResponse>("/chat/recommend", {
      message: message?.trim() || "고롱 이용 방법 알려줘",
    });
    return res.data;
  }
}

export async function postChatbotChat(payload: ChatbotChatRequest): Promise<ChatbotChatResponse> {
  const res = await axiosInstance.post<ChatbotChatResponse>("/chatbot/chat", payload);
  return res.data;
}

/** 레거시 — /chat/recommend (통합 파이프라인과 동일) */
export async function postChatRecommend(
  payload: ChatbotChatRequest
): Promise<ChatbotRecommendResponse> {
  const res = await axiosInstance.post<ChatbotRecommendResponse>("/chat/recommend", payload);
  return res.data;
}
