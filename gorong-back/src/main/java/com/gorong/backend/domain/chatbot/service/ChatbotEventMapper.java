package com.gorong.backend.domain.chatbot.service;

import com.gorong.backend.domain.chatbot.dto.ChatRecommendResponseDto;
import com.gorong.backend.domain.event.entity.Event;
import org.springframework.stereotype.Component;

@Component
public class ChatbotEventMapper {

    public ChatRecommendResponseDto.RecommendedEventDto toRecommended(
            Event event,
            String reason,
            String userLocation,
            String message,
            ChatIntent intent
    ) {
        return toRecommended(event, reason, null, userLocation, message, intent);
    }

    public ChatRecommendResponseDto.RecommendedEventDto toRecommended(
            Event event,
            String reason,
            EventRecommendReason reasonTag,
            String userLocation,
            String message,
            ChatIntent intent
    ) {
        String safeReason = reason != null && !reason.isBlank()
                ? reason
                : reasonTag != null
                ? reasonTag.line()
                : buildFallbackReason(event, userLocation, message, intent);
        return ChatRecommendResponseDto.RecommendedEventDto.builder()
                .eventId(event.getId())
                .title(safe(event.getTitle()))
                .place(safe(event.getAddr()))
                .date(formatDate(event))
                .reason(safeReason)
                .imageUrl(pickImage(event))
                .category(formatCategory(event.getTourCategoryCode()))
                .description(shorten(event.getDescription(), 120))
                .detailPath("/events/" + event.getId())
                .groupPath("/groups")
                .mapPath("/events/" + event.getId())
                .build();
    }

    private static String buildFallbackReason(
            Event event,
            String userLocation,
            String message,
            ChatIntent intent
    ) {
        StringBuilder reason = new StringBuilder();
        if (intent == ChatIntent.LOCATION_RECOMMENDATION && userLocation != null && !userLocation.isBlank()) {
            reason.append("등록·요청 지역(").append(userLocation).append(")과 가까운 장소예요. ");
        }
        if (message != null && message.contains("인기")) {
            reason.append("최근 등록·진행 중인 인기 행사예요.");
        } else {
            reason.append("DB에 등록된 진행 가능 행사예요.");
        }
        return reason.toString().trim();
    }

    private static String pickImage(Event event) {
        if (event.getFirstImage() != null && !event.getFirstImage().isBlank()) {
            return event.getFirstImage().trim();
        }
        if (event.getFirstImage2() != null && !event.getFirstImage2().isBlank()) {
            return event.getFirstImage2().trim();
        }
        return null;
    }

    private static String formatCategory(String code) {
        if (code == null || code.isBlank()) {
            return "행사";
        }
        return switch (code.trim()) {
            case "A02" -> "축제";
            case "A03" -> "체험";
            case "A04" -> "전시";
            case "A05" -> "공연";
            default -> "행사";
        };
    }

    private static String formatDate(Event event) {
        String start = safe(event.getEventStartDate());
        String end = safe(event.getEventEndDate());
        if ("-".equals(start) && "-".equals(end)) {
            return "-";
        }
        return start + " ~ " + end;
    }

    private static String safe(String value) {
        return value == null || value.isBlank() ? "-" : value.trim();
    }

    private static String shorten(String value, int max) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String t = value.trim();
        return t.length() <= max ? t : t.substring(0, max) + "...";
    }
}
