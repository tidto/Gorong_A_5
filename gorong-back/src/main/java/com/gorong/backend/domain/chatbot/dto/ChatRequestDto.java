package com.gorong.backend.domain.chatbot.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChatRequestDto {
    @NotBlank(message = "message is required.")
    private String message;
}

