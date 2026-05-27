export type ChatbotChatRequest = {
  message: string;
};

export type ChatbotChatResponse = {
  answer: string;
};

export type ChatbotAction = {
  label: string;
  path: string;
  type?: string;
};

export type ChatbotRecommendedEvent = {
  eventId: number;
  title: string;
  place?: string;
  date?: string;
  reason: string;
  imageUrl?: string | null;
  category?: string | null;
  description?: string | null;
  detailPath?: string;
  groupPath?: string;
  mapPath?: string;
};

export type ChatbotRecommendResponse = {
  answer: string;
  intent?: string;
  recommendedEvents: ChatbotRecommendedEvent[];
  actions?: ChatbotAction[];
};
