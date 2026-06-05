package com.gorong.backend.domain.chatbot.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.firebase.auth.FirebaseToken;
import com.gorong.backend.domain.chatbot.dto.ChatActionDto;
import com.gorong.backend.domain.chatbot.dto.ChatRecommendResponseDto;
import com.gorong.backend.domain.event.entity.Event;
import com.gorong.backend.domain.event.repository.EventRepository;
import com.gorong.backend.domain.user.entity.User;
import com.gorong.backend.domain.user.entity.UserProfile;
import com.gorong.backend.domain.user.repository.UserProfileRepository;
import com.gorong.backend.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class EventRecommendationService {

    private static final DateTimeFormatter TOUR_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final GeminiChatService geminiChatService;
    private final ChatbotHelpService chatbotHelpService;
    private final ChatbotEventMapper chatbotEventMapper;
    private final EventRecommendationSelector recommendationSelector;
    private final ChatRecommendationHistoryService recommendationHistory;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ChatRecommendResponseDto recommend(
            String message,
            java.util.List<Long> excludeEventIds,
            Authentication authentication
    ) {
        if (message == null || message.trim().isEmpty()) {
            throw new IllegalArgumentException("message is required.");
        }

        String trimmedMessage = message.trim();
        ChatIntent intent = ChatIntentClassifier.classify(trimmedMessage);
        boolean locationQuery = intent == ChatIntent.LOCATION_RECOMMENDATION;
        UserLocationContext userContext = resolveUserLocation(authentication);
        String userLocation = userContext.location();

        log.info(
                "[AI CHAT] intent={} locationQuery={} loginEmail={} userId={} firebaseUid={} userFound={} userLocation={}",
                intent,
                locationQuery,
                value(userContext.email()),
                userContext.userId() != null ? userContext.userId() : "(none)",
                value(userContext.firebaseUid()),
                userContext.userFound(),
                hasText(userLocation) ? userLocation : "(none)"
        );

        return switch (intent) {
            case GREETING -> respondGreeting(trimmedMessage);
            case REVIEW_GUIDE, CATTOWER_GUIDE, GROUP_GUIDE, SERVICE_GUIDE ->
                    chatbotHelpService.buildHelpResponse(trimmedMessage, intent);
            case GENERAL_QUESTION, UNKNOWN -> chatbotHelpService.buildGeneralResponse(trimmedMessage);
            case LOCATION_RECOMMENDATION, EVENT_RECOMMENDATION ->
                    recommendEvents(trimmedMessage, userLocation, intent, excludeEventIds, userContext.userId());
        };
    }

    /** @deprecated excludeEventIds 없이 호출 — 빈 제외 목록 */
    public ChatRecommendResponseDto recommend(String message, Authentication authentication) {
        return recommend(message, java.util.List.of(), authentication);
    }

    private ChatRecommendResponseDto respondGreeting(String message) {
        String answer = tryGenerateSimpleAnswer(buildGreetingPrompt(message), greetingFallback(message));
        return ChatRecommendResponseDto.builder()
                .answer(sanitizeNoLocationPhrase(answer))
                .intent(ChatIntent.GREETING.name())
                .recommendedEvents(List.of())
                .actions(defaultServiceActions())
                .build();
    }


    private ChatRecommendResponseDto recommendEvents(
            String trimmedMessage,
            String userLocation,
            ChatIntent intent,
            java.util.List<Long> excludeEventIds,
            Long userId
    ) {
        if (intent == ChatIntent.LOCATION_RECOMMENDATION && !hasText(userLocation)) {
            return ChatRecommendResponseDto.builder()
                    .answer(
                            "어느 지역의 행사를 찾고 계신가요? "
                                    + "원하시는 지역(예: 대구, 서울)을 알려주시거나, "
                                    + "마이페이지에서 주소를 등록하시면 주변 행사를 추천해 드릴게요."
                    )
                    .intent(ChatIntent.LOCATION_RECOMMENDATION.name())
                    .recommendedEvents(List.of())
                    .actions(defaultServiceActions())
                    .build();
        }

        Set<Long> exclude = recommendationHistory.resolveExcludeIds(userId, excludeEventIds);
        Set<Long> relaxedExclude = recommendationHistory.strictExcludeOnly(userId, excludeEventIds);

        EventRecommendationSelector.SelectionResult selection = recommendationSelector.select(
                trimmedMessage,
                userLocation,
                intent,
                exclude,
                relaxedExclude,
                userId
        );

        if (selection.matchedCount() == 0) {
            return chatbotHelpService.buildNoEventsResponse(trimmedMessage, intent);
        }

        List<Event> backendPicks = selection.picks();
        if (backendPicks.isEmpty()) {
            return chatbotHelpService.buildNoEventsResponse(trimmedMessage, intent);
        }

        recommendationHistory.recordRecommended(
                userId,
                backendPicks.stream().map(Event::getId).toList()
        );

        List<ChatRecommendResponseDto.RecommendedEventDto> recommended = mapPicksWithReasons(
                backendPicks,
                selection.reasonByEventId(),
                userLocation,
                trimmedMessage,
                intent
        );

        String baseAnswer = buildAnswerPrefix(userLocation, intent, selection, backendPicks.size());
        String polished = tryPolishAnswerOnly(baseAnswer, recommended, userLocation, trimmedMessage, intent);

        return ChatRecommendResponseDto.builder()
                .answer(sanitizeAnswerForIntent(polished, intent))
                .intent(intent.name())
                .recommendedEvents(recommended)
                .actions(eventActions())
                .build();
    }

    private List<ChatRecommendResponseDto.RecommendedEventDto> mapPicksWithReasons(
            List<Event> picks,
            java.util.Map<Long, EventRecommendReason> reasonByEventId,
            String userLocation,
            String message,
            ChatIntent intent
    ) {
        List<ChatRecommendResponseDto.RecommendedEventDto> out = new ArrayList<>();
        for (Event event : picks) {
            EventRecommendReason tag = reasonByEventId != null
                    ? reasonByEventId.get(event.getId())
                    : null;
            out.add(chatbotEventMapper.toRecommended(event, null, tag, userLocation, message, intent));
        }
        return out;
    }

    private String buildAnswerPrefix(
            String userLocation,
            ChatIntent intent,
            EventRecommendationSelector.SelectionResult selection,
            int pickCount
    ) {
        StringBuilder sb = new StringBuilder();
        if (intent == ChatIntent.LOCATION_RECOMMENDATION && hasText(userLocation)) {
            sb.append("회원님의 위치가 ").append(userLocation).append("로 등록되어 있어, 주변 행사 중 추천드릴게요.");
        } else if (selection.mode() == EventRecommendationSelector.QueryMode.THIS_WEEK) {
            sb.append("**이번 주**에 참여할 수 있는 행사를 골라봤어요.");
        } else if (selection.mode() == EventRecommendationSelector.QueryMode.POPULAR) {
            sb.append("**인기** 행사(신청·모집·최근 등록) 기준으로 추천드릴게요.");
        } else {
            sb.append("질문에 맞는 행사를 골라봤어요.");
        }
        if (selection.matchedCount() == 1 && pickCount == 1) {
            sb.append("\n\n현재 조건에 맞는 행사가 **1개뿐**입니다.");
        } else if (pickCount > 0) {
            sb.append(" (총 ").append(pickCount).append("개)");
        }
        return sb.toString();
    }

    public java.util.Optional<Long> resolveUserId(Authentication authentication) {
        UserLocationContext ctx = resolveUserLocation(authentication);
        return ctx.userId() != null ? java.util.Optional.of(ctx.userId()) : java.util.Optional.empty();
    }

    public ChatRecommendResponseDto.RecommendedEventDto toRecommendedDto(
            Event event,
            EventRecommendReason reasonTag,
            String userLocation,
            String message,
            ChatIntent intent
    ) {
        return chatbotEventMapper.toRecommended(event, null, reasonTag, userLocation, message, intent);
    }

    public java.util.Optional<String> resolveUserLocationString(Authentication authentication) {
        UserLocationContext ctx = resolveUserLocation(authentication);
        if (ctx.location() == null || ctx.location().isBlank()) {
            return java.util.Optional.empty();
        }
        return java.util.Optional.of(ctx.location().trim());
    }

    public List<ChatRecommendResponseDto.RecommendedEventDto> mapEventsToRecommendedDtos(
            List<Event> events,
            String userLocation,
            String message,
            ChatIntent intent
    ) {
        return events.stream()
                .map(e -> chatbotEventMapper.toRecommended(e, null, userLocation, message, intent))
                .toList();
    }

    private String tryGenerateSimpleAnswer(String prompt, String fallback) {
        try {
            String raw = geminiChatService.generate(prompt, 0.5);
            return hasText(raw) ? raw.trim() : fallback;
        } catch (RuntimeException e) {
            log.warn("[AI CHAT] Simple Gemini response failed; using fallback", e);
            return fallback;
        }
    }

    private static String greetingFallback(String message) {
        String m = message == null ? "" : message.trim();
        if (m.contains("뭐해") || m.contains("뭐하")) {
            return "저는 Go냥이예요 😊 행사 추천이랑 리뷰·동행 안내를 도와드리고 있어요. 어떤 행사를 찾고 계신가요?";
        }
        return "안녕하세요 😊 어떤 행사를 찾고 계신가요? 사진 찍기 좋은 행사나 주변 행사도 추천해 드릴 수 있어요!";
    }

    private static String serviceGuideFallback(String message) {
        String m = message == null ? "" : message.toLowerCase();
        if (m.contains("리뷰") || m.contains("후기")) {
            return """
                    리뷰는 참여한 행사 후기를 남기는 기능이에요.
                    - 행사 상세 또는 리뷰 메뉴에서 작성할 수 있어요.
                    - 사진과 짧은 후기를 함께 올리면 다른 회원에게 도움이 돼요.
                    - 마이페이지에서 내가 쓴 리뷰를 확인할 수 있어요.""";
        }
        if (m.contains("동행") || m.contains("모임") || m.contains("그룹")) {
            return """
                    동행(그룹)은 같은 행사에 갈 사람을 모집하는 기능이에요.
                    - 그룹 목록에서 모집글을 보거나 직접 작성할 수 있어요.
                    - 행사명·만남 장소·인원·조건을 적어 모집해요.
                    - 채팅으로 일정과 만남 장소를 조율할 수 있어요.""";
        }
        if (m.contains("미니홈") || m.contains("캣타워") || m.contains("고냥이")) {
            return """
                    미니홈·CatTower는 나만의 고냥이 공간이에요.
                    - 미니홈에서 고냥이 꾸미기·성장·활동 기록을 볼 수 있어요.
                    - CatTower에서 캐릭터와 아이템을 꾸밀 수 있어요.
                    - 행사 참여가 쌓이면 성장·갤러리에 반영돼요.""";
        }
        return """
                고롱에서 이런 기능을 쓸 수 있어요.
                - 행사 지도·추천: 주변/테마별 행사 찾기
                - 리뷰: 참여한 행사 후기 작성
                - 동행(그룹): 같이 갈 사람 모집·채팅
                - 미니홈·CatTower: 고냥이 꾸미기·성장
                궁금한 메뉴를 말씀해 주시면 더 자세히 안내할게요.""";
    }

    private String buildGreetingPrompt(String message) {
        return String.join("\n",
                "너는 고롱(Go냥이) AI 도우미입니다.",
                "사용자가 인사·가벼운 대화를 했습니다. 짧고 따뜻하게 한국어로 답하세요.",
                "규칙:",
                "- 1~2문장, 이모지 1개 이하 가능",
                "- 행사 추천·주변·등록 위치·'회원님의 위치가' 문구 금지",
                "- 마지막에 어떤 도움을 줄 수 있는지 한 줄 안내",
                "사용자: " + message
        );
    }

    private String buildServiceGuidePrompt(String message) {
        return String.join("\n",
                "너는 고롱(Go냥이) 앱 안내 도우미입니다.",
                "사용자 질문에 맞춰 앱 기능만 설명하세요. 행사 목록·추천·위치 문구는 넣지 마세요.",
                "설명 가능 기능: 리뷰 작성, 동행(그룹) 모집·채팅, 미니홈, CatTower, 마이페이지·프로필.",
                "규칙:",
                "- 한국어, 3~5개 bullet 또는 짧은 문단",
                "- '회원님의 위치가', '주변 행사 추천' 문구 금지",
                "- DB 행사 ID·가짜 행사 만들지 마세요",
                "사용자 질문: " + message
        );
    }

    private ChatRecommendResponseDto withSanitizedAnswer(ChatRecommendResponseDto parsed, ChatIntent intent) {
        if (parsed == null) {
            return parsed;
        }
        return ChatRecommendResponseDto.builder()
                .answer(sanitizeAnswerForIntent(parsed.getAnswer(), intent))
                .intent(parsed.getIntent() != null ? parsed.getIntent() : intent.name())
                .recommendedEvents(parsed.getRecommendedEvents())
                .actions(parsed.getActions() != null ? parsed.getActions() : eventActions())
                .build();
    }

    private ChatRecommendResponseDto withIntentAndActions(ChatRecommendResponseDto parsed, ChatIntent intent) {
        if (parsed == null) {
            return parsed;
        }
        return ChatRecommendResponseDto.builder()
                .answer(parsed.getAnswer())
                .intent(intent.name())
                .recommendedEvents(parsed.getRecommendedEvents())
                .actions(parsed.getActions() != null ? parsed.getActions() : eventActions())
                .build();
    }

    private static List<ChatActionDto> defaultServiceActions() {
        return List.of(
                ChatActionDto.builder().label("행사 찾기").path("/events").type("events").build(),
                ChatActionDto.builder().label("그룹 보기").path("/groups").type("groups").build(),
                ChatActionDto.builder().label("CatTower").path("/cattower").type("cattower").build()
        );
    }

    private static List<ChatActionDto> eventActions() {
        return List.of(
                ChatActionDto.builder().label("행사 목록").path("/events").type("events").build(),
                ChatActionDto.builder().label("그룹 모집").path("/groups").type("groups").build()
        );
    }

    private String sanitizeAnswerForIntent(String answer, ChatIntent intent) {
        if (intent == ChatIntent.LOCATION_RECOMMENDATION) {
            return answer;
        }
        return sanitizeNoLocationPhrase(answer);
    }

    private static String sanitizeNoLocationPhrase(String answer) {
        if (!hasText(answer)) {
            return answer;
        }
        String result = answer;
        result = result.replaceAll("회원님의 위치가[^.!?\\n]*[.!?]?", "");
        result = result.replaceAll("주변 행사 중 추천[^.!?\\n]*[.!?]?", "");
        result = result.replaceAll("\\s{2,}", " ").trim();
        return hasText(result) ? result : answer;
    }

    private List<Event> loadCandidateEvents(ChatIntent intent, String userLocation, String message) {
        String today = LocalDate.now().format(TOUR_DATE);
        boolean popularQuery = message != null && (message.contains("인기") || message.contains("핫") || message.contains("이번 주")
                || message.contains("주말") || message.contains("갈만"));
        if (popularQuery) {
            List<Event> popular = eventRepository.findTop20ByOrderByCreatedAtDesc();
            if (!popular.isEmpty()) {
                return rankAndLimit(popular, userLocation).stream().limit(20).toList();
            }
        }
        boolean wideSearch = intent == ChatIntent.LOCATION_RECOMMENDATION && hasText(userLocation);
        List<Event> events = wideSearch
                ? eventRepository.findTop100ByEventEndDateGreaterThanEqualOrderByEventStartDateAsc(today)
                : eventRepository.findTop20ByEventEndDateGreaterThanEqualOrderByEventStartDateAsc(today);
        if (!events.isEmpty()) {
            return rankAndLimit(events, userLocation);
        }
        return eventRepository.findTop20ByOrderByCreatedAtDesc();
    }

    private String buildPrompt(
            String message,
            List<Event> events,
            List<Event> backendPicks,
            String userLocation,
            ChatIntent intent
    ) {
        boolean hasLocation = hasText(userLocation);
        boolean locationIntent = intent == ChatIntent.LOCATION_RECOMMENDATION;
        String locationLine = hasLocation ? userLocation : "(없음)";
        String pinnedIds = backendPicks.stream()
                .map(e -> String.valueOf(e.getId()))
                .reduce((a, b) -> a + ", " + b)
                .orElse("없음");

        List<String> lines = new ArrayList<>();
        lines.add("너는 고롱 서비스의 AI 행사 추천 도우미(Go냥이)입니다.");
        lines.add("intent=" + intent);
        lines.add("아래 DB 행사 목록의 eventId만 사용해 추천하세요. 목록에 없는 행사는 절대 만들지 마세요.");
        lines.add("answer에는 각 행사를 왜 추천하는지 1문장씩 이유를 넣고, 마지막에 '상세 보기'·'그룹 모집' 안내 한 줄을 추가하세요.");
        lines.add("");

        if (locationIntent) {
            lines.add("모드: 위치 기반 주변 행사 추천");
            lines.add("사용자 위치: " + locationLine);
            if (hasLocation) {
                lines.add("지역을 다시 묻지 마세요.");
                lines.add("answer 첫 문장은 반드시:");
                lines.add("회원님의 위치가 " + userLocation + "로 등록되어 있어, 주변 행사 중 추천드릴게요.");
                lines.add("우선 추천 후보 eventId: " + pinnedIds);
            }
        } else {
            lines.add("모드: 키워드·테마 기반 행사 추천");
            lines.add("'회원님의 위치가', '주변 행사', 등록 주소 언급 금지.");
            lines.add("사용자 질문의 키워드(사진/전시/축제/데이트/맛집/야경/음악 등)에 맞는 행사를 고르세요.");
            lines.add("우선 추천 후보 eventId: " + pinnedIds);
        }

        lines.add("");
        lines.add("사용자 질문: " + message);
        lines.add("");
        lines.add("규칙:");
        lines.add("- 추천 최대 3개.");
        lines.add("- place/date/reason은 DB 값만 사용.");
        lines.add("- Go냥이 말투, 한국어, 짧고 구체적으로.");
        if (!locationIntent) {
            lines.add("- 위치·주변·등록 주소 문구를 answer에 넣지 마세요.");
        }
        lines.add("");
        lines.add("반환: JSON만 (코드블록 금지).");
        lines.add("{\"answer\":\"...\",\"recommendedEvents\":[{\"eventId\":0,\"title\":\"\",\"place\":\"\",\"date\":\"\",\"reason\":\"\"}]}");
        lines.add("");
        lines.add("DB 행사 목록:");
        lines.add(formatEvents(events));
        return String.join("\n", lines);
    }

    private UserLocationContext resolveUserLocation(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            log.warn("[ChatRecommend] Authentication is missing; cannot resolve user location.");
            return UserLocationContext.empty();
        }
        Object principal = authentication.getPrincipal();
        String firebaseUid = null;
        String email = null;
        if (principal instanceof FirebaseToken firebaseToken) {
            firebaseUid = firebaseToken.getUid();
            email = firebaseToken.getEmail();
        } else if (principal instanceof String value) {
            if (value.contains("@")) {
                email = value;
            } else {
                firebaseUid = value;
            }
        } else {
            log.warn(
                    "[ChatRecommend] Unexpected principal type for location lookup: {}",
                    principal.getClass().getName()
            );
        }
        if (!hasText(email) && authentication.getName() != null && authentication.getName().contains("@")) {
            email = authentication.getName();
        }

        Optional<User> user = hasText(firebaseUid)
                ? userRepository.findByFirebaseUid(firebaseUid)
                : Optional.empty();
        if (user.isEmpty() && hasText(email)) {
            user = userRepository.findByEmail(email);
        }

        if (user.isEmpty()) {
            log.warn(
                    "[ChatRecommend] User not found for firebaseUid={} loginEmail={}",
                    firebaseUid,
                    email
            );
            return new UserLocationContext(firebaseUid, email, null, false, null);
        }

        Long userId = user.get().getId();
        String location = userProfileRepository.findByUserId(userId)
                .map(UserProfile::getBaseAddress)
                .filter(EventRecommendationService::hasText)
                .map(String::trim)
                .orElse(null);
        log.info(
                "[AI CHAT] resolveUserLocation loginEmail={} userId={} firebaseUid={} userLocation={}",
                value(email),
                userId,
                value(firebaseUid),
                hasText(location) ? location : "(none)"
        );
        return new UserLocationContext(firebaseUid, email, userId, true, location);
    }

    private List<Event> rankAndLimit(List<Event> events, String userLocation) {
        if (!hasText(userLocation)) {
            return events.stream().limit(20).toList();
        }
        List<String> tokens = locationTokens(userLocation);
        return events.stream()
                .sorted(Comparator.comparingInt((Event e) -> locationScore(e, tokens)).reversed()
                        .thenComparing(e -> value(e.getEventStartDate())))
                .limit(20)
                .toList();
    }

    private static int locationScore(Event event, List<String> tokens) {
        String haystack = (value(event.getAddr()) + " " + value(event.getTitle()) + " "
                + value(event.getAreaCode()) + " " + value(event.getSigunguCode())).toLowerCase();
        int score = 0;
        for (String token : tokens) {
            if (haystack.contains(token.toLowerCase())) {
                score += token.length() >= 2 ? 2 : 1;
            }
        }
        return score;
    }

    private static List<String> locationTokens(String userLocation) {
        if (!hasText(userLocation)) {
            return List.of();
        }
        String normalized = userLocation
                .replaceAll("[(),]", " ")
                .replaceAll("\\s+", " ")
                .trim();
        List<String> tokens = new ArrayList<>();
        for (String part : normalized.split(" ")) {
            if (part.length() >= 2 && !tokens.contains(part)) {
                tokens.add(part);
            }
        }
        return tokens;
    }

    private String formatEvents(List<Event> events) {
        StringBuilder sb = new StringBuilder();
        for (Event e : events) {
            sb.append("- eventId: ").append(e.getId()).append('\n');
            sb.append("  title: ").append(value(e.getTitle())).append('\n');
            sb.append("  category: ").append(value(e.getTourCategoryCode())).append('\n');
            sb.append("  region: ").append(formatRegion(e)).append('\n');
            sb.append("  address: ").append(value(e.getAddr())).append('\n');
            sb.append("  place: ").append(value(e.getAddr())).append('\n');
            sb.append("  startDate: ").append(value(e.getEventStartDate())).append('\n');
            sb.append("  endDate: ").append(value(e.getEventEndDate())).append('\n');
            sb.append("  description: ").append(value(shorten(e.getDescription(), 280))).append('\n');
            sb.append("  recruitmentStatus: ").append(recruitmentStatus(e)).append("\n\n");
        }
        return sb.toString();
    }

    private static String formatRegion(Event event) {
        String area = value(event.getAreaCode());
        String sigungu = value(event.getSigunguCode());
        if ("-".equals(area) && "-".equals(sigungu)) {
            return "-";
        }
        if ("-".equals(sigungu)) {
            return area;
        }
        if ("-".equals(area)) {
            return sigungu;
        }
        return area + " / " + sigungu;
    }

    private List<Event> pickTopEvents(
            List<Event> events,
            String userLocation,
            ChatIntent intent,
            String message,
            int limit
    ) {
        if (events.isEmpty()) {
            return List.of();
        }
        if (intent == ChatIntent.LOCATION_RECOMMENDATION && hasText(userLocation)) {
            List<String> tokens = locationTokens(userLocation);
            return events.stream()
                    .sorted(Comparator.comparingInt((Event e) -> locationScore(e, tokens)).reversed()
                            .thenComparing(e -> value(e.getEventStartDate())))
                    .limit(limit)
                    .toList();
        }
        if (intent == ChatIntent.EVENT_RECOMMENDATION) {
            return events.stream()
                    .sorted(Comparator.comparingInt((Event e) -> keywordScore(e, message)).reversed()
                            .thenComparing(e -> value(e.getEventStartDate())))
                    .limit(limit)
                    .toList();
        }
        return events.stream().limit(limit).toList();
    }

    private static int keywordScore(Event event, String message) {
        if (!hasText(message)) {
            return 0;
        }
        String m = message.toLowerCase();
        String haystack = (value(event.getTitle()) + " " + value(event.getDescription()) + " "
                + value(event.getTourCategoryCode()) + " " + value(event.getAddr())).toLowerCase();
        int score = 0;
        if (m.contains("사진") || m.contains("야경") || m.contains("인스타")) {
            if (haystack.contains("전시") || haystack.contains("야경") || haystack.contains("축제")
                    || haystack.contains("공원") || haystack.contains("벚꽃")) {
                score += 4;
            }
        }
        if (m.contains("전시") && haystack.contains("전시")) {
            score += 4;
        }
        if (m.contains("축제") && haystack.contains("축제")) {
            score += 4;
        }
        if (m.contains("공연") || m.contains("음악")) {
            if (haystack.contains("공연") || haystack.contains("음악") || haystack.contains("페스티벌")) {
                score += 3;
            }
        }
        if (m.contains("데이트") || m.contains("맛집")) {
            if (haystack.contains("체험") || haystack.contains("문화") || haystack.contains("축제")) {
                score += 2;
            }
        }
        if (m.contains("맛집") && haystack.contains("음식")) {
            score += 3;
        }
        return score;
    }

    private boolean shouldUseBackendFallback(
            ChatRecommendResponseDto parsed,
            ChatIntent intent,
            String userLocation
    ) {
        if (parsed == null) {
            return true;
        }
        String answer = parsed.getAnswer();
        List<ChatRecommendResponseDto.RecommendedEventDto> items = parsed.getRecommendedEvents();
        if (items == null || items.isEmpty()) {
            return true;
        }
        boolean locationIntent = intent == ChatIntent.LOCATION_RECOMMENDATION;
        if (locationIntent && hasText(userLocation) && asksForLocation(answer)) {
            return true;
        }
        if (intent == ChatIntent.EVENT_RECOMMENDATION && containsLocationPhrase(answer)) {
            return true;
        }
        return false;
    }

    private static boolean containsLocationPhrase(String answer) {
        if (!hasText(answer)) {
            return false;
        }
        String normalized = answer.replaceAll("\\s+", "");
        return normalized.contains("회원님의위치가") || normalized.contains("주변행사");
    }

    private ChatRecommendResponseDto backendFallbackWithOptionalPolish(
            List<Event> backendPicks,
            String message,
            String userLocation,
            ChatIntent intent
    ) {
        List<ChatRecommendResponseDto.RecommendedEventDto> recommended = mapEventsToRecommended(
                backendPicks, userLocation, message, intent
        );
        String baseAnswer = buildAnswerPrefix(userLocation, intent);
        String polished = tryPolishAnswerOnly(baseAnswer, recommended, userLocation, message, intent);
        return ChatRecommendResponseDto.builder()
                .answer(sanitizeAnswerForIntent(polished, intent))
                .intent(intent.name())
                .recommendedEvents(recommended)
                .actions(eventActions())
                .build();
    }

    private String tryPolishAnswerOnly(
            String baseAnswer,
            List<ChatRecommendResponseDto.RecommendedEventDto> recommended,
            String userLocation,
            String message,
            ChatIntent intent
    ) {
        if (recommended.isEmpty()) {
            return baseAnswer;
        }
        try {
            StringBuilder eventSummary = new StringBuilder();
            for (int i = 0; i < recommended.size(); i++) {
                ChatRecommendResponseDto.RecommendedEventDto e = recommended.get(i);
                eventSummary.append(i + 1).append(". ").append(e.getTitle())
                        .append(" (").append(e.getPlace()).append(", ").append(e.getDate()).append(")\n");
            }
            List<String> polishLines = new ArrayList<>();
            polishLines.add("고롱 행사 추천 도우미입니다. 아래 행사는 이미 확정되었습니다. eventId를 바꾸거나 새 행사를 만들지 마세요.");
            polishLines.add("JSON만 반환하세요.");
            if (intent == ChatIntent.LOCATION_RECOMMENDATION && hasText(userLocation)) {
                polishLines.add("사용자 위치: " + userLocation);
                polishLines.add("지역을 다시 묻지 마세요.");
                polishLines.add(
                        "첫 문장: \"회원님의 위치가 " + userLocation + "로 등록되어 있어, 주변 행사 중 추천드릴게요.\""
                );
            } else {
                polishLines.add("등록 주소·'회원님의 위치가'·'주변 행사' 문구를 answer에 넣지 마세요.");
            }
            polishLines.add("사용자 질문: " + message);
            polishLines.add("확정 행사:");
            polishLines.add(eventSummary.toString());
            polishLines.add("answer만 2~3문장으로 자연스럽게 다듬으세요.");
            polishLines.add("형식: {\"answer\":\"...\"}");

            String raw = geminiChatService.generateRecommendation(String.join("\n", polishLines));
            JsonNode root = objectMapper.readTree(stripCodeFence(raw.trim()));
            String answer = root.path("answer").asText("");
            if (hasText(answer) && !asksForLocation(answer)) {
                return ensureLocationAnswer(answer, userLocation, intent);
            }
        } catch (Exception e) {
            log.warn("[AI CHAT] Answer polish failed; using backend answer", e);
        }
        return baseAnswer;
    }

    private List<ChatRecommendResponseDto.RecommendedEventDto> mapEventsToRecommended(
            List<Event> events,
            String userLocation,
            String message,
            ChatIntent intent
    ) {
        return mapEventsToRecommendedDtos(events, userLocation, message, intent);
    }

    private static String buildFallbackReason(
            Event event,
            String userLocation,
            String message,
            ChatIntent intent
    ) {
        StringBuilder reason = new StringBuilder();
        if (intent == ChatIntent.LOCATION_RECOMMENDATION && hasText(userLocation)) {
            reason.append("회원님 등록 위치(").append(userLocation).append(")와 장소·지역 정보가 가깝습니다. ");
        }
        if (message != null && message.contains("사진")) {
            reason.append("사진·관람하기 좋은 ").append(value(event.getTourCategoryCode())).append(" 행사입니다.");
        } else if (message != null && (message.contains("혼자") || message.contains("혼행"))) {
            reason.append("혼자 참여하기 부담 적은 ").append(value(event.getTourCategoryCode())).append(" 행사입니다.");
        } else if (message != null && (message.contains("실내") || message.contains("비"))) {
            reason.append("실내·관람형으로 날씨 영향이 적습니다.");
        } else {
            reason.append("DB 기준 진행 가능한 ").append(recruitmentStatus(event)).append(" 행사입니다.");
        }
        return reason.toString().trim();
    }

    private static String buildAnswerPrefix(String userLocation, ChatIntent intent) {
        if (intent == ChatIntent.LOCATION_RECOMMENDATION && hasText(userLocation)) {
            return "회원님의 위치가 " + userLocation + "로 등록되어 있어, 주변 행사 중 추천드릴게요.";
        }
        if (intent == ChatIntent.EVENT_RECOMMENDATION) {
            return "질문에 맞는 행사를 골라봤어요.";
        }
        return "추천 행사를 정리해 드릴게요.";
    }

    private ChatRecommendResponseDto parseGeminiResponse(
            String rawAnswer,
            List<Event> events,
            List<Event> backendPicks,
            String userLocation,
            ChatIntent intent
    ) {
        if (rawAnswer == null || rawAnswer.isBlank()) {
            return backendFallbackWithOptionalPolish(backendPicks, "", userLocation, intent);
        }

        String cleaned = stripCodeFence(rawAnswer.trim());
        try {
            JsonNode root = objectMapper.readTree(cleaned);
            String answer = root.path("answer").asText(rawAnswer.trim());
            answer = ensureLocationAnswer(answer, userLocation, intent);

            List<ChatRecommendResponseDto.RecommendedEventDto> recommended = new ArrayList<>();
            Set<Long> allowedIds = new HashSet<>();
            for (Event event : events) {
                allowedIds.add(event.getId());
            }

            JsonNode items = root.path("recommendedEvents");
            if (items.isArray()) {
                for (JsonNode item : items) {
                    Long eventId = item.path("eventId").canConvertToLong() ? item.path("eventId").asLong() : null;
                    if (eventId == null || !allowedIds.contains(eventId)) {
                        continue;
                    }
                    Event event = findEvent(events, eventId);
                    String reason = nonBlank(item.path("reason").asText(null), "사용자 질문과 가까운 행사입니다.");
                    ChatRecommendResponseDto.RecommendedEventDto base = event != null
                            ? chatbotEventMapper.toRecommended(event, reason, userLocation, "", intent)
                            : ChatRecommendResponseDto.RecommendedEventDto.builder()
                            .eventId(eventId)
                            .title("행사")
                            .place("-")
                            .date("-")
                            .reason(reason)
                            .detailPath("/events/" + eventId)
                            .groupPath("/groups")
                            .mapPath("/events/" + eventId)
                            .build();
                    recommended.add(ChatRecommendResponseDto.RecommendedEventDto.builder()
                            .eventId(eventId)
                            .title(nonBlank(item.path("title").asText(null), base.getTitle()))
                            .place(nonBlank(item.path("place").asText(null), base.getPlace()))
                            .date(nonBlank(item.path("date").asText(null), base.getDate()))
                            .reason(reason)
                            .imageUrl(base.getImageUrl())
                            .category(base.getCategory())
                            .description(base.getDescription())
                            .detailPath(base.getDetailPath())
                            .groupPath(base.getGroupPath())
                            .mapPath(base.getMapPath())
                            .build());
                    if (recommended.size() >= 3) {
                        break;
                    }
                }
            }

            if (recommended.isEmpty() && !backendPicks.isEmpty()) {
                recommended = mapEventsToRecommended(backendPicks, userLocation, "", intent);
            }

            String finalAnswer = nonBlank(answer, buildAnswerPrefix(userLocation, intent));
            return ChatRecommendResponseDto.builder()
                    .answer(sanitizeAnswerForIntent(finalAnswer, intent))
                    .intent(intent.name())
                    .recommendedEvents(recommended)
                    .actions(eventActions())
                    .build();
        } catch (Exception e) {
            log.warn("Failed to parse Gemini recommendation JSON", e);
            return backendFallbackWithOptionalPolish(backendPicks, "", userLocation, intent);
        }
    }

    private static String ensureLocationAnswer(String answer, String userLocation, ChatIntent intent) {
        String safeAnswer = nonBlank(answer, "추천 답변을 생성하지 못했습니다.");
        if (intent != ChatIntent.LOCATION_RECOMMENDATION) {
            return sanitizeNoLocationPhrase(safeAnswer);
        }
        if (!hasText(userLocation)) {
            return safeAnswer;
        }
        if (asksForLocation(safeAnswer)) {
            return buildAnswerPrefix(userLocation, ChatIntent.LOCATION_RECOMMENDATION);
        }
        String requiredPrefix = "회원님의 위치가 " + userLocation + "로 등록되어 있어, 주변 행사 중 추천드릴게요.";
        if (safeAnswer.contains("회원님의 위치가") && safeAnswer.contains(userLocation)) {
            return safeAnswer;
        }
        if (safeAnswer.startsWith("회원님의 위치가")) {
            return requiredPrefix;
        }
        return requiredPrefix + " " + safeAnswer;
    }

    private static boolean asksForLocation(String answer) {
        if (answer == null || answer.isBlank()) {
            return false;
        }
        String normalized = answer.replaceAll("\\s+", "");
        return normalized.contains("어느지역")
                || normalized.contains("지역을알려")
                || normalized.contains("지역을입력")
                || normalized.contains("위치를알려")
                || normalized.contains("위치를입력")
                || normalized.contains("알려주시")
                || normalized.contains("알려주실")
                || normalized.contains("어디서")
                || normalized.contains("어디에")
                || normalized.contains("지역정보")
                || normalized.contains("괜찮으시다면")
                || (normalized.contains("어디") && normalized.contains("찾"));
    }

    private static Event findEvent(List<Event> events, Long eventId) {
        return events.stream().filter(e -> e.getId().equals(eventId)).findFirst().orElse(null);
    }

    private static String recruitmentStatus(Event event) {
        String today = LocalDate.now().format(TOUR_DATE);
        String start = event.getEventStartDate();
        String end = event.getEventEndDate();
        if (end != null && !end.isBlank() && end.compareTo(today) < 0) {
            return "종료";
        }
        if (start != null && !start.isBlank() && start.compareTo(today) > 0) {
            return "예정";
        }
        return "모집/진행중";
    }

    private static String formatDate(Event event) {
        return value(event.getEventStartDate()) + " ~ " + value(event.getEventEndDate());
    }

    private static String stripCodeFence(String value) {
        String result = value;
        if (result.startsWith("```")) {
            int firstNewline = result.indexOf('\n');
            int lastFence = result.lastIndexOf("```");
            if (firstNewline >= 0 && lastFence > firstNewline) {
                result = result.substring(firstNewline + 1, lastFence).trim();
            }
        }
        return result;
    }

    private static String shorten(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength) + "...";
    }

    private static String value(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }

    private static String nonBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private record UserLocationContext(
            String firebaseUid,
            String email,
            Long userId,
            boolean userFound,
            String location
    ) {
        static UserLocationContext empty() {
            return new UserLocationContext(null, null, null, false, null);
        }
    }
}
