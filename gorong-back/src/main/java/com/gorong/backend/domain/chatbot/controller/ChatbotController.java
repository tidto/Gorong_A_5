package com.gorong.backend.domain.chatbot.controller;

import com.gorong.backend.domain.chatbot.dto.ChatRecommendResponseDto;
import com.gorong.backend.domain.chatbot.dto.ChatRequestDto;
import com.gorong.backend.domain.chatbot.dto.ChatResponseDto;
import com.gorong.backend.domain.chatbot.service.ChatbotHelpService;
import com.gorong.backend.domain.chatbot.service.ChatbotMessageService;
import com.gorong.backend.domain.chatbot.service.GeminiChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/chatbot")
@RequiredArgsConstructor
@Slf4j
public class ChatbotController {

    private final GeminiChatService geminiChatService;
    private final ChatbotMessageService chatbotMessageService;
    private final ChatbotHelpService chatbotHelpService;

    /** 통합 메시지 — intent 분류 후 안내·DB 추천·근처 추천 */
    @PostMapping("/message")
    public ResponseEntity<?> message(@Valid @RequestBody ChatRequestDto req, Authentication authentication) {
        return okOrError(() -> chatbotMessageService.handleMessage(
                req.getMessage(),
                req.getExcludeEventIds(),
                authentication
        ));
    }

    @PostMapping("/recommend/events")
    public ResponseEntity<?> recommendEvents(@Valid @RequestBody ChatRequestDto req, Authentication authentication) {
        return okOrError(() -> chatbotMessageService.recommendEvents(
                req.getMessage(),
                req.getExcludeEventIds(),
                authentication
        ));
    }

    @PostMapping("/recommend/nearby")
    public ResponseEntity<?> recommendNearby(@Valid @RequestBody ChatRequestDto req, Authentication authentication) {
        return okOrError(() -> chatbotMessageService.recommendNearby(
                req.getMessage(),
                req.getExcludeEventIds(),
                authentication
        ));
    }

    @GetMapping("/help")
    public ResponseEntity<?> help(@RequestParam(required = false) String message) {
        return ResponseEntity.ok(chatbotHelpService.buildHelpResponse(message == null ? "" : message));
    }

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
            log.warn("Chatbot request failed", e);
            String detail = null;
            if (e.getCause() != null) {
                String causeMsg = e.getCause().getMessage();
                if (causeMsg != null && causeMsg.length() > 500) {
                    causeMsg = causeMsg.substring(0, 500) + "...";
                }
                detail = e.getCause().getClass().getSimpleName() + ": " + causeMsg;
            }
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
                    "message", e.getMessage(),
                    "detail", detail
            ));
        }
    }

    private ResponseEntity<?> okOrError(ChatbotResponseSupplier supplier) {
        try {
            return ResponseEntity.ok(supplier.get());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            log.warn("Chatbot API failed", e);
            return ResponseEntity.ok(chatbotHelpService.buildFallbackHelp());
        }
    }

    @FunctionalInterface
    private interface ChatbotResponseSupplier {
        ChatRecommendResponseDto get();
    }
}
