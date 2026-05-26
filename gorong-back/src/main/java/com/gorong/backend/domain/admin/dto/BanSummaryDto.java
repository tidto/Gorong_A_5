package com.gorong.backend.domain.admin.dto;

import com.gorong.backend.domain.admin.entity.UserBan;
import lombok.Builder;
import lombok.Getter;

import java.time.OffsetDateTime;

@Getter
@Builder
public class BanSummaryDto {
    private Long banId;
    private Long userId;
    private String email;
    private String banReason;
    private Integer banDays;
    private UserBan.BanStatus banStatus;
    private UserBan.AppealStatus appealStatus;
    private String appealText;
    private String appealReviewNote;
    private Long reportCount;
    private OffsetDateTime bannedAt;
    private OffsetDateTime banEndsAt;
    private OffsetDateTime permanentDeleteAt;
}
