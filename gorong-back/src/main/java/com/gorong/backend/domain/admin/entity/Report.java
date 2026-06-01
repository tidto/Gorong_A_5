package com.gorong.backend.domain.admin.entity;

import com.gorong.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.OffsetDateTime;

/**
 * 유저 간 신고 내역을 관리하는 엔티티
 * 신고 접수(PENDING) -> 관리자 검토(REVIEWING) -> 제재 처리(ACTIONED) 또는 반려(DISMISSED)의 흐름을 가집니다.
 */
@Entity
@Table(name = "reports")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor
public class Report {

    // 신고 처리 상태 전이
    public enum ReportStatus {
        PENDING,   // 신고 접수 대기 (초기 상태)
        REVIEWING, // 관리자 검토 중
        ACTIONED,  // 제재 조치 완료 (실제 밴 처리됨)
        DISMISSED  // 허위 신고 등으로 인한 기각/반려
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "report_id")
    private Long reportId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter; // 신고한 유저

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_user_id", nullable = false)
    private User reportedUser; // 신고당한 피의자 유저

    @Column(name = "reason", nullable = false, columnDefinition = "TEXT")
    private String reason; // 신고자가 작성한 신고 사유

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "TEXT")
    @Builder.Default
    private ReportStatus status = ReportStatus.PENDING;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    // --- 관리자 처리 결과 필드 (status가 ACTIONED 또는 DISMISSED일 때 값이 채워짐) ---

    @Column(name = "admin_reason", columnDefinition = "TEXT")
    private String adminReason; // 관리자가 해당 신고를 처리/반려한 상세 사유

    @Column(name = "suspension_days")
    private Integer suspensionDays; // 조치 결과 부여된 정지 일수 (반려 시 null)

    @Column(name = "processed_at")
    private OffsetDateTime processedAt; // 관리자 처리(조치/반려)가 완료된 최종 일시

    // --- 비즈니스 로직 메서드 (상태 전이) ---

    /**
     * 관리자가 신고 내역 확인을 시작함
     */
    public void reviewing() {
        this.status = ReportStatus.REVIEWING;
    }

    /**
     * 관리자가 신고를 유효하다고 판단하여 유저에게 제재를 가함
     */
    public void actioned(String adminReason, Integer suspensionDays) {
        this.status = ReportStatus.ACTIONED;
        this.adminReason = adminReason;
        this.suspensionDays = suspensionDays;
        this.processedAt = OffsetDateTime.now();
    }

    /**
     * 허위 신고 또는 제재 사유 부족으로 신고를 기각(반려)함
     */
    public void dismiss(String adminReason) {
        this.status = ReportStatus.DISMISSED;
        this.adminReason = adminReason;
        this.processedAt = OffsetDateTime.now();
    }
}