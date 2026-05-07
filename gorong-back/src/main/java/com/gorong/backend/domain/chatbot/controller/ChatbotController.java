package com.gorong.backend.domain.chatbot.controller;

import com.gorong.backend.domain.chatbot.dto.ChatRequestDto;
import com.gorong.backend.domain.chatbot.dto.ChatResponseDto;
import com.gorong.backend.domain.chatbot.service.GeminiChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/chatbot")
@RequiredArgsConstructor
public class ChatbotController {

    private final GeminiChatService geminiChatService;

    @PostMapping("/chat")
    public ResponseEntity<?> chat(@Valid @RequestBody ChatRequestDto req) {
        try {
            String answer = geminiChatService.chat(req.getMessage());
            return ResponseEntity.ok(new ChatResponseDto(answer));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message", e.getMessage()
            ));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "message", e.getMessage()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
                    "message", e.getMessage()
            ));
        }
    }
}

