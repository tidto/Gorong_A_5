package com.gorong.backend.domain.chatbot.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GeminiChatService {

    private final ObjectMapper objectMapper;
    private static final String SYSTEM_PROMPT = String.join("\n",
            "너는 'Go냥이'라는 고양이 캐릭터 AI 도우미야.",
            "반드시 한국어로 답해줘. (영어로 답하지 마.)",
            "항상 친근한 한국어 말투로, 부드러운 존댓말을 사용해줘.",
            "너의 전문 분야는: 지역 행사 추천, 행사/관광지 리뷰 작성 도움, 동행(모임) 서비스 안내/매너/안전 수칙, 일정/동선 추천이야.",
            "답변은 너무 딱딱하지 않게, 짧은 요약 후에 3~6개의 bullet로 정리해줘.",
            "사용자가 위치/날짜/취향을 안 줬으면 먼저 1~2개의 핵심 질문을 하고, 추측은 '추측'이라고 표시해줘.",
            "부적절한 요청(개인정보/불법/위험)은 정중히 거절하고 안전한 대안을 제시해줘."
    );

    // Environment variable injection only (do not hardcode secrets).
    @Value("${GEMINI_API_KEY}")
    private String geminiApiKey;

    // Model can be overridden via env var GEMINI_MODEL. Keep a working default.
    @Value("${GEMINI_MODEL}")
    private String geminiModel;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public String chat(String message) {
        if (message == null || message.trim().isEmpty()) {
            throw new IllegalArgumentException("message must not be blank.");
        }
        if (geminiApiKey == null || geminiApiKey.trim().isEmpty()) {
            throw new IllegalStateException("Server configuration error: GEMINI_API_KEY is not set.");
        }

        try {
            // Pass API key via header (avoid putting secrets in the URL).
            String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + URLEncoder.encode(geminiModel.trim(), StandardCharsets.UTF_8)
                    + ":generateContent";

            String prompt = SYSTEM_PROMPT + "\n\n사용자: " + message.trim();
            Map<String, Object> part = Map.of("text", prompt);
            Map<String, Object> content = Map.of(
                    "role", "user",
                    "parts", List.of(part)
            );
            Map<String, Object> body = new HashMap<>();
            body.put("contents", List.of(content));

            String json = objectMapper.writeValueAsString(body);

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(30))
                    .header("Content-Type", "application/json")
                    .header("x-goog-api-key", geminiApiKey.trim())
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                // Do not include the full request URL here (it contains the API key).
                String snippet = resp.body();
                if (snippet != null && snippet.length() > 500) {
                    snippet = snippet.substring(0, 500) + "...";
                }
                throw new RuntimeException("Gemini API request failed (status=" + resp.statusCode() + "): " + snippet);
            }

            JsonNode root = objectMapper.readTree(resp.body());
            JsonNode textNode = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
            String answer = textNode.isTextual() ? textNode.asText() : null;
            if (answer == null || answer.trim().isEmpty()) {
                return "No answer generated. Please try again.";
            }
            return answer.trim();
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Chatbot is temporarily unavailable. Please try again.", e);
        }
    }
}
