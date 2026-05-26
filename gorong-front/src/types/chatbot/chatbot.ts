export type ChatbotChatRequest = {
  message: string;
};

export type ChatbotChatResponse = {
  answer: string;
};

export type ChatbotRecommendedEvent = {
  eventId: number;
  title: string;
  place?: string;
  date?: string;
  reason: string;
};

export type ChatbotRecommendResponse = {
  answer: string;
  recommendedEvents: ChatbotRecommendedEvent[];
};

