package com.gorong.backend.domain.chatbot.service;

import com.gorong.backend.domain.chatbot.dto.ChatRecommendResponseDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatbotMessageService {

    private final EventRecommendationService eventRecommendationService;
    private final ChatbotNearbyService chatbotNearbyService;
    private final ChatbotHelpService chatbotHelpService;

    public ChatRecommendResponseDto handleMessage(String message, Authentication authentication) {
        if (message == null || message.trim().isEmpty()) {
            throw new IllegalArgumentException("message is required.");
        }
        try {
            ChatIntent intent = ChatIntentClassifier.classify(message.trim());
            return switch (intent) {
                case SERVICE_GUIDE -> chatbotHelpService.buildHelpResponse(message.trim());
                case LOCATION_RECOMMENDATION -> chatbotNearbyService.recommendNearby(message.trim(), authentication);
                case GREETING, EVENT_RECOMMENDATION, UNKNOWN ->
                        eventRecommendationService.recommend(message.trim(), authentication);
            };
        } catch (RuntimeException e) {
            log.warn("[Chatbot] handleMessage failed, returning help fallback", e);
            return chatbotHelpService.buildFallbackHelp();
        }
    }

    public ChatRecommendResponseDto recommendEvents(String message, Authentication authentication) {
        return eventRecommendationService.recommend(message, authentication);
    }

    public ChatRecommendResponseDto recommendNearby(String message, Authentication authentication) {
        return chatbotNearbyService.recommendNearby(message, authentication);
    }

    public ChatRecommendResponseDto help(String message) {
        return chatbotHelpService.buildHelpResponse(message == null ? "" : message.trim());
    }
}
