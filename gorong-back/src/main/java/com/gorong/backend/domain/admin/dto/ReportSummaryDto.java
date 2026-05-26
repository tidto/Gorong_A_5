package com.gorong.backend.domain.admin.dto;

import com.gorong.backend.domain.admin.entity.Report;
import lombok.Builder;
import lombok.Getter;

import java.time.OffsetDateTime;

@Getter
@Builder
public class ReportSummaryDto {
    private Long reportId;
    private Long reporterId;
    private String reporterEmail;
    private Long reportedUserId;
    private String reportedUserEmail;
    private String reason;
    private Report.ReportStatus status;
    private String adminReason;
    private Integer suspensionDays;
    private OffsetDateTime createdAt;
    private OffsetDateTime processedAt;
}
