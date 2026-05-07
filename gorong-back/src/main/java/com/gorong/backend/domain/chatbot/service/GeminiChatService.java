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

    /**
     * 환경변수로만 주입합니다. (application.yml 수정 금지 요구사항 대응)
     */
    @Value("${GEMINI_API_KEY:}")
    private String geminiApiKey;

    /**
     * 기본값은 무료/대중적으로 접근 가능한 모델로 둡니다.
     * 필요하면 환경변수 GEMINI_MODEL로 오버라이드 가능합니다.
     */
    @Value("${GEMINI_MODEL:gemini-1.5-flash}")
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
            String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + URLEncoder.encode(geminiModel.trim(), StandardCharsets.UTF_8)
                    + ":generateContent?key="
                    + URLEncoder.encode(geminiApiKey.trim(), StandardCharsets.UTF_8);

            Map<String, Object> part = Map.of("text", message);
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
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                throw new RuntimeException("Gemini API 요청 실패 (status=" + resp.statusCode() + ")");
            }

            JsonNode root = objectMapper.readTree(resp.body());
            // candidates[0].content.parts[0].text
            JsonNode textNode = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
            String answer = textNode.isTextual() ? textNode.asText() : null;
            if (answer == null || answer.trim().isEmpty()) {
                return "No answer generated. Please try again.";
            }
            return answer.trim();
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            // API 실패/네트워크 오류 등은 사용자에게 공격적인 표현 대신 친절한 문구로 전달
            throw new RuntimeException("Chatbot is temporarily unavailable. Please try again.");
        }
    }
}

