package com.gorong.backend.domain.chatbot.service;

/**
 * Rule-based intent classification for AI chat (no extra LLM call).
 */
public final class ChatIntentClassifier {

    private ChatIntentClassifier() {
    }

    public static ChatIntent classify(String message) {
        if (message == null || message.isBlank()) {
            return ChatIntent.GENERAL_QUESTION;
        }
        String m = normalize(message);

        if (matchesReviewGuide(m)) {
            return ChatIntent.REVIEW_GUIDE;
        }
        if (matchesCatTowerGuide(m)) {
            return ChatIntent.CATTOWER_GUIDE;
        }
        if (matchesGroupGuide(m)) {
            return ChatIntent.GROUP_GUIDE;
        }
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
        return ChatIntent.GENERAL_QUESTION;
    }

    private static boolean matchesReviewGuide(String m) {
        if (!containsAny(m, "리뷰", "후기")) {
            return false;
        }
        return containsAny(m, "작성", "쓰", "방법", "어떻", "등록", "남기", "올리", "쓰는", "쓰기", "가이드", "안내");
    }

    private static boolean matchesCatTowerGuide(String m) {
        if (containsAny(m, "꾸미", "장착", "해금", "아이템", "모자", "안경", "리본", "왕관", "저장", "벗기")) {
            return true;
        }
        if (containsAny(m, "cattower", "캣타워", "cat tower", "고냥이", "미니홈", "미니 홈")) {
            return containsAny(m, "방법", "어떻", "이용", "사용", "안내", "설명", "꾸미", "만들", "생성", "보기", "방문");
        }
        return containsAny(m, "캣타워 사용", "고냥이 만드", "고냥이 생성");
    }

    private static boolean matchesGroupGuide(String m) {
        if (!containsAny(m, "그룹", "동행", "모임", "같이 갈", "함께")) {
            return false;
        }
        return containsAny(m, "참여", "신청", "가입", "방법", "모집", "글", "어떻", "이용", "안내", "설명", "찾");
    }

    private static boolean matchesServiceGuide(String m) {
        if (containsAny(m, "방법", "어떻", "이용", "사용", "안내", "설명", "뭐야", "무엇", "가이드")) {
            if (containsAny(m, "행사", "채팅", "채팅방", "찾", "검색", "방문", "둘러", "프로필", "마이페이지", "로그인", "회원")) {
                return true;
            }
        }
        if (containsAny(m, "채팅", "채팅방") && containsAny(m, "방법", "이용", "어떻", "사용")) {
            return true;
        }
        if (containsAny(m, "다른", "유저", "친구") && containsAny(m, "캣타워", "cattower", "미니홈", "방문", "보기")) {
            return true;
        }
        if (containsAny(m, "행사", "축제", "전시") && containsAny(m, "찾", "검색", "어디")) {
            return true;
        }
        return containsAny(
                m,
                "행사 기록", "활동 기록", "프로필 수정", "프로필 변경",
                "회원가입 방법", "로그인 방법", "앱 사용법", "이용 방법", "사용 방법",
                "기능 설명", "서비스 안내", "고롱 사용", "서비스 도우미"
        );
    }

    private static boolean matchesLocationRecommendation(String m) {
        if (containsAny(m, "주변", "근처", "가까운", "내 주변", "우리 동네", "동네", "집 근처", "근방", "내 근처", "nearby")) {
            if (!containsAny(m, "방법", "어떻", "이용법", "사용법", "안내")) {
                return true;
            }
        }
        return containsAny(m, "대구", "서울", "부산", "인천", "광주", "대전", "울산", "세종", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주")
                && containsAny(m, "행사", "추천", "갈만", "어디", "관광", "축제", "전시", "볼거리", "나들이")
                && !containsAny(m, "방법", "어떻", "이용법", "사용법");
    }

    private static boolean matchesEventRecommendation(String m) {
        if (containsAny(m, "이번 주", "이번주", "주말", "오늘", "내일", "다음 주")) {
            if (containsAny(m, "행사", "추천", "갈", "어디", "뭐", "볼")) {
                return true;
            }
        }
        if (containsAny(m, "인기", "핫", "갈만", "추천해", "추천 해", "추천해줘", "추천 해줘")) {
            return true;
        }
        return containsAny(
                m,
                "행사 추천", "축제 추천", "전시 추천", "공연 추천",
                "행사", "축제", "전시", "공연", "데이트", "사진", "맛집", "야경",
                "음악", "체험", "관람", "페스티벌", "핫플", "나들이", "볼거리", "갈만한",
                "여행", "핑크뮬리", "벚꽃", "단풍", "문화", "박물관", "갤러리"
        ) && !containsAny(m, "방법", "어떻", "이용", "안내", "설명");
    }

    private static boolean matchesGreeting(String m) {
        if (m.length() > 40) {
            return false;
        }
        if (matchesEventRecommendation(m) || matchesLocationRecommendation(m) || matchesServiceGuide(m)
                || matchesGroupGuide(m) || matchesReviewGuide(m) || matchesCatTowerGuide(m)) {
            return false;
        }
        if (containsAny(m, "안녕", "하이", "헬로", "반가워", "반갑", "뭐해", "뭐하", "굿모닝", "hello", "hi")) {
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
