package com.gorong.backend.domain.chatbot.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GeminiChatService {

    private final ObjectMapper objectMapper;

    @Value("${GEMINI_API_KEY:}")
    private String geminiApiKey;

    // 모델은 비용/가용성 이슈가 있을 수 있어 환경변수로 오버라이드 가능하게 둡니다.
    @Value("${GEMINI_MODEL:gemini-2.0-flash}")
    private String geminiModel;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public String chat(String message) {
        if (message == null || message.trim().isEmpty()) {
            throw new IllegalArgumentException("message는 비어 있을 수 없습니다.");
        }
        if (geminiApiKey == null || geminiApiKey.trim().isEmpty()) {
            throw new IllegalStateException("GEMINI_API_KEY 환경변수가 설정되어 있지 않습니다.");
        }

        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + geminiModel.trim()
                    + ":generateContent";

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
                    .header("x-goog-api-key", geminiApiKey)
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
                return "답변을 생성하지 못했습니다. 잠시 후 다시 시도해주세요.";
            }
            return answer.trim();
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            // 외부 API 실패는 사용자에게 너무 공격적인 메시지 대신 완곡한 문구로 처리
            throw new RuntimeException("현재 챗봇 서버가 응답하지 않습니다. 잠시 후 다시 시도해주세요.");
        }
    }
}

