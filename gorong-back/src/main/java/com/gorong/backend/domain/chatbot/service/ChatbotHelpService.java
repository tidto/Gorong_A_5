package com.gorong.backend.domain.chatbot.service;

import com.gorong.backend.domain.chatbot.dto.ChatActionDto;
import com.gorong.backend.domain.chatbot.dto.ChatRecommendResponseDto;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class ChatbotHelpService {

    public ChatRecommendResponseDto buildHelpResponse(String message) {
        String topic = resolveTopic(message);
        String answer = answerForTopic(topic);
        return ChatRecommendResponseDto.builder()
                .answer(answer)
                .intent(ChatIntent.SERVICE_GUIDE.name())
                .recommendedEvents(List.of())
                .actions(actionsForTopic(topic))
                .build();
    }

    public ChatRecommendResponseDto buildFallbackHelp() {
        return ChatRecommendResponseDto.builder()
                .answer("""
                        지금은 추천 정보를 불러오지 못했어요. 대신 고롱 이용 방법을 안내해 드릴게요.
                        
                        - **행사 찾기**: 상단 **행사** 메뉴 또는 홈 지도에서 주변·테마별 행사를 볼 수 있어요.
                        - **동행(그룹)**: **그룹** 메뉴에서 모집글을 보거나 직접 모집할 수 있어요.
                        - **채팅**: 그룹 상세에서 채팅방으로 일정·만남 장소를 조율해요.
                        - **리뷰**: 참여한 행사 후 **리뷰** 메뉴에서 후기를 남길 수 있어요.
                        - **CatTower**: **CatTower**에서 Go냥이를 꾸미고 성장·활동 기록을 볼 수 있어요.
                        
                        궁금한 메뉴를 말씀해 주시면 더 자세히 설명할게요!""")
                .intent(ChatIntent.SERVICE_GUIDE.name())
                .recommendedEvents(List.of())
                .actions(defaultActions())
                .build();
    }

    private String resolveTopic(String message) {
        String m = message == null ? "" : message.toLowerCase(Locale.ROOT);
        if (containsAny(m, "행사", "축제", "전시") && containsAny(m, "찾", "검색", "어디", "방법", "이용")) {
            return "events";
        }
        if (containsAny(m, "그룹", "동행", "모임") && containsAny(m, "참여", "신청", "가입", "방법", "모집")) {
            return "groups";
        }
        if (containsAny(m, "채팅", "채팅방", "메시지")) {
            return "chat";
        }
        if (containsAny(m, "리뷰", "후기")) {
            return "review";
        }
        if (containsAny(m, "꾸미", "장착", "아이템", "모자", "안경") || containsAny(m, "cattower", "캣타워", "고냥이")) {
            return "cattower";
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
                    1. 하단 또는 상단 **행사** 메뉴로 이동해요.
                    2. 지도·목록에서 관심 행사를 탭하면 상세 정보(장소·기간·설명)를 볼 수 있어요.
                    3. 챗봇에게 "이번 주 갈만한 행사"처럼 물어보면 DB에 등록된 행사를 추천해 드려요.
                    4. "내 근처 행사"라고 하면 등록 주소·지역(기본: 대구) 기준으로 Tour API·DB를 함께 참고해요.""";
            case "groups" -> """
                    **그룹(동행) 참여 방법**
                    1. **그룹** 메뉴에서 모집 중인 글을 둘러봐요.
                    2. 행사·만남 장소·인원·조건을 확인한 뒤 참여를 신청해요.
                    3. 호스트 이름을 누르면 해당 유저의 **CatTower**로 이동할 수 있어요.
                    4. 모집이 마감되면 "모집완료"로 표시돼요.""";
            case "chat" -> """
                    **채팅방 이용 방법**
                    1. 참여한 그룹 상세 페이지에서 **채팅**으로 들어가요.
                    2. 실시간으로 일정·만남 장소·준비물을 조율할 수 있어요.
                    3. 프로필을 누르면 상대 **CatTower**로 이동할 수 있어요.""";
            case "review" -> """
                    **리뷰 작성 방법**
                    1. 참여한 행사 후 **리뷰** 메뉴 또는 행사 상세에서 리뷰 작성으로 이동해요.
                    2. 짧은 후기와 사진을 함께 올리면 다른 회원에게 도움이 돼요.
                    3. 리뷰 활동은 CatTower 성장·활동 기록에 반영될 수 있어요.""";
            case "cattower" -> """
                    **CatTower / Go냥이 꾸미기**
                    1. **CatTower** 메뉴에서 내 Go냥이 방을 열어요.
                    2. **Go냥이 꾸미기**에서 모자·악세서리를 장착하고 방 배경을 바꿀 수 있어요.
                    3. 행사 참여·리뷰·갤러리 활동이 쌓이면 성장 단계가 올라가요.
                    4. `/cattower`는 내 공간, `/cattower/{userId}`는 다른 유저 공간(읽기 전용)이에요.""";
            case "growth" -> """
                    **Go냥이 성장 방식**
                    - 행사 참여, 리뷰 작성, 갤러리·활동 기록이 쌓이면 성장 지표가 올라가요.
                    - CatTower에서 성장 단계·활동 수·갤러리를 확인할 수 있어요.
                    - 꾸미기 아이템은 행사·이벤트 보상으로 얻을 수 있는 경우가 있어요.""";
            case "visit" -> """
                    **다른 유저 CatTower 보기**
                    1. 그룹 글·채팅 프로필·호스트 이름을 누르면 `/cattower/{userId}`로 이동해요.
                    2. 다른 사람 공간은 **둘러보기 전용**이며, 그 유저가 장착한 아이템·배경만 보여요.
                    3. 내 CatTower로 돌아가려면 **내 CatTower** 버튼을 누르세요.""";
            default -> """
                    **고롱(Go냥이) 서비스 안내**
                    - **행사**: 지도·목록·AI 추천으로 갈 곳을 찾아요.
                    - **그룹**: 같이 갈 사람을 모집·참여해요.
                    - **채팅**: 그룹별 실시간 대화.
                    - **리뷰**: 행사 후기 남기기.
                    - **CatTower**: Go냥이 꾸미기·성장·미니홈피.
                    
                    "행사 추천해줘", "대구 근처 행사", "리뷰 쓰는 법"처럼 물어보시면 도와드릴게요!""";
        };
    }

    private List<ChatActionDto> actionsForTopic(String topic) {
        List<ChatActionDto> list = new ArrayList<>(defaultActions());
        return switch (topic) {
            case "events" -> List.of(
                    action("행사 목록", "/events", "events"),
                    action("행사 지도", "/", "map")
            );
            case "groups" -> List.of(action("그룹 목록", "/groups", "groups"));
            case "chat" -> List.of(action("그룹 목록", "/groups", "groups"));
            case "review" -> List.of(action("리뷰 작성", "/review", "review"));
            case "cattower", "growth" -> List.of(action("내 CatTower", "/cattower", "cattower"));
            case "visit" -> List.of(
                    action("내 CatTower", "/cattower", "cattower"),
                    action("그룹 둘러보기", "/groups", "groups")
            );
            default -> list;
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
