package com.gorong.backend.domain.chatbot.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class ChatActionDto {
    private String label;
    /** 프론트 라우트 경로 (예: /events/123, /groups) */
    private String path;
    private String type;
}
