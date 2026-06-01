package com.gorong.backend.domain.chatbot.controller;

import com.gorong.backend.domain.chatbot.dto.ChatRecommendResponseDto;
import com.gorong.backend.domain.chatbot.dto.ChatRequestDto;
import com.gorong.backend.domain.chatbot.service.ChatbotHelpService;
import com.gorong.backend.domain.chatbot.service.ChatbotMessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatRecommendationController {

    private final ChatbotMessageService chatbotMessageService;
    private final ChatbotHelpService chatbotHelpService;

    @PostMapping("/recommend")
    public ResponseEntity<?> recommend(@Valid @RequestBody ChatRequestDto req, Authentication authentication) {
        try {
            ChatRecommendResponseDto response = chatbotMessageService.handleMessage(req.getMessage(), authentication);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            log.warn("Event recommendation request failed", e);
            return ResponseEntity.status(HttpStatus.OK).body(chatbotHelpService.buildFallbackHelp());
        }
    }
}
