package com.gorong.backend.domain.chatbot.service;

/**
 * Rule-based intent classification for AI chat (no extra LLM call).
 */
public final class ChatIntentClassifier {

    private ChatIntentClassifier() {
    }

    public static ChatIntent classify(String message) {
        if (message == null || message.isBlank()) {
            return ChatIntent.UNKNOWN;
        }
        String m = normalize(message);

        if (matchesServiceGuide(m)) {
            return ChatIntent.SERVICE_GUIDE;
        }
        if (matchesLocationRecommendation(m)) {
            return ChatIntent.LOCATION_RECOMMENDATION;
        }
        if (matchesEventRecommendation(m)) {
            return ChatIntent.EVENT_RECOMMENDATION;
        }
        if (matchesGreeting(m)) {
            return ChatIntent.GREETING;
        }
        return ChatIntent.UNKNOWN;
    }

    private static boolean matchesServiceGuide(String m) {
        if (containsAny(m, "리뷰", "후기") && containsAny(m, "작성", "쓰", "방법", "어떻", "등록", "남기", "올리")) {
            return true;
        }
        if (containsAny(m, "동행", "모임", "그룹") && containsAny(m, "모집", "글", "기능", "설명", "방법", "어떻", "서비스", "이용")) {
            return true;
        }
        return containsAny(
                m,
                "미니홈", "미니 홈", "캣타워", "cattower", "cat tower",
                "고냥이", "미니홈피", "행사 기록", "활동 기록",
                "프로필 수정", "프로필 변경", "마이페이지", "회원가입 방법",
                "로그인 방법", "앱 사용법", "이용 방법", "사용 방법", "기능 설명", "서비스 안내"
        );
    }

    private static boolean matchesLocationRecommendation(String m) {
        return containsAny(m, "주변", "근처", "가까운", "내 주변", "우리 동네", "동네", "집 근처", "근방");
    }

    private static boolean matchesEventRecommendation(String m) {
        return containsAny(
                m,
                "행사", "추천", "전시", "축제", "공연", "데이트", "사진", "맛집", "야경",
                "음악", "체험", "관람", "페스티벌", "핫플", "나들이", "볼거리", "갈만한",
                "여행", "일정", "핑크뮬리", "벚꽃", "단풍", "문화", "박물관", "갤러리"
        );
    }

    private static boolean matchesGreeting(String m) {
        if (m.length() > 40) {
            return false;
        }
        if (matchesEventRecommendation(m) || matchesLocationRecommendation(m) || matchesServiceGuide(m)) {
            return false;
        }
        if (containsAny(m, "안녕", "하이", "헬로", "반가워", "반갑", "뭐해", "뭐하", "잘가", "굿모닝", "hello", "hi")) {
            return true;
        }
        return m.matches("^(안녕|하이|헬로|뭐해|반가워|고마워|감사).*");
    }

    private static String normalize(String message) {
        return message.trim().toLowerCase().replaceAll("\\s+", " ");
    }

    private static boolean containsAny(String text, String... keywords) {
        for (String keyword : keywords) {
            if (text.contains(keyword.toLowerCase())) {
                return true;
            }
        }
        return false;
    }
}
