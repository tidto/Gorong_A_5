package com.gorong.backend.domain.minihome.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.OffsetDateTime;

@Getter
@Builder
public class UserPostHistoryItemDto {

    /** REVIEW | RECRUITMENT (categoryLabel: 리뷰 / 모집 / 참여) */
    private String category;

    private String categoryLabel;

    private Long postId;

    private String title;

    private String summary;

    private OffsetDateTime createdAt;

    /** 프론트 라우트 — 예: /posting/12, /groups/3 */
    private String linkPath;
}
