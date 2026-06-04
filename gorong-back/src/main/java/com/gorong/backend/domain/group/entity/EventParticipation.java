package com.gorong.backend.domain.group.entity;

import com.gorong.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 행사 참여 이력 테이블
 * - 혼자 참여 : groupPost = null, participationType = SOLO
 * - 그룹 참여 : groupPost != null, participationType = GROUP
 */
@Entity
@Table(
        name = "event_participation",
        schema = "gorong_schema",
        uniqueConstraints = {
                // 같은 유저가 동일 행사에 동일 그룹으로 중복 신청 방지
                // (그룹 없이 혼자 참여할 경우 group_id = null 이므로 unique 제약에서 제외됨)
                @UniqueConstraint(
                        name = "uq_user_event_group",
                        columnNames = {"user_id", "event_content_id", "group_id"}
                )
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class EventParticipation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 참여한 유저 */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * 행사 식별자 (TourAPI contentId).
     * Event 엔티티와 FK 없이 문자열로 저장 — 행사가 DB에 없어도 참여 신청 가능하도록.
     */
    @Column(name = "event_content_id", nullable = false)
    private String eventContentId;

    /** 행사 제목 (조인 없이 바로 표시하기 위해 비정규화 저장) */
    @Column(name = "event_title", columnDefinition = "TEXT")
    private String eventTitle;

    /** 동행 그룹 (혼자 참여 시 null) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private GroupPost groupPost;

    /** SOLO(혼자) / GROUP(동행) */
    @Enumerated(EnumType.STRING)
    @Column(name = "participation_type", nullable = false, length = 10)
    private ParticipationType participationType;

    /** 방문 예정일 (혼자: 사용자 선택, 그룹: GroupPost.meetingDate) */
    @Column(name = "visit_date")
    private LocalDate visitDate;

    @CreationTimestamp
    @Column(name = "applied_at", nullable = false, updatable = false)
    private LocalDateTime appliedAt;

    // ── 참여 유형 Enum ─────────────────────────────────────────────────
    public enum ParticipationType {
        SOLO,   // 혼자 참여
        GROUP   // 그룹 동행 참여
    }
}