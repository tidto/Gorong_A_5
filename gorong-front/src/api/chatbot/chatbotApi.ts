import axiosInstance from "../axiosInstance";
import type { ChatbotChatRequest, ChatbotChatResponse } from "../../types/chatbot/chatbot";

export async function postChatbotChat(payload: ChatbotChatRequest): Promise<ChatbotChatResponse> {
  const res = await axiosInstance.post<ChatbotChatResponse>("/chatbot/chat", payload);
  return res.data;
}

