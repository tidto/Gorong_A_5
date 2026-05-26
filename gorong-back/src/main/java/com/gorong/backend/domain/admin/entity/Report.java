package com.gorong.backend.domain.admin.entity;

import com.gorong.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.OffsetDateTime;

@Entity
@Table(name = "reports")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor
public class Report {

    public enum ReportStatus {
        PENDING, REVIEWING, ACTIONED, DISMISSED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "report_id")
    private Long reportId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_user_id", nullable = false)
    private User reportedUser;

    @Column(name = "reason", nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "TEXT")
    @Builder.Default
    private ReportStatus status = ReportStatus.PENDING;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "admin_reason", columnDefinition = "TEXT")
    private String adminReason;

    @Column(name = "suspension_days")
    private Integer suspensionDays;

    @Column(name = "processed_at")
    private OffsetDateTime processedAt;

    public void reviewing() {
        this.status = ReportStatus.REVIEWING;
    }

    public void actioned(String adminReason, Integer suspensionDays) {
        this.status = ReportStatus.ACTIONED;
        this.adminReason = adminReason;
        this.suspensionDays = suspensionDays;
        this.processedAt = OffsetDateTime.now();
    }

    public void dismiss(String adminReason) {
        this.status = ReportStatus.DISMISSED;
        this.adminReason = adminReason;
        this.processedAt = OffsetDateTime.now();
    }
}
