import axiosInstance from "../axiosInstance";
import type {
  ChatbotChatRequest,
  ChatbotChatResponse,
  ChatbotRecommendResponse,
} from "../../types/chatbot/chatbot";

export async function postChatbotChat(payload: ChatbotChatRequest): Promise<ChatbotChatResponse> {
  const res = await axiosInstance.post<ChatbotChatResponse>("/chatbot/chat", payload);
  return res.data;
}

export async function postChatRecommend(payload: ChatbotChatRequest): Promise<ChatbotRecommendResponse> {
  const res = await axiosInstance.post<ChatbotRecommendResponse>("/chat/recommend", payload);
  return res.data;
}

