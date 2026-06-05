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

    public ChatRecommendResponseDto handleMessage(
            String message,
            java.util.List<Long> excludeEventIds,
            Authentication authentication
    ) {
        if (message == null || message.trim().isEmpty()) {
            throw new IllegalArgumentException("message is required.");
        }
        String trimmed = message.trim();
        try {
            ChatIntent intent = ChatIntentClassifier.classify(trimmed);
            log.info("[Chatbot] intent={} messagePreview={}", intent, preview(trimmed));

            return switch (intent) {
                case REVIEW_GUIDE, CATTOWER_GUIDE, GROUP_GUIDE, SERVICE_GUIDE ->
                        chatbotHelpService.buildHelpResponse(trimmed, intent);
                case LOCATION_RECOMMENDATION ->
                        chatbotNearbyService.recommendNearby(trimmed, excludeEventIds, authentication);
                case GREETING, EVENT_RECOMMENDATION ->
                        eventRecommendationService.recommend(trimmed, excludeEventIds, authentication);
                case GENERAL_QUESTION, UNKNOWN -> handleGeneralQuestion(trimmed);
            };
        } catch (RuntimeException e) {
            log.warn("[Chatbot] handleMessage failed, returning help fallback", e);
            return chatbotHelpService.buildGeminiFailureHelp();
        }
    }

    private ChatRecommendResponseDto handleGeneralQuestion(String message) {
        return chatbotHelpService.buildGeneralResponse(message);
    }

    public ChatRecommendResponseDto recommendEvents(
            String message,
            java.util.List<Long> excludeEventIds,
            Authentication authentication
    ) {
        return eventRecommendationService.recommend(message, excludeEventIds, authentication);
    }

    public ChatRecommendResponseDto recommendNearby(
            String message,
            java.util.List<Long> excludeEventIds,
            Authentication authentication
    ) {
        return chatbotNearbyService.recommendNearby(message, excludeEventIds, authentication);
    }

    public ChatRecommendResponseDto help(String message) {
        return chatbotHelpService.buildHelpResponse(message == null ? "" : message.trim());
    }

    private static String preview(String message) {
        if (message.length() <= 48) {
            return message;
        }
        return message.substring(0, 48) + "…";
    }
}
