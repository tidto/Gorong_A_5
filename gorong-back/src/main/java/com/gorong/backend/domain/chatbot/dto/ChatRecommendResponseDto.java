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
    private List<RecommendedEventDto> recommendedEvents;

    @Getter
    @Builder
    @AllArgsConstructor
    public static class RecommendedEventDto {
        private Long eventId;
        private String title;
        private String place;
        private String date;
        private String reason;
    }
}
