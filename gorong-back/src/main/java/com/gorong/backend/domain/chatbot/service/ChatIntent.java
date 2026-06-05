package com.gorong.backend.domain.chatbot.service;

public enum ChatIntent {
    GREETING,
    LOCATION_RECOMMENDATION,
    EVENT_RECOMMENDATION,
    GROUP_GUIDE,
    REVIEW_GUIDE,
    CATTOWER_GUIDE,
    SERVICE_GUIDE,
    GENERAL_QUESTION,
    /** @deprecated GENERAL_QUESTION 사용 */
    UNKNOWN
}
