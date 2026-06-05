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
            "너는 고롱(Gorong) 앱의 서비스 도우미 'Go냥이'야. 고양이 캐릭터처럼 친근하지만 존댓말을 써.",
            "반드시 한국어로 답해줘.",
            "역할: (1) DB 기반 행사 추천 설명 (2) 근처/이번 주 행사 안내 (3) 그룹 참여·모집 방법 (4) 리뷰 작성 흐름 (5) CatTower 꾸미기·아이템 해금·저장 방법.",
            "앱 메뉴 경로: 행사=/events, 그룹=/groups, 리뷰=/reviews, CatTower=/cattower.",
            "답변 형식: 한 줄 요약 + bullet 3~6개. 필요 시 다음 행동(버튼으로 갈 메뉴)을 명시해줘.",
            "DB에 없는 행사·가짜 URL·이벤트 ID를 만들지 마. 모르는 건 솔직히 말하고 메뉴로 안내해.",
            "부적절한 요청은 정중히 거절하고 안전한 대안을 제시해줘."
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
        return generate(SYSTEM_PROMPT + "\n\n사용자: " + message.trim());
    }

    public String generate(String prompt) {
        return generate(prompt, null);
    }

    /** 행사 추천용: 낮은 temperature로 일관된 JSON/답변 생성 */
    public String generateRecommendation(String prompt) {
        return generate(prompt, 0.2);
    }

    /** 인사·서비스 안내 등 일반 대화용 */
    public String generate(String prompt, double temperature) {
        return generate(prompt, Double.valueOf(temperature));
    }

    private String generate(String prompt, Double temperature) {
        if (prompt == null || prompt.trim().isEmpty()) {
            throw new IllegalArgumentException("prompt must not be blank.");
        }
        if (geminiApiKey == null || geminiApiKey.trim().isEmpty()) {
            throw new IllegalStateException("Server configuration error: GEMINI_API_KEY is not set.");
        }

        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + URLEncoder.encode(geminiModel.trim(), StandardCharsets.UTF_8)
                    + ":generateContent";

            Map<String, Object> part = Map.of("text", prompt.trim());
            Map<String, Object> content = Map.of(
                    "role", "user",
                    "parts", List.of(part)
            );
            Map<String, Object> body = new HashMap<>();
            body.put("contents", List.of(content));
            if (temperature != null) {
                body.put("generationConfig", Map.of(
                        "temperature", temperature,
                        "topP", 0.85,
                        "maxOutputTokens", 2048
                ));
            }

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
