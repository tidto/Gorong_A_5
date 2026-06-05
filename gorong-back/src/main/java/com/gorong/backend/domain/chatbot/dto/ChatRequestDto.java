package com.gorong.backend.domain.chatbot.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class ChatRequestDto {
    @NotBlank(message = "message is required.")
    private String message;

    /** 프론트 채팅 이력에서 이미 추천한 eventId — 다음 추천에서 제외 */
    private List<Long> excludeEventIds;
}

