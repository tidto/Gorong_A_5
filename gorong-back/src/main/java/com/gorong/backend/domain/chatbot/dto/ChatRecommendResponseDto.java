package com.gorong.backend.domain.chatbot.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
@AllArgsConstructor
public class ChatRecommendResponseDto {
    private String answer;
    /** GREETING | SERVICE_GUIDE | EVENT_RECOMMENDATION | LOCATION_RECOMMENDATION | UNKNOWN */
    private String intent;
    private List<RecommendedEventDto> recommendedEvents;
    private List<ChatActionDto> actions;

    @Getter
    @Builder
    @AllArgsConstructor
    public static class RecommendedEventDto {
        private Long eventId;
        private String title;
        private String place;
        private String date;
        private String reason;
        private String imageUrl;
        private String category;
        private String description;
        private String detailPath;
        private String groupPath;
        private String mapPath;
    }
}
