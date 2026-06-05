package com.gorong.backend.domain.chatbot.service;

import com.gorong.backend.domain.chatbot.dto.ChatActionDto;
import com.gorong.backend.domain.chatbot.dto.ChatRecommendResponseDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatbotHelpService {

    private final GeminiChatService geminiChatService;

    public ChatRecommendResponseDto buildHelpResponse(String message) {
        ChatIntent intent = ChatIntentClassifier.classify(message);
        return buildHelpResponse(message, intent);
    }

    public ChatRecommendResponseDto buildHelpResponse(String message, ChatIntent intent) {
        String topic = resolveTopic(message, intent);
        String baseAnswer = answerForTopic(topic);
        String answer = polishWithGemini(baseAnswer, message, intent);
        return ChatRecommendResponseDto.builder()
                .answer(answer)
                .intent(intent.name())
                .recommendedEvents(List.of())
                .actions(actionsForTopic(topic))
                .build();
    }

    public ChatRecommendResponseDto buildGeneralResponse(String message) {
        String base = """
                고롱 **Go냥이**가 도와드릴 수 있는 일이에요.
                
                - **행사 추천**: "이번 주 갈 만한 행사 추천해줘"
                - **근처 행사**: "내 근처 행사 추천해줘"
                - **그룹 참여**: "그룹 참여 방법 알려줘"
                - **리뷰 작성**: "리뷰 작성 방법"
                - **CatTower**: "CatTower 꾸미는 방법"
                
                궁금한 걸 구체적으로 말씀해 주시면 바로 안내할게요!""";
        String answer = polishWithGemini(base, message, ChatIntent.GENERAL_QUESTION);
        return ChatRecommendResponseDto.builder()
                .answer(answer)
                .intent(ChatIntent.GENERAL_QUESTION.name())
                .recommendedEvents(List.of())
                .actions(defaultActions())
                .build();
    }

    public ChatRecommendResponseDto buildNoEventsResponse(String message, ChatIntent intent) {
        String hint = intent == ChatIntent.LOCATION_RECOMMENDATION
                ? "다른 지역(예: 서울, 부산)을 말씀해 주시거나, 행사 메뉴에서 직접 검색해 보세요."
                : "검색어를 바꿔 보시거나(축제, 전시, 주말), 행사 메뉴에서 테마별로 찾아보세요.";
        String answer = """
                조건에 맞는 행사를 DB에서 찾지 못했어요.
                
                **다시 시도 팁**
                - %s
                - 마이페이지에 **주소**를 등록하면 근처 추천이 더 정확해져요.
                
                이용 방법(그룹·리뷰·CatTower)도 물어보시면 안내해 드릴게요!""".formatted(hint);
        return ChatRecommendResponseDto.builder()
                .answer(answer)
                .intent(intent.name())
                .recommendedEvents(List.of())
                .actions(List.of(
                        action("행사 목록", "/events", "events"),
                        action("다른 지역으로 검색", "/events", "events"),
                        action("CatTower", "/cattower", "cattower")
                ))
                .build();
    }

    public ChatRecommendResponseDto buildGeminiFailureHelp() {
        return ChatRecommendResponseDto.builder()
                .answer("""
                        지금은 AI 답변을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
                        
                        그동안 이렇게 이용할 수 있어요.
                        - **행사**: 행사 메뉴·"이번 주 행사 추천해줘"
                        - **그룹**: 그룹 메뉴에서 모집글 참여
                        - **리뷰**: 참여 후 리뷰 메뉴에서 작성
                        - **CatTower**: Go냥이 꾸미기·성장 확인""")
                .intent(ChatIntent.SERVICE_GUIDE.name())
                .recommendedEvents(List.of())
                .actions(defaultActions())
                .build();
    }

    public ChatRecommendResponseDto buildFallbackHelp() {
        return buildGeminiFailureHelp();
    }

    private String polishWithGemini(String baseAnswer, String message, ChatIntent intent) {
        try {
            String prompt = String.join("\n",
                    "너는 고롱(Go냥이) 서비스 도우미입니다.",
                    "intent=" + intent.name(),
                    "아래 '기본 안내' 내용의 사실 관계는 유지하고, 사용자 질문에 맞게 자연스럽게 다듬어 주세요.",
                    "규칙: 한국어, 4~8문장 또는 bullet, 행사 ID·가짜 행사 금지, '회원님의 위치가'는 LOCATION이 아닐 때 금지.",
                    "사용자 질문: " + message,
                    "",
                    "기본 안내:",
                    baseAnswer
            );
            String raw = geminiChatService.generate(prompt, 0.35);
            if (raw != null && !raw.isBlank()) {
                return raw.trim();
            }
        } catch (RuntimeException e) {
            log.warn("[Chatbot] Help Gemini polish failed, using static answer", e);
        }
        return baseAnswer;
    }

    private String resolveTopic(String message, ChatIntent intent) {
        if (intent == ChatIntent.REVIEW_GUIDE) {
            return "review";
        }
        if (intent == ChatIntent.CATTOWER_GUIDE) {
            return "cattower";
        }
        if (intent == ChatIntent.GROUP_GUIDE) {
            return "groups";
        }
        String m = message == null ? "" : message.toLowerCase(Locale.ROOT);
        if (containsAny(m, "행사", "축제", "전시") && containsAny(m, "찾", "검색", "어디", "방법", "이용")) {
            return "events";
        }
        if (containsAny(m, "채팅", "채팅방", "메시지")) {
            return "chat";
        }
        if (containsAny(m, "성장", "레벨", "활동") && containsAny(m, "고냥", "캣", "미니홈")) {
            return "growth";
        }
        if (containsAny(m, "다른", "유저", "친구", "방문", "둘러") && containsAny(m, "캣타워", "cattower", "미니홈")) {
            return "visit";
        }
        return "general";
    }

    private String answerForTopic(String topic) {
        return switch (topic) {
            case "events" -> """
                    **행사 찾는 방법**
                    1. **행사** 메뉴에서 지도·목록으로 둘러보세요.
                    2. 행사 카드를 누르면 장소·기간·설명을 볼 수 있어요.
                    3. 챗봇에 **"이번 주 갈 만한 행사 추천해줘"**라고 하면 DB 행사를 AI가 골라 카드로 보여줘요.
                    4. **"내 근처 행사"**라고 하면 등록 주소·지역 기준으로 Tour API와 DB를 함께 참고해요.""";
            case "groups" -> """
                    **그룹(동행) 참여 방법**
                    1. **그룹** 메뉴에서 모집 중인 글을 찾아요.
                    2. 행사명·만남 장소·인원·조건을 확인한 뒤 **참여 신청**을 눌러요.
                    3. 승인되면 그룹 **채팅방**에서 일정·만남 장소를 조율할 수 있어요.
                    4. 호스트 이름을 누르면 해당 유저 **CatTower**로 이동할 수 있어요.
                    5. 직접 모집하려면 그룹 작성에서 행사·인원·소개를 적어 올리면 돼요.""";
            case "chat" -> """
                    **채팅방 이용 방법**
                    1. 참여한 **그룹 상세** 페이지에서 채팅으로 들어가요.
                    2. 실시간으로 일정·만남 장소·준비물을 조율할 수 있어요.
                    3. 프로필을 누르면 상대 **CatTower**로 이동할 수 있어요.""";
            case "review" -> """
                    **리뷰 작성 방법**
                    1. 행사에 참여한 뒤 **리뷰** 메뉴(`/reviews`) 또는 행사 상세의 리뷰 작성으로 이동해요.
                    2. 별점·짧은 후기·사진을 함께 올리면 다른 회원에게 도움이 돼요.
                    3. 리뷰 활동은 **CatTower 활동 기록**에 쌓이고, **동그란 안경** 아이템 해금(리뷰 3회)에도 반영돼요.""";
            case "cattower" -> """
                    **CatTower / Go냥이 꾸미기**
                    1. **CatTower**(`/cattower`)에서 최초 1회 Go냥이 이름·외형을 만든 뒤 방을 열어요.
                    2. **Go냥이 꾸미기**에서 HEAD·FACE·NECK 슬롯에 아이템을 장착하고 **저장**하면 DB에 반영돼요.
                    3. **기본 지급**: 마녀 모자, 목 리본 — **행사 1회** 파란 모자, **행사 3회** 왕관, **리뷰 3개** 동그란 안경.
                    4. 슬롯을 비운 뒤 저장하면 **벗은 상태**도 새로고침 후 유지돼요.
                    5. `/cattower/{userId}`로 다른 유저 방을 **둘러보기**(읽기 전용)할 수 있어요.""";
            case "growth" -> """
                    **Go냥이 성장 방식**
                    - 행사 참여·리뷰·갤러리 활동이 쌓이면 성장 단계·활동 수가 올라가요.
                    - CatTower **히스토리** 탭에서 활동·갤러리를 확인할 수 있어요.
                    - 꾸미기 아이템은 위 조건 달성 시 `user_item`에 자동 지급돼요.""";
            case "visit" -> """
                    **다른 유저 CatTower 보기**
                    1. 그룹 글·채팅 **프로필**·호스트 이름을 누르면 `/cattower/{userId}`로 이동해요.
                    2. 다른 사람 공간은 **둘러보기 전용**이며, 저장된 장착·배경만 보여요.
                    3. **← 내 CatTower**로 내 공간으로 돌아올 수 있어요.""";
            default -> """
                    **고롱(Go냥이) 서비스 안내**
                    - **행사**: 지도·목록·AI 추천으로 갈 곳을 찾아요.
                    - **그룹**: 같이 갈 사람을 모집·참여해요.
                    - **리뷰**: 행사 후기 남기기.
                    - **CatTower**: Go냥이 꾸미기·성장·방명록.
                    
                    아래처럼 물어보시면 바로 도와드릴게요!
                    이번 주 행사 추천, 근처 행사, 그룹 참여 방법, 리뷰 작성 방법, CatTower 꾸미는 방법""";
        };
    }

    private List<ChatActionDto> actionsForTopic(String topic) {
        return switch (topic) {
            case "events" -> List.of(
                    action("행사 목록", "/events", "events"),
                    action("행사 지도", "/", "map")
            );
            case "groups" -> List.of(
                    action("그룹 목록", "/groups", "groups"),
                    action("그룹 만들기", "/groups", "groups")
            );
            case "chat" -> List.of(action("그룹 목록", "/groups", "groups"));
            case "review" -> List.of(
                    action("리뷰 작성", "/reviews", "review"),
                    action("행사 찾기", "/events", "events")
            );
            case "cattower", "growth" -> List.of(
                    action("내 CatTower", "/cattower", "cattower"),
                    action("Go냥이 꾸미기", "/cattower", "cattower")
            );
            case "visit" -> List.of(
                    action("내 CatTower", "/cattower", "cattower"),
                    action("그룹 둘러보기", "/groups", "groups")
            );
            default -> defaultActions();
        };
    }

    private List<ChatActionDto> defaultActions() {
        return List.of(
                action("행사 찾기", "/events", "events"),
                action("그룹 보기", "/groups", "groups"),
                action("CatTower", "/cattower", "cattower")
        );
    }

    private static ChatActionDto action(String label, String path, String type) {
        return ChatActionDto.builder().label(label).path(path).type(type).build();
    }

    private static boolean containsAny(String text, String... keywords) {
        for (String k : keywords) {
            if (text.contains(k)) {
                return true;
            }
        }
        return false;
    }
}
