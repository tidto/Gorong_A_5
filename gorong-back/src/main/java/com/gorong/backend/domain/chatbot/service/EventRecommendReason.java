package com.gorong.backend.domain.chatbot.service;

/**
 * 카드에 표시할 한 줄 추천 사유.
 */
public enum EventRecommendReason {
    THIS_WEEK("이번 주 참여 가능한 행사예요."),
    POPULAR("신청·모집이 많은 인기 행사예요."),
    RECENT("최근 등록된 행사예요."),
    NEARBY("근처에서 참여할 수 있는 행사예요."),
    KEYWORD("질문과 잘 맞는 행사예요.");

    private final String line;

    EventRecommendReason(String line) {
        this.line = line;
    }

    public String line() {
        return line;
    }
}
