package com.gorong.backend.domain.chatbot.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChatRequestDto {
    @NotBlank(message = "message는 필수입니다.")
    private String message;
}

